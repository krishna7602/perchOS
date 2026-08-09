"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, X, Utensils, Truck, DollarSign, MessageSquare, Sparkles, AlertCircle } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";

export interface AppNotification {
  id: string;
  type: "order" | "pickup" | "delivery" | "payment" | "chat" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  table_number?: string;
}

const STORAGE_KEY = "perch_notifications_center_v1";

export function NotificationCenter({ venueId }: { venueId?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "orders" | "system">("all");
  const modalRef = useRef<HTMLDivElement>(null);

  // Load stored notifications on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        // Initial welcome notification
        const welcome: AppNotification = {
          id: "welcome_1",
          type: "system",
          title: "Welcome to PerchOS!",
          message: "You will receive live updates for orders, kitchen preparation, waiter pickups, and team activity right here.",
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications([welcome]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([welcome]));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save to localStorage when notifications update
  const saveNotifications = (items: AppNotification[]) => {
    setNotifications(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50))); // Keep last 50
    } catch (e) {}
  };

  // Function to push a new notification
  const addNotification = (item: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const newNotif: AppNotification = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    saveNotifications([newNotif, ...notifications]);
    playNotificationSound();
  };

  // Event listener for real-time notification events
  useEffect(() => {
    const handleAddEvent = (e: CustomEvent<Omit<AppNotification, "id" | "timestamp" | "read">>) => {
      if (e.detail) {
        addNotification(e.detail);
      }
    };

    const handleSystemOrder = (e: CustomEvent<any>) => {
      const payload = e.detail;
      if (!payload) return;

      let notifType: AppNotification["type"] = "order";
      let title = "Order Update";
      let message = payload.message || "Order status changed";

      if (payload.type === "new_order") {
        title = `New Order #${payload.order_token || 'Placed'}`;
        message = `Table ${payload.table_number || 'N/A'}: ${payload.customer_name || 'Customer'} placed order for ₹${payload.total}`;
      } else if (payload.type === "pickup_ready" || payload.type === "order_ready") {
        title = `Order Ready for Pickup!`;
        message = `Table ${payload.table_number || 'N/A'}: Order #${payload.order_token} is ready in kitchen.`;
      } else if (payload.type === "waiter_pickup_accepted") {
        notifType = "delivery";
        title = `Waiter Pickup Accepted`;
        message = `Waiter ${payload.waiter_name} accepted pickup for Table ${payload.table_number}.`;
      } else if (payload.type === "order_served") {
        notifType = "payment";
        title = `Order Served & Delivered`;
        message = `Order #${payload.order_token} served by Waiter ${payload.waiter_name || 'Staff'}.`;
      }

      addNotification({
        type: notifType,
        title,
        message,
        table_number: payload.table_number,
        link: venueId && payload.order_id ? `/venue/${venueId}/orders/${payload.order_id}` : undefined,
      });
    };

    window.addEventListener("perch_notification_add" as any, handleAddEvent as any);
    window.addEventListener("system_order" as any, handleSystemOrder as any);

    return () => {
      window.removeEventListener("perch_notification_add" as any, handleAddEvent as any);
      window.removeEventListener("system_order" as any, handleSystemOrder as any);
    };
  }, [notifications, venueId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    saveNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const markReadAndNavigate = (n: AppNotification) => {
    saveNotifications(notifications.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    setIsOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "orders") return ["order", "pickup", "delivery", "payment"].includes(n.type);
    if (activeFilter === "system") return ["system", "chat"].includes(n.type);
    return true;
  });

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "order":
        return <Utensils className="w-4 h-4 text-amber-700" />;
      case "pickup":
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case "delivery":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "payment":
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case "chat":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-800" />;
    }
  };

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 transition-all cursor-pointer shrink-0 border border-stone-200"
        title="Notification Center"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Responsive Modal Sheet Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

          <div
            ref={modalRef}
            className="relative w-full sm:w-[420px] max-h-[85vh] sm:max-h-[620px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-stone-200 z-10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
          >
            {/* Mobile Drag Handle Bar */}
            <div className="sm:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 shrink-0" />

            {/* Modal Header */}
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold tracking-tight">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-amber-500 text-stone-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-stone-300 hover:text-amber-400 cursor-pointer flex items-center gap-1 bg-stone-800 px-2.5 py-1 rounded-lg"
                    title="Mark all as read"
                  >
                    <Check size={14} /> Read all
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs font-semibold text-stone-400 hover:text-red-400 cursor-pointer flex items-center gap-1 p-1"
                    title="Clear all notifications"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:bg-stone-800 text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 p-3 bg-stone-50 border-b border-stone-200 text-xs font-semibold shrink-0">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeFilter === "all" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveFilter("orders")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeFilter === "orders" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveFilter("system")}
                className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeFilter === "system" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
                }`}
              >
                Activity
              </button>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 p-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center text-stone-400 text-xs space-y-2">
                  <Sparkles className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="font-bold text-stone-700 text-sm">No Notifications</p>
                  <p className="text-xs text-stone-500">You are all caught up!</p>
                </div>
              ) : (
                filteredNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markReadAndNavigate(n)}
                    className={`p-4 flex items-start gap-3 transition-colors cursor-pointer rounded-xl hover:bg-amber-50/70 ${
                      !n.read ? "bg-amber-50/40 font-medium" : "bg-white text-stone-600"
                    }`}
                  >
                    <div className="p-2.5 rounded-2xl bg-stone-100 shrink-0 mt-0.5 border border-stone-200">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-xs sm:text-sm font-bold truncate ${!n.read ? "text-stone-900" : "text-stone-700"}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0 animate-pulse" />}
                      </div>
                      <p className="text-xs text-stone-600 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-1.5">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
