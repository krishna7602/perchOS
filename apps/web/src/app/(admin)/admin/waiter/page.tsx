"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listVenueOrders, waiterAcceptPickup, waiterRejectPickup, confirmCashAndServe } from "@/features/orders/api";
import { listVenues } from "@/features/venues/api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArrowLeft, Check, X, RefreshCw, Utensils, DollarSign, BellRing, ShieldCheck } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  variant_name?: string;
}

interface OrderData {
  _id: string;
  order_token?: string;
  customer_handle: string;
  customer_name?: string;
  customer_email?: string;
  table_number?: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  pickup_status?: string;
  assigned_waiter_id?: string;
  assigned_waiter_name?: string;
  created_at: string;
}

export default function WaiterPortalPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("perch_admin_token") || "" : "";
  
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [activeTab, setActiveTab] = useState<"ready" | "my_deliveries">("ready");
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmCashId, setConfirmCashId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/admin/login");
      return;
    }

    listVenues(token).then((res) => {
      setBranches(res.venues || []);
      if (res.venues && res.venues.length > 0) {
        const defaultBranch = String(res.venues[0]._id || res.venues[0].id);
        setSelectedBranch(defaultBranch);
        fetchOrders(defaultBranch);
      } else {
        setIsLoading(false);
      }
    });
  }, [token]);

  const fetchOrders = useCallback(async (branchId: string) => {
    if (!token || !branchId) return;
    try {
      const data = await listVenueOrders(branchId, token);
      setOrders(data.orders as unknown as OrderData[]);
    } catch (e) {
      console.error("Failed to fetch venue orders:", e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!selectedBranch) return;
    const interval = setInterval(() => fetchOrders(selectedBranch), 3000);
    return () => clearInterval(interval);
  }, [selectedBranch, fetchOrders]);

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = e.target.value;
    setSelectedBranch(bId);
    setIsLoading(true);
    fetchOrders(bId);
  };

  const handleAccept = async (orderId: string) => {
    setSubmittingId(orderId);
    try {
      await waiterAcceptPickup(orderId, token);
      await fetchOrders(selectedBranch);
      setActiveTab("my_deliveries");
    } catch (err: any) {
      if (err?.status === 409 || err?.detail?.includes("already accepted")) {
        alert("This order pickup was already accepted by another waiter.");
      } else {
        alert("Failed to accept pickup request. Please try again.");
      }
      fetchOrders(selectedBranch);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setSubmittingId(orderId);
    try {
      await waiterRejectPickup(orderId, token);
      await fetchOrders(selectedBranch);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmCashAndServe = async (orderId: string) => {
    setSubmittingId(orderId);
    try {
      await confirmCashAndServe(orderId, token);
      setConfirmCashId(null);
      await fetchOrders(selectedBranch);
    } catch (err) {
      alert("Failed to confirm payment and serve order.");
    } finally {
      setSubmittingId(null);
    }
  };

  // Filter orders
  const readyOrders = orders.filter((o) => o.order_status === "ready" && o.pickup_status !== "completed");
  const myDeliveries = orders.filter((o) => o.order_status === "ready" && o.pickup_status === "accepted");

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: "var(--color-bg)" }}>
      {/* Header Bar */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="p-2 rounded-xl hover:bg-stone-100 cursor-pointer"
            >
              <ArrowLeft size={18} className="text-stone-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-800" />
                <h1 className="text-xl font-bold tracking-tight text-stone-900" style={{ fontFamily: "var(--font-heading)" }}>
                  Waiter Operations Portal
                </h1>
              </div>
              <p className="text-xs text-stone-500">Live Delivery & Pickup Dispatch Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={handleBranchChange}
                className="px-3.5 py-2 border rounded-xl text-xs font-semibold bg-stone-50 border-stone-300 text-stone-800 outline-none cursor-pointer flex-1 sm:flex-none"
              >
                {branches.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="secondary" className="px-3 py-2 text-xs" onClick={() => fetchOrders(selectedBranch)}>
              <RefreshCw size={14} className="mr-1" /> Sync
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 gap-2">
          <button
            onClick={() => setActiveTab("ready")}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "ready"
                ? "border-amber-800 text-amber-900 bg-amber-50/50 rounded-t-xl"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <BellRing size={16} />
            <span>Ready for Pickup</span>
            <span className="ml-1 bg-amber-200 text-amber-950 text-xs px-2 py-0.5 rounded-full font-extrabold">
              {readyOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("my_deliveries")}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "my_deliveries"
                ? "border-amber-800 text-amber-900 bg-amber-50/50 rounded-t-xl"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <ShieldCheck size={16} />
            <span>My Active Deliveries</span>
            <span className="ml-1 bg-emerald-200 text-emerald-950 text-xs px-2 py-0.5 rounded-full font-extrabold">
              {myDeliveries.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Ready for Pickup Requests */}
        {activeTab === "ready" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
              </div>
            ) : readyOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
                <p className="text-4xl mb-2">🍽️</p>
                <h3 className="text-base font-bold text-stone-800">No Orders Waiting for Pickup</h3>
                <p className="text-xs text-stone-500 mt-1">When kitchen chefs mark orders ready, pickup alerts will appear here in real time.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readyOrders.map((order) => {
                  const isCOD = order.payment_method === "cod";
                  const isPaid = order.payment_status === "paid";
                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl p-5 border-2 border-stone-200 shadow-md hover:border-amber-700 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-lg font-black text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl">
                            Table: {order.table_number || "Counter"}
                          </span>
                          <span
                            className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border ${
                              isCOD && !isPaid
                                ? "bg-amber-100 text-amber-950 border-amber-400"
                                : "bg-emerald-100 text-emerald-950 border-emerald-400"
                            }`}
                          >
                            {isCOD ? "💵 COD (Collect Cash)" : "💳 Online Paid"}
                          </span>
                        </div>

                        {/* Customer & Order Token */}
                        <div className="mb-3">
                          <p className="text-xs font-mono font-bold text-stone-500">
                            Order Token: #{order.order_token || order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-sm font-bold text-stone-900 mt-0.5">
                            Customer: {order.customer_name || order.customer_handle}
                            {order.customer_email && <span className="text-xs text-stone-400 font-normal block">{order.customer_email}</span>}
                          </p>
                        </div>

                        {/* Items Summary */}
                        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 mb-4 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-stone-800">
                              <span className="font-semibold">{item.quantity}× {item.name} {item.variant_name ? `(${item.variant_name})` : ""}</span>
                              <span className="font-mono text-stone-600">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-stone-200 pt-1.5 mt-1 flex justify-between text-xs font-black text-stone-900">
                            <span>Total Amount</span>
                            <span className="text-sm text-amber-900">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                        <button
                          onClick={() => handleReject(order._id)}
                          disabled={submittingId === order._id}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X size={14} /> Reject Pickup
                        </button>
                        <button
                          onClick={() => handleAccept(order._id)}
                          disabled={submittingId === order._id}
                          className="py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-amber-800 hover:bg-amber-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Check size={14} /> Accept Pickup
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Active Deliveries */}
        {activeTab === "my_deliveries" && (
          <div className="space-y-4">
            {myDeliveries.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
                <p className="text-4xl mb-2">🚚</p>
                <h3 className="text-base font-bold text-stone-800">No Active Deliveries</h3>
                <p className="text-xs text-stone-500 mt-1">Accept pickup requests from the Ready for Pickup tab to deliver orders to tables.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myDeliveries.map((order) => {
                  const isCOD = order.payment_method === "cod";
                  const isPaid = order.payment_status === "paid";
                  const isConfirmingCash = confirmCashId === order._id;

                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-2xl p-5 border-2 border-emerald-600 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        {/* Table Badge */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-lg font-black text-emerald-950 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl">
                            Table: {order.table_number || "Counter"}
                          </span>
                          <span className="text-xs font-black uppercase px-2.5 py-1 rounded-full bg-emerald-800 text-white shadow-xs">
                            In Delivery
                          </span>
                        </div>

                        <div className="mb-3">
                          <p className="text-xs font-mono font-bold text-stone-500">
                            Order Token: #{order.order_token || order._id.slice(-6).toUpperCase()}
                          </p>
                          <p className="text-sm font-bold text-stone-900 mt-0.5">
                            Customer: {order.customer_name || order.customer_handle}
                          </p>
                        </div>

                        {/* Items */}
                        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 mb-4 space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-stone-800">
                              <span>{item.quantity}× {item.name}</span>
                              <span className="font-mono">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="border-t border-stone-200 pt-1.5 mt-1 flex justify-between text-xs font-black text-stone-900">
                            <span>Amount Due</span>
                            <span className="text-base text-emerald-900 font-mono">₹{order.total.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* COD Cash Warning Box */}
                        {isCOD && !isPaid && (
                          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-amber-700 shrink-0" />
                            <div className="text-xs">
                              <p className="font-bold text-amber-950">Cash Collection Required</p>
                              <p className="text-amber-800">Collect exactly <strong className="font-mono">₹{order.total.toFixed(2)}</strong> cash from customer at Table {order.table_number || 'N/A'}.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Cash Dialog / Action */}
                      <div className="pt-2 border-t border-stone-100">
                        {isCOD && !isPaid ? (
                          !isConfirmingCash ? (
                            <button
                              onClick={() => setConfirmCashId(order._id)}
                              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-amber-700 hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              💵 Confirm Cash Payment & Deliver Order
                            </button>
                          ) : (
                            <div className="bg-stone-100 p-3 rounded-xl space-y-2 border border-stone-300 animate-in fade-in">
                              <p className="text-xs font-bold text-stone-900 text-center">
                                Confirm ₹{order.total.toFixed(2)} Cash Received for Table {order.table_number}?
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setConfirmCashId(null)}
                                  className="flex-1 py-2 text-xs font-bold bg-stone-200 text-stone-700 rounded-lg hover:bg-stone-300 cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleConfirmCashAndServe(order._id)}
                                  disabled={submittingId === order._id}
                                  className="flex-1 py-2 text-xs font-bold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 cursor-pointer shadow-sm"
                                >
                                  {submittingId === order._id ? "Processing..." : "YES, Confirm & Mark Served"}
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => handleConfirmCashAndServe(order._id)}
                            disabled={submittingId === order._id}
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-700 hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <Check size={16} /> Mark Order Delivered & Served
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
