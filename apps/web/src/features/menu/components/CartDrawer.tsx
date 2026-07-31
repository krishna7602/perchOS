"use client";

import { CartItem } from "@/hooks/useCart";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CartDrawerProps {
  items: CartItem[];
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (menuItemId: string, variantName: string | undefined, quantity: number) => void;
  onRemove: (menuItemId: string, variantName?: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  items,
  total,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "var(--color-overlay)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-[60] w-full max-w-md flex flex-col animate-slide-in-right"
        style={{ background: "var(--color-surface)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} style={{ color: "var(--color-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
            >
              Your Cart
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 cursor-pointer">
            <X size={20} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🛒</p>
              <p style={{ color: "var(--color-muted)" }}>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.variant_name ? `${item.menu_item_id}-${item.variant_name}` : item.menu_item_id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-text)" }}
                  >
                    {item.name} {item.variant_name ? <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded ml-1">{item.variant_name}</span> : ""}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-primary)" }}
                  >
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(item.menu_item_id, item.variant_name, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <Minus size={12} />
                  </button>
                  <span
                    className="text-sm font-medium w-6 text-center"
                    style={{ color: "var(--color-text)" }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.menu_item_id, item.variant_name, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    style={{
                      background: "var(--color-primary)",
                      color: "white",
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  onClick={() => onRemove(item.menu_item_id, item.variant_name)}
                  className="p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  <X size={14} style={{ color: "var(--color-danger)" }} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-5 py-4 shrink-0"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>
                Total
              </span>
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
              >
                ₹{total.toFixed(2)}
              </span>
            </div>
            <Button variant="primary" className="w-full" onClick={onCheckout}>
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
