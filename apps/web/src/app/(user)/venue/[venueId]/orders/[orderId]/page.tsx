"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrder, selfPickupOrder } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_EMOJI } from "@/lib/theme";
import { Loader } from "@/components/ui/Loader";
import { CheckCircle, ArrowLeft, Printer, Receipt, ShieldCheck } from "lucide-react";
import { playNotificationSound } from "@/lib/audio";

export default function OrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const venueId = params.venueId as string;

  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const prevStatus = useRef<string | null>(null);
  const [isPickingUp, setIsPickingUp] = useState(false);

  const profilePhoto = typeof window !== "undefined" ? sessionStorage.getItem("perch_profile_photo") : null;
  const userEmail = typeof window !== "undefined" ? sessionStorage.getItem("perch_email") : null;
  const handle = typeof window !== "undefined" ? sessionStorage.getItem("perch_handle") : null;

  const handleSelfPickup = async () => {
    setIsPickingUp(true);
    try {
      await selfPickupOrder(orderId);
      await fetchOrder();
    } catch (e) {
      alert("Failed to complete self-pickup. Please try again.");
    } finally {
      setIsPickingUp(false);
    }
  };

  const fetchOrder = async () => {
    try {
      const data = await getOrder(orderId);
      
      const newStatus = data.order?.order_status as string;
      if (prevStatus.current && newStatus && prevStatus.current !== newStatus) {
         playNotificationSound();
         if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Order Update", { body: `Your order is now ${newStatus}`, icon: "/favicon.ico" });
         }
      }
      prevStatus.current = newStatus;
      
      setOrder(data.order);
      setIsLoading(false);
    } catch {
      setError("Order not found.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    fetchOrder();
    
    // Fast 2s polling + window event listener for immediate auto-refresh
    const interval = setInterval(fetchOrder, 2000);
    window.addEventListener("order_status_updated", fetchOrder);

    return () => {
      clearInterval(interval);
      window.removeEventListener("order_status_updated", fetchOrder);
    };
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading order details..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">📋</p>
          <p style={{ color: "var(--color-text)" }}>{error}</p>
        </div>
      </div>
    );
  }

  const currentStatus = order.order_status as string;
  const currentIndex = ORDER_STATUSES.indexOf(currentStatus as typeof ORDER_STATUSES[number]);
  const items = (order.items || []) as Array<{ name: string; price: number; quantity: number; variant_name?: string }>;
  const totalAmount = Number(order.total || 0);

  // Calculate 5% GST tax breakdown
  const subtotal = totalAmount / 1.05;
  const totalTax = totalAmount - subtotal;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col print:bg-white print:min-h-0 print:h-auto"
      style={{ background: "var(--color-bg)" }}
    >
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, header, footer, .print-hidden {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .invoice-card {
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            padding: 1.5rem !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div
        className="flex-1 overflow-y-auto px-4 py-6 print:p-0 print:overflow-visible"
        style={{
          WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(var(--bottom-nav-height, 80px) + 1.5rem)",
        }}
      >
        <div className="max-w-lg mx-auto print:max-w-full">
          {/* Back link - hidden in print */}
          <Link
            href={`/venue/${venueId}/orders`}
            className="inline-flex items-center text-sm mb-6 hover:underline print:hidden"
            style={{ color: "var(--color-muted)" }}
          >
            <ArrowLeft size={16} className="mr-1" /> Back to My Orders
          </Link>

          {/* Web Header — hidden in print */}
          <div className="text-center mb-6 print:hidden">
            <p className="text-5xl mb-3">
              {currentStatus === "served" ? "🎉" : ORDER_STATUS_EMOJI[currentStatus as keyof typeof ORDER_STATUS_EMOJI] || "📋"}
            </p>
            <h1
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
            >
              {currentStatus === "served" ? "Tax Invoice / Bill" : "Order Tracker"}
            </h1>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Order {order.order_token as string || `#${((order._id || order.id) as string).slice(-6).toUpperCase()}`}
            </p>
          </div>

          {/* Status Tracker Timeline — hidden in print */}
          <div
            className="rounded-2xl p-6 mb-6 print:hidden"
            style={{
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="space-y-0">
              {ORDER_STATUSES.map((status, index) => {
                const isActive = index <= currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div key={status} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500 ${
                          isCurrent ? "scale-110" : ""
                        }`}
                        style={{
                          background: isActive
                            ? "var(--color-primary)"
                            : "var(--color-bg)",
                          color: isActive ? "white" : "var(--color-muted)",
                          border: isActive ? "none" : "2px solid var(--color-border)",
                        }}
                      >
                        {isActive ? (
                          <CheckCircle size={16} />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>
                      {index < ORDER_STATUSES.length - 1 && (
                        <div
                          className="w-0.5 h-8"
                          style={{
                            background: index < currentIndex
                              ? "var(--color-primary)"
                              : "var(--color-border)",
                          }}
                        />
                      )}
                    </div>

                    <div className="pt-1">
                      <p
                        className={`text-sm font-medium ${isCurrent ? "font-semibold" : ""}`}
                        style={{
                          color: isActive ? "var(--color-text)" : "var(--color-muted)",
                        }}
                      >
                        {ORDER_STATUS_LABELS[status]}
                      </p>
                      {isCurrent && currentStatus !== "served" && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-accent)" }}>
                          In progress...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Self Pickup Button */}
          {currentStatus === "ready" && !(order as any).has_waiters && (
            <div className="mb-6 print:hidden">
              <button
                onClick={handleSelfPickup}
                disabled={isPickingUp}
                className="w-full py-4 rounded-xl font-bold text-white transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none animate-bounce"
                style={{ background: "var(--color-primary)" }}
              >
                <CheckCircle size={18} /> {isPickingUp ? "Completing..." : "I've Picked Up My Order"}
              </button>
            </div>
          )}

          {/* Industry Standard Tax Invoice Card (Visible on Web & Print) */}
          <div
            className="invoice-card rounded-2xl overflow-hidden bg-white text-gray-900 border border-gray-200 shadow-lg"
          >
            {/* Invoice Header */}
            <div className="p-6 border-b border-dashed border-gray-300 text-center bg-stone-50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Receipt className="w-6 h-6 text-amber-800" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-900">TAX INVOICE</span>
              </div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight">
                {(order.cafe_name as string) || "PERCH CAFE"}
              </h2>
              {!!order.venue_name && (
                <p className="text-xs font-medium text-stone-600 mt-0.5">{order.venue_name as string}</p>
              )}
              {!!order.gst_number && (
                <p className="text-[11px] font-mono text-stone-500 mt-1">GSTIN: {order.gst_number as string}</p>
              )}

              {/* Order Token Pill */}
              <div className="mt-3 inline-block bg-amber-900 text-white px-4 py-1.5 rounded-full font-black text-sm tracking-wide shadow-xs">
                ORDER #{order.order_token as string || ((order._id || order.id) as string).slice(-6).toUpperCase()}
              </div>
            </div>

            {/* Meta Details */}
            <div className="p-4 border-b border-stone-200 text-xs grid grid-cols-2 gap-3 bg-white">
              <div>
                <span className="text-gray-400 font-medium block">Date & Time:</span>
                <span className="font-semibold text-gray-800">
                  {new Date(order.created_at as string).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-medium block">Customer:</span>
                <span className="font-semibold text-gray-800 truncate block">
                  {(order.customer_handle as string) || handle || "Valued Customer"}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 font-bold uppercase text-[10px] tracking-wider text-left">
                    <th className="pb-2">ITEM</th>
                    <th className="pb-2 text-center">QTY</th>
                    <th className="pb-2 text-right">RATE</th>
                    <th className="pb-2 text-right">AMOUNT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="text-stone-800">
                      <td className="py-2.5 font-medium pr-2">
                        {item.name}
                        {item.variant_name && (
                          <span className="block text-[10px] text-stone-400 font-normal">
                            ({item.variant_name})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-stone-600">₹{item.price.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold font-mono">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax & Total Calculation */}
              <div className="mt-4 pt-3 border-t border-dashed border-stone-300 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>CGST (2.5%)</span>
                  <span className="font-mono">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>SGST (2.5%)</span>
                  <span className="font-mono">₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-stone-900 pt-2 border-t border-stone-200">
                  <span>GRAND TOTAL</span>
                  <span className="text-base font-mono text-amber-900">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Status Stamp */}
              <div className="mt-5 text-center">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full font-extrabold tracking-wide uppercase shadow-xs ${
                    order.payment_status === "paid" || currentStatus === "served"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : order.payment_status === "pending_cash"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-stone-100 text-stone-800 border border-stone-300"
                  }`}
                >
                  <ShieldCheck size={14} />
                  {order.payment_status === "paid" || currentStatus === "served"
                    ? "✓ Payment Completed"
                    : order.payment_status === "pending_cash"
                    ? `💵 Cash on Delivery (Pay ₹${totalAmount.toFixed(2)})`
                    : "⏳ Payment Pending"}
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 text-center text-[10px] text-stone-400 space-y-0.5">
              <p className="font-medium text-stone-500">Thank you for dining with us!</p>
              <p>Powered by Perch OS — www.perchos.shop</p>
            </div>
          </div>

          {/* Download / Print Invoice Button (Hidden during print) */}
          <div className="mt-8 text-center print:hidden">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer text-white"
              style={{
                background: "var(--color-primary)",
              }}
            >
              <Printer size={16} />
              Print / Download Official Tax Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
