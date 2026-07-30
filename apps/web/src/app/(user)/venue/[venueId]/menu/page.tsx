"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMenuByVenue } from "@/lib/api";
import { MenuList } from "@/features/menu/components/MenuList";
import { CartDrawer } from "@/features/menu/components/CartDrawer";
import { useCart } from "@/hooks/useCart";
import { Loader } from "@/components/ui/Loader";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;
  const [venueName, setVenueName] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const cart = useCart(venueId);

  useEffect(() => {
    if (!venueId) return;
    getMenuByVenue(venueId)
      .then((data) => {
        setVenueName(data.venue_name);
        setItems(data.items);
        setIsLoading(false);
      })
      .catch(() => {
        setError("Failed to load menu.");
        setIsLoading(false);
      });
  }, [venueId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading menu..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🍽️</p>
          <p style={{ color: "var(--color-text)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-bg)" }}>
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
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
            </button>
            <div>
              <h1
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
              >
                {venueName}
              </h1>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                Browse menu & order
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="max-w-2xl mx-auto">
        <MenuList
          items={items as Array<{
            _id: string;
            name: string;
            description?: string;
            price: number;
            category: string;
            is_veg: boolean;
            image_url?: string;
            available: boolean;
          }>}
          onAddToCart={(item: any) =>
            cart.addItem({
              menu_item_id: item._id || item.id,
              name: item.name,
              price: item.price,
              is_veg: item.is_veg,
            })
          }
        />
      </div>

      {/* Floating cart button */}
      {cart.itemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-2xl mx-auto flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 hover:scale-[1.01] cursor-pointer"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-surface)",
              boxShadow: "0 8px 32px rgba(139, 94, 60, 0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span className="text-sm font-medium">
                {cart.itemCount} item{cart.itemCount > 1 ? "s" : ""}
              </span>
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)" }}>
              ₹{cart.total.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      <CartDrawer
        items={cart.items}
        total={cart.total}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={cart.updateQuantity}
        onRemove={cart.removeItem}
        onCheckout={() => {
          setCartOpen(false);
          router.push("/cart");
        }}
      />
    </div>
  );
}
