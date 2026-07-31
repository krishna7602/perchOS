"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Store, MessageCircle, Users, ShoppingBag, DollarSign, UtensilsCrossed, Bell } from "lucide-react";
import { listVenues } from "@/features/venues/api";
import { getWsUrl } from "@/features/chat/api";

interface DashboardData {
  venue_count: number;
  active_chat_rooms: number;
  total_online_users: number;
  total_orders: number;
  total_revenue: number;
  total_menu_items: number;
}

const statCards = [
  { key: "venue_count", label: "Venues", icon: Store, format: (v: number) => v.toString() },
  { key: "active_chat_rooms", label: "Active Rooms", icon: MessageCircle, format: (v: number) => v.toString() },
  { key: "total_online_users", label: "Online Users", icon: Users, format: (v: number) => v.toString() },
  { key: "total_orders", label: "Total Orders", icon: ShoppingBag, format: (v: number) => v.toString() },
  { key: "total_revenue", label: "Revenue", icon: DollarSign, format: (v: number) => `₹${v.toFixed(2)}` },
  { key: "total_menu_items", label: "Menu Items", icon: UtensilsCrossed, format: (v: number) => v.toString() },
] as const;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<{id: string, text: string}[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token");
    if (!token) return;

    getDashboard(token)
      .then((d) => {
        setData(d);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    // Connect to WebSocket to listen for order_accepted events
    listVenues(token).then((res) => {
      if (res.venues && res.venues.length > 0) {
        const branchId = String(res.venues[0]._id || res.venues[0].id);
        const ws = new WebSocket(getWsUrl(branchId, token));
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "order_accepted") {
              const text = `Order #${data.order_id.substring(0, 6)} is now being prepared by ${data.chef_name}`;
              const id = Date.now().toString();
              setNotifications(prev => [...prev, { id, text }]);
              
              // Auto dismiss after 10s
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== id));
              }, 10000);
            }
          } catch (e) {}
        };
        
        return () => ws.close();
      }
    });
  }, []);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Overview of your venues and orders
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ key, label, icon: Icon, format }) => (
          <div
            key={key}
            className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: "var(--color-muted)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                    {label}
                  </span>
                </div>
                <p
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
                >
                  {format(data?.[key] ?? 0)}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Real-time Order Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {notifications.map(n => (
          <div key={n.id} className="bg-white border-l-4 border-[var(--color-primary)] shadow-xl rounded-r-xl p-4 pr-12 flex items-start gap-3 w-80 animate-in slide-in-from-right-8 relative">
            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <Bell size={16} />
            </div>
            <p className="text-sm font-medium text-gray-800 leading-snug">{n.text}</p>
            <button 
              onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
