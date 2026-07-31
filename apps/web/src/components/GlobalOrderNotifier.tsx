"use client";

import { useEffect, useState, useRef } from "react";
import { X, Check, UtensilsCrossed } from "lucide-react";
import { getWsUrl } from "@/lib/api";
import { updateOrderStatus, acceptOrder, rejectOrder } from "@/features/orders/api";

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

interface OrderPayload {
  order_id: string;
  order_token: string;
  total: number;
  venue_name: string;
}

export function GlobalOrderNotifier({ token, venueId }: { token: string; venueId: string }) {
  const [popupOrder, setPopupOrder] = useState<OrderPayload | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
          if (data.type === "system_order" && data.payload) {
            setPopupOrder(data.payload);
            playNotificationSound();
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        // Reconnect after 5s
        setTimeout(connectWs, 5000);
      };
    };
    connectWs();

    // 2. Service Worker for Push Notifications
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/service-worker.js").then(async (registration) => {
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const vapidRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/push/vapid-public-key");
          const vapidData = await vapidRes.json();
          const convertedVapidKey = urlBase64ToUint8Array(vapidData.publicKey);

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }
        
        // Send subscription to backend
        await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(subscription),
        });
      }).catch(err => console.error("Service Worker registration failed:", err));

      // Listen for messages from Service Worker (e.g., user clicked Accept in background)
      const handleSwMessage = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'order_action') {
          try {
            if (event.data.action === 'accept') {
              await acceptOrder(event.data.order_id, token);
            } else if (event.data.action === 'reject') {
              await rejectOrder(event.data.order_id, token);
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
      await acceptOrder(popupOrder.order_id, token);
      setPopupOrder(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!popupOrder) return;
    try {
      await rejectOrder(popupOrder.order_id, token);
      setPopupOrder(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (!popupOrder) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-white border border-[var(--color-primary)] shadow-2xl rounded-2xl p-5 flex flex-col gap-3 min-w-[320px] animate-in fade-in slide-in-from-top-5">
      <div className="flex items-start gap-3">
        <div className="bg-[rgba(139,94,60,.1)] p-3 rounded-full text-[var(--color-primary)]">
          <UtensilsCrossed size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-black text-gray-900 mb-0.5">New Order: {popupOrder.order_token}</h4>
          <p className="text-sm font-semibold text-gray-600 truncate">Total: ₹{popupOrder.total}</p>
        </div>
        <button 
          onClick={() => setPopupOrder(null)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
         <button onClick={handleReject} className="py-2.5 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
            <X size={16}/> Reject
         </button>
         <button onClick={handleAccept} className="py-2.5 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2" style={{ background: "var(--color-primary)" }}>
            <Check size={16}/> Accept
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
