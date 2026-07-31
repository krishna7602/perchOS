"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { listVenueOrders, updateOrderStatus } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_EMOJI } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";

interface OrderData {
  _id: string;
  customer_handle: string;
  items: { name: string; quantity: number; price: number; variant_name?: string }[];
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  order_token?: string;
}

export default function OrdersKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("perch_admin_token") || "" : "";

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listVenueOrders(venueId, token);
      setOrders(data.orders as unknown as OrderData[]);
    } catch {}
    setIsLoading(false);
  }, [venueId, token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    const currentIdx = ORDER_STATUSES.indexOf(currentStatus as typeof ORDER_STATUSES[number]);
    if (currentIdx >= ORDER_STATUSES.length - 1) return;
    const nextStatus = ORDER_STATUSES[currentIdx + 1];

    try {
      await updateOrderStatus(orderId, nextStatus, token);
      fetchOrders();
    } catch {}
  };

  // Group orders by status
  const ordersByStatus = ORDER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = orders.filter((o) => o.order_status === status);
      return acc;
    },
    {} as Record<string, OrderData[]>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/venues")} className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer">
            <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
            Orders
          </h1>
        </div>
        <Button variant="secondary" onClick={fetchOrders}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ORDER_STATUSES.map((status) => (
            <div key={status} className="flex flex-col">
              {/* Column header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
                style={{
                  background: "var(--color-surface)",
                  borderBottom: "2px solid var(--color-primary)",
                }}
              >
                <span>{ORDER_STATUS_EMOJI[status]}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}
                >
                  {ordersByStatus[status].length}
                </span>
              </div>

              {/* Cards */}
              <div
                className="flex-1 space-y-2 p-2 rounded-b-xl min-h-[200px]"
                style={{ background: "rgba(169, 153, 138, 0.05)" }}
              >
                {ordersByStatus[status].length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: "var(--color-muted)" }}>
                    No orders
                  </p>
                ) : (
                  ordersByStatus[status].map((order) => (
                    <div
                      key={order._id}
                      className="rounded-xl p-3 transition-all duration-200 hover:scale-[1.01]"
                      style={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold font-mono px-2 py-1 rounded" style={{ color: "var(--color-primary)", background: "rgba(185, 84, 45, 0.1)" }}>
                          {order.order_token || `#${order._id.slice(-6).toUpperCase()}`}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            order.payment_status === "paid" ? "status-ready" : "status-preparing"
                          }`}
                        >
                          {order.payment_status === "paid" ? "Paid" : "COD"}
                        </span>
                      </div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-primary)" }}>
                        {order.customer_handle}
                      </p>
                      <div className="space-y-0.5 mb-2">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs" style={{ color: "var(--color-text)" }}>
                            {item.quantity}× {item.name} {item.variant_name ? <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded ml-1">{item.variant_name}</span> : ""}
                          </p>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                          ₹{order.total.toFixed(2)}
                        </span>
                        {status !== "served" && (
                          <button
                            onClick={() => handleAdvanceStatus(order._id, status)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg cursor-pointer transition-colors"
                            style={{
                              background: "var(--color-accent)",
                              color: "white",
                            }}
                          >
                            Next <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
