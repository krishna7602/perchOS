"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { createOrder } from "@/lib/api";
import { verifyPayment } from "@/features/orders/api";
import { PaymentMethodPicker } from "@/features/orders/components/PaymentMethodPicker";
import Script from "next/script";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const cart = useCart();
  const [paymentMethod, setPaymentMethod] = useState("dummy_card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0) return;

    const handle = sessionStorage.getItem("perch_handle") || "Guest";

    setIsSubmitting(true);
    setError("");

    const validItems = cart.items.filter((i) => i.menu_item_id);
    
    if (validItems.length === 0) {
      cart.clearCart();
      setError("Your cart contained invalid items and has been cleared. Please add your items again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await createOrder({
        venue_id: cart.venueId,
        customer_handle: handle,
        items: validItems.map((i) => ({
          menu_item_id: i.menu_item_id,
          name: i.name,
          variant_name: i.variant_name,
          price: i.price,
          quantity: i.quantity,
        })),
        payment_method: paymentMethod,
      }) as any;

      const order = result.order;
      const orderId = order._id || order.id; // handle possible _id mapping
      const providerOrderId = result.provider_order_id;
      
      // Save order to local storage for the Orders tab
      const savedOrders = JSON.parse(localStorage.getItem("perch_my_orders") || "[]");
      if (!savedOrders.includes(orderId)) {
        savedOrders.push(orderId);
        localStorage.setItem("perch_my_orders", JSON.stringify(savedOrders));
      }

      if (paymentMethod === "razorpay" && providerOrderId) {
        // Open Razorpay Checkout
        const options = {
          key: result.razorpay_key_id || "rzp_test_YOUR_KEY", 
          amount: cart.total * 100, // in paise
          currency: "INR",
          name: "Perch",
          description: "Order Payment",
          order_id: providerOrderId,
          handler: async function (response: any) {
            try {
              setIsSubmitting(true);
              await verifyPayment(orderId, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
            } catch (err) {
              console.error("Payment verification failed:", err);
            }
            cart.clearCart();
            router.push(`/venue/${cart.venueId}/orders/${orderId}`);
          },
          prefill: {
            name: handle,
          },
          theme: {
            color: "#8B5E3C", // Perch primary color
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
          setError("Payment failed. Please try again.");
          setIsSubmitting(false);
        });
        rzp.open();
      } else {
        cart.clearCart();
        router.push(`/venue/${cart.venueId}/orders/${orderId}`);
      }
    } catch (error) {
      setError("Failed to place order. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-4"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
          </button>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            Checkout
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {cart.items.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-lg font-medium mb-2" style={{ color: "var(--color-text)" }}>
              Your cart is empty
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
              Browse the menu to add items.
            </p>
            <Button variant="primary" onClick={() => router.back()}>
              Back to Menu
            </Button>
          </div>
        ) : (
          <>
            {/* Order items */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Order Summary
                </h2>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {cart.items.map((item, index) => (
                  <div key={`${item.menu_item_id}-${item.variant_name || index}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                        {item.name} {item.variant_name ? <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-1">{item.variant_name}</span> : ""}
                      </p>
                      <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                        ₹{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cart.updateQuantity(item.menu_item_id, item.variant_name, item.quantity - 1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => cart.updateQuantity(item.menu_item_id, item.variant_name, item.quantity + 1)}
                        className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--color-primary)", color: "white" }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right" style={{ color: "var(--color-primary)" }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                    <button
                      onClick={() => cart.removeItem(item.menu_item_id, item.variant_name)}
                      className="p-1 rounded hover:bg-red-50 cursor-pointer"
                    >
                      <X size={12} style={{ color: "var(--color-danger)" }} />
                    </button>
                  </div>
                ))}
              </div>
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-bg)" }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>Total</span>
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
                >
                  ₹{cart.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--color-surface)",
                boxShadow: "var(--shadow-sm)",
                border: "1px solid var(--color-border)",
              }}
            >
              <PaymentMethodPicker selected={paymentMethod} onChange={setPaymentMethod} />
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(185, 84, 45, 0.1)", color: "var(--color-danger)" }}
              >
                {error}
              </div>
            )}

            {/* Place order button */}
            <Button
              variant="primary"
              className="w-full text-base py-3"
              onClick={handlePlaceOrder}
              isLoading={isSubmitting}
            >
              {paymentMethod === "cod" ? "Place Order (Pay on Delivery)" : "Pay & Place Order"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
