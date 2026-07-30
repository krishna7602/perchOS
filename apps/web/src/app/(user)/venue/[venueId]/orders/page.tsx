"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrder } from "@/lib/api";
import { Loader } from "@/components/ui/Loader";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, ChefHat } from "lucide-react";

export default function MyOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;

  const [orders, setOrders] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const savedOrders = JSON.parse(localStorage.getItem("perch_my_orders") || "[]");
      if (savedOrders.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch all order statuses concurrently
        const orderPromises = savedOrders.map((id: string) => getOrder(id).catch(() => null));
        const results = await Promise.all(orderPromises);
        
        const validOrders = results
          .filter(Boolean)
          .map((res: any) => res.order)
          .filter((o: any) => o.venue_id === venueId); // Only show orders for this venue
          
        // Sort descending by creation date (newest first)
        validOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setOrders(validOrders);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    // Poll every 10 seconds to update statuses
    const intervalId = setInterval(fetchOrders, 10000);
    return () => clearInterval(intervalId);
  }, [venueId]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader label="Loading your orders..." />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-4"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/venue/${venueId}/menu`)}
              className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
            </button>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
              >
                My Orders
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: "var(--color-border)" }}>
              <Clock size={24} style={{ color: "var(--color-muted)" }} />
            </div>
            <h3 className="text-lg font-medium mb-1">No Orders Yet</h3>
            <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
              You haven't placed any orders at this venue.
            </p>
            <Link 
              href={`/venue/${venueId}/menu`}
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {orders.map((order) => {
              const orderId = order._id || order.id;
              
              // Status formatting
              let statusLabel = "Unknown";
              let StatusIcon = Clock;
              let statusColor = "var(--color-muted)";
              let statusBg = "transparent";

              switch (order.status) {
                case "pending":
                  statusLabel = "Waiting to be prepared";
                  StatusIcon = Clock;
                  statusColor = "#eab308";
                  statusBg = "#fef9c3";
                  break;
                case "preparing":
                  statusLabel = "Being prepared";
                  StatusIcon = ChefHat;
                  statusColor = "#3b82f6";
                  statusBg = "#dbeafe";
                  break;
                case "ready":
                  statusLabel = "Ready for pickup!";
                  StatusIcon = CheckCircle2;
                  statusColor = "#22c55e";
                  statusBg = "#dcfce7";
                  break;
                case "completed":
                  statusLabel = "Completed";
                  StatusIcon = CheckCircle2;
                  statusColor = "var(--color-muted)";
                  break;
              }

              return (
                <Link
                  key={orderId}
                  href={`/venue/${venueId}/orders/${orderId}`}
                  className="block p-4 rounded-xl border transition-all hover:scale-[1.01]"
                  style={{ 
                    background: "var(--color-surface)", 
                    borderColor: "var(--color-border)",
                    boxShadow: "var(--shadow-sm)"
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: "var(--color-muted)" }}>
                        Token Number
                      </div>
                      <div className="text-2xl font-black" style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}>
                        {order.token_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs mb-1" style={{ color: "var(--color-muted)" }}>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="font-semibold">
                        ₹{order.total?.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: statusBg, color: statusColor }}
                  >
                    <StatusIcon size={16} />
                    <span className="text-sm font-medium">{statusLabel}</span>
                  </div>
                  
                  <div className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
                    {order.items?.length} items • Click to view details
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
