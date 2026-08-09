"use client";

import { useEffect, useState, useRef } from "react";
import { X, Check, UtensilsCrossed } from "lucide-react";
import { getWsUrl, API_URL } from "@/lib/api";
import { updateOrderStatus, acceptOrder, rejectOrder, assignWaiter, waiterAcceptPickup, waiterRejectPickup } from "@/features/orders/api";

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

const showBrowserNotification = (title: string, body: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
};

interface OrderPayload {
  order_id: string;
  order_token: string;
  table_number?: string;
  customer_name?: string;
  customer_email?: string;
  payment_method?: string;
  total: number;
  amount?: number;
  venue_name?: string;
  type?: string;
}

export function GlobalOrderNotifier({ token, venueId, role }: { token: string; venueId: string; role: string }) {
  const [popupOrder, setPopupOrder] = useState<OrderPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const roleRef = useRef(role);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!token || !venueId) return;

    // 1. WebSocket for real-time in-app popups
    const connectWs = () => {
      const url = getWsUrl(venueId, token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const currentRole = roleRef.current;
          
          if (data.type === "order_accepted" || data.type === "system_order" || data.type === "order_assigned" || data.type === "waiter_pickup_accepted") {
            window.dispatchEvent(new Event("order_status_updated"));
          }

          if (currentRole === "chef") {
            if (data.type === "system_order" && data.payload && data.payload.type === "new_order") {
              setPopupOrder(data.payload);
              playNotificationSound();
              showBrowserNotification("New Order Arrived!", `Order ${data.payload.order_token} at Table ${data.payload.table_number || 'N/A'} for ₹${data.payload.total} (${data.payload.payment_method})`);
            } else if (data.type === "order_assigned") {
              const orderPayload = {
                order_id: data.order_id,
                order_token: data.order_token,
                table_number: data.table_number,
                customer_name: data.customer_name,
                customer_email: data.customer_email,
                payment_method: data.payment_method,
                total: data.total,
                venue_name: data.venue_name || "Venue",
              };
              setPopupOrder(orderPayload);
              playNotificationSound();
              showBrowserNotification("Order Assigned!", `Order ${orderPayload.order_token} at Table ${orderPayload.table_number || 'N/A'} for ₹${orderPayload.total}`);
            }
          } else if (currentRole === "waiter") {
            if (data.type === "system_order" && data.payload && (data.payload.type === "pickup_ready" || data.payload.type === "order_ready")) {
              setPopupOrder(data.payload);
              playNotificationSound();
              showBrowserNotification("Order Ready for Pickup!", `Order ${data.payload.order_token} at Table ${data.payload.table_number || 'N/A'} is ready for pickup.`);
            }
          } else if (currentRole === "manager" || currentRole === "owner") {
            if (data.type === "system_order" && data.payload && data.payload.type === "new_order") {
              playNotificationSound();
              showBrowserNotification("New Order Placed", `Table ${data.payload.table_number || 'N/A'} - ${data.payload.customer_name || 'Customer'} (₹${data.payload.total}, ${data.payload.payment_method})`);
            } else if (data.type === "order_accepted") {
              playNotificationSound();
              showBrowserNotification("Order Accepted", data.message || `${data.order_token} order is taken by ${data.chef_name}`);
            } else if (data.type === "waiter_pickup_accepted") {
              playNotificationSound();
              showBrowserNotification("Pickup Accepted", data.message || `Waiter ${data.waiter_name} accepted pickup for Table ${data.table_number}`);
            }
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setTimeout(connectWs, 5000);
      };
    };
    connectWs();

    // 2. Service Worker for Push Notifications
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/service-worker.js").then(async (registration) => {
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const vapidRes = await fetch(`${API_URL}/api/push/vapid-public-key`);
          const vapidData = await vapidRes.json();
          const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }
        
        await fetch(`${API_URL}/api/push/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(subscription),
        });
      }).catch(err => console.error("Service Worker registration failed:", err));

      const handleSwMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'order_action') {
          try {
            if (event.data.action === 'accept') {
              if (roleRef.current === "waiter") {
                await waiterAcceptPickup(event.data.order_id, token);
              } else {
                await acceptOrder(event.data.order_id, token);
              }
            } else if (event.data.action === 'reject') {
              if (roleRef.current === "waiter") {
                await waiterRejectPickup(event.data.order_id, token);
              } else {
                await rejectOrder(event.data.order_id, token);
              }
            }
          } catch(e) {
            console.error(e);
          }
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      
      return () => {
        if (wsRef.current) wsRef.current.close();
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, venueId]);

  const handleAccept = async () => {
    if (!popupOrder) return;
    try {
      if (roleRef.current === "waiter") {
        await waiterAcceptPickup(popupOrder.order_id, token);
      } else {
        await acceptOrder(popupOrder.order_id, token);
      }
      setPopupOrder(null);
      window.dispatchEvent(new Event("order_status_updated"));
    } catch (e: any) {
      if (e?.status === 409 || e?.detail?.includes("already accepted")) {
        alert("This order pickup has already been accepted by another waiter.");
      } else {
        console.error("Failed to accept order pickup:", e);
      }
      setPopupOrder(null);
      window.dispatchEvent(new Event("order_status_updated"));
    }
  };

  const handleReject = async () => {
    if (!popupOrder) return;
    try {
      if (roleRef.current === "waiter") {
        await waiterRejectPickup(popupOrder.order_id, token);
      } else {
        await rejectOrder(popupOrder.order_id, token);
      }
      setPopupOrder(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (!popupOrder) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-white border-2 border-[var(--color-primary)] shadow-2xl rounded-2xl p-5 flex flex-col gap-3 min-w-[340px] max-w-[420px] animate-in fade-in slide-in-from-top-5">
      <div className="flex items-start gap-3">
        <div className="bg-[rgba(139,94,60,.1)] p-3 rounded-full text-[var(--color-primary)] shrink-0">
          <UtensilsCrossed size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-base font-black text-gray-900 truncate">Order #{popupOrder.order_token}</h4>
            {popupOrder.table_number && (
              <span className="bg-amber-100 text-amber-900 text-xs font-black px-2 py-0.5 rounded-full shrink-0">
                Table: {popupOrder.table_number}
              </span>
            )}
          </div>
          {popupOrder.customer_name && (
            <p className="text-xs font-medium text-gray-700 truncate mt-0.5">
              Customer: {popupOrder.customer_name} {popupOrder.customer_email ? `(${popupOrder.customer_email})` : ""}
            </p>
          )}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mt-1">
            <span>Payment: <strong className="uppercase">{popupOrder.payment_method || "COD"}</strong></span>
            <span className="text-amber-900 font-bold text-sm">₹{popupOrder.total || popupOrder.amount}</span>
          </div>
        </div>
        <button 
          onClick={() => setPopupOrder(null)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
         <button onClick={handleReject} className="py-2.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <X size={16}/> Reject
         </button>
         <button onClick={handleAccept} className="py-2.5 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer" style={{ background: "var(--color-primary)" }}>
            <Check size={16}/> Accept Pickup
         </button>
      </div>
    </div>
  );
}

// Utility to convert Base64URL to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
