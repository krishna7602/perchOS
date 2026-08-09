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
  customer_name?: string;
  customer_email?: string;
  table_number?: string;
  items: { name: string; quantity: number; price: number; variant_name?: string }[];
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
  order_token?: string;
  assigned_waiter_name?: string;
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

  const handleMarkCashCollected = async (orderId: string) => {
    try {
      const { markCashCollected } = await import("@/features/orders/api");
      await markCashCollected(orderId, token);
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, payment_status: "paid" } : o))
      );
    } catch (err) {
      alert("Failed to mark cash as collected.");
    }
  };

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    const currentIdx = ORDER_STATUSES.indexOf(currentStatus as typeof ORDER_STATUSES[number]);
    if (currentIdx >= ORDER_STATUSES.length - 1) return;
    const nextStatus = ORDER_STATUSES[currentIdx + 1];

    try {
      await updateOrderStatus(orderId, nextStatus, token);
      fetchOrders();
    } catch {}
  };

  const ordersByStatus = ORDER_STATUSES.reduce(
    (acc, status) => {
      acc[status] = orders.filter((o) => o.order_status === status);
      return acc;
    },
    {} as Record<string, OrderData[]>
  );

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--color-bg)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/admin/branch/${venueId}`)}
            className="p-2 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <ArrowLeft size={20} style={{ color: "var(--color-muted)" }} />
          </button>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
            >
              Order Operations
            </h1>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Live Kanban Board • Venue #{venueId.slice(-6)}
            </p>
          </div>
        </div>
        <Button variant="secondary" className="px-3 py-1 text-xs" onClick={fetchOrders}>
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ORDER_STATUSES.map((status) => (
            <div key={status} className="flex flex-col">
              {/* Column header */}
              <div
                className="flex items-center justify-between p-3 rounded-t-2xl font-semibold text-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderBottom: "none",
                }}
              >
                <span className="flex items-center gap-2">
                  <span>{ORDER_STATUS_EMOJI[status]}</span>
                  <span style={{ color: "var(--color-text)" }}>{ORDER_STATUS_LABELS[status]}</span>
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                  style={{ background: "rgba(139, 94, 60, 0.1)", color: "var(--color-primary)" }}
                >
                  {ordersByStatus[status].length}
                </span>
              </div>

              {/* Column body */}
              <div
                className="flex-1 p-2 space-y-2 rounded-b-2xl min-h-[400px]"
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
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                          {order.order_token || `#${order._id.slice(-6).toUpperCase()}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            order.payment_status === "paid" || order.order_status === "served"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {order.payment_method} ({order.payment_status === "paid" || order.order_status === "served" ? "Paid" : "Unpaid"})
                        </span>
                      </div>

                      {/* Table Number Pill */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Table: {order.table_number || "Counter"}
                        </span>
                        {order.assigned_waiter_name && (
                          <span className="text-[10px] text-gray-500 font-medium">
                            Waiter: {order.assigned_waiter_name}
                          </span>
                        )}
                      </div>

                      <div className="mb-2">
                        <p className="text-xs font-bold text-stone-800">
                          {order.customer_name || order.customer_handle}
                        </p>
                        {order.customer_email && (
                          <p className="text-[10px] text-stone-400 truncate">{order.customer_email}</p>
                        )}
                      </div>
                      <div className="space-y-0.5 mb-2">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs" style={{ color: "var(--color-text)" }}>
                            {item.quantity}× {item.name} {item.variant_name ? <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded ml-1">{item.variant_name}</span> : ""}
                          </p>
                        ))}
                      </div>

                      {order.payment_method === "cod" && order.payment_status !== "paid" && (
                        <button
                          onClick={() => handleMarkCashCollected(order._id)}
                          className="w-full mb-2 text-xs py-1 px-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer transition-colors"
                        >
                          💵 Cash collected
                        </button>
                      )}

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
