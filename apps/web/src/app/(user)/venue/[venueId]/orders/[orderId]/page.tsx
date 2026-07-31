"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrder } from "@/lib/api";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_EMOJI } from "@/lib/theme";
import { Loader } from "@/components/ui/Loader";
import { CheckCircle, ArrowLeft, Printer } from "lucide-react";

export default function OrderPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const venueId = params.venueId as string;

  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data.order);
      setIsLoading(false);
    } catch {
      setError("Order not found.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 5 seconds for status updates
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading order..." />
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
  const items = order.items as Array<{ name: string; price: number; quantity: number; variant_name?: string }>;

  const handlePrint = () => {
    // Hide standard elements that shouldn't be on the invoice
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    
    window.print();
    
    // Restore
    if (nav) nav.style.display = 'flex';
  };

  return (
    <div className="min-h-screen px-4 py-8 pb-[110px] print:bg-white print:pb-0" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-lg mx-auto animate-fade-in">
        <Link 
          href={`/venue/${venueId}/orders`}
          className="inline-flex items-center text-sm mb-6 hover:underline" 
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft size={16} className="mr-1" /> Back to My Orders
        </Link>
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">
            {currentStatus === "served" ? "🎉" : ORDER_STATUS_EMOJI[currentStatus as keyof typeof ORDER_STATUS_EMOJI] || "📋"}
          </p>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            {currentStatus === "served" ? "Invoice / Receipt" : "Order Tracker"}
          </h1>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
            Order {order.order_token as string || `#${((order._id || order.id) as string).slice(-6).toUpperCase()}`}
          </p>
          <div className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            {!!order.cafe_name && !!order.venue_name && (
              <p>{order.cafe_name as string} ({order.venue_name as string})</p>
            )}
            {!!order.gst_number && (
              <p className="font-mono mt-0.5">GSTIN: {order.gst_number as string}</p>
            )}
          </div>
        </div>

        {/* Status tracker */}
        <div
          className="rounded-2xl p-6 mb-6"
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
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all duration-500 ${
                        isCurrent ? "scale-110" : ""
                      }`}
                      style={{
                        background: isActive
                          ? "var(--color-primary)"
                          : "var(--color-bg)",
                        color: isActive
                          ? "white"
                          : "var(--color-muted)",
                        border: isActive
                          ? "none"
                          : "2px solid var(--color-border)",
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

                  {/* Label */}
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

        {/* Order details */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 py-3 flex justify-between items-center" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Itemized Bill
            </h2>
            <span className="text-xs" style={{ color: "var(--color-muted)" }}>
              {new Date(order.created_at as string).toLocaleString()}
            </span>
          </div>
          <div>
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-3"
                style={{
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <div>
                  <p className="text-sm" style={{ color: "var(--color-text)" }}>
                    {item.name} {item.variant_name ? <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-1">{item.variant_name}</span> : ""}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                    × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>Total</span>
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
            >
              ₹{(order.total as number).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment info */}
        <div className="mt-4 text-center">
          <span
            className={`inline-block text-xs px-3 py-1.5 rounded-full font-medium ${
              order.payment_status === "paid"
                ? "status-ready"
                : order.payment_status === "pending_cash"
                ? "status-preparing"
                : "status-received"
            }`}
          >
            {order.payment_status === "paid"
              ? "✓ Paid"
              : order.payment_status === "pending_cash"
              ? "💵 Pay on Delivery"
              : "⏳ Payment Pending"}
          </span>
        </div>

        {/* Download Invoice Button */}
        <div className="mt-8 text-center print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "white",
              color: "var(--color-primary)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Printer size={16} />
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
