"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, X, Utensils, Truck, DollarSign, MessageSquare, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
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

  // Click outside listener to auto-close drawer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

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
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-white/90 hover:bg-amber-50 border border-amber-900/10 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer text-stone-700"
        title="Notification Center"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Notification Center Panel */}
      {isOpen && (
        <div
          ref={modalRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2"
        >
          {/* Header */}
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold tracking-tight">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-amber-500 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-stone-300 hover:text-amber-400 cursor-pointer flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check size={12} /> Read all
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] font-medium text-stone-400 hover:text-red-400 cursor-pointer flex items-center gap-1 ml-1"
                  title="Clear all notifications"
                >
                  <Trash2 size={12} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-800 text-white cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-2 bg-stone-50 border-b border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeFilter === "all" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("orders")}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeFilter === "orders" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveFilter("system")}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeFilter === "system" ? "bg-amber-950 text-white shadow-xs" : "text-stone-600 hover:bg-stone-200"
              }`}
            >
              Activity
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs space-y-1">
                <Sparkles className="w-8 h-8 mx-auto text-stone-300" />
                <p className="font-semibold text-stone-600">No Notifications</p>
                <p className="text-[11px]">All caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markReadAndNavigate(n)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-amber-50/60 ${
                    !n.read ? "bg-amber-50/40 font-medium" : "bg-white text-stone-600"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-stone-100 shrink-0 mt-0.5 border border-stone-200">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs font-bold truncate ${!n.read ? "text-stone-900" : "text-stone-700"}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-stone-600 leading-snug line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-stone-400 font-mono mt-1">
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
