"use client";

import { Leaf, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface MenuItemData {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  is_veg: boolean;
  image_url?: string;
  available: boolean;
}

interface MenuListProps {
  items: MenuItemData[];
  isLoading?: boolean;
  onAddToCart: (item: MenuItemData) => void;
}

export function MenuList({ items, isLoading, onAddToCart }: MenuListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Group by category
  const categories = items.reduce<Record<string, MenuItemData[]>>((acc, item) => {
    const cat = item.category || "misc";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

  if (Object.keys(categories).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🍽️</p>
        <p style={{ color: "var(--color-muted)" }}>No menu items available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {Object.entries(categories).map(([category, catItems]) => (
        <div key={category}>
          <h2
            className="text-lg font-semibold mb-3 capitalize"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
          >
            {category}
          </h2>
          <div className="space-y-3">
            {catItems.map((item) => (
              <div
                key={item._id}
                className="flex items-start gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: "var(--color-surface)",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[10px] border"
                      style={{
                        borderColor: item.is_veg ? "#22c55e" : "#ef4444",
                        color: item.is_veg ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {item.is_veg ? <Leaf size={10} /> : "●"}
                    </span>
                    <h3
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--color-text)" }}
                    >
                      {item.name}
                    </h3>
                  </div>
                  {item.description && (
                    <p
                      className="text-xs line-clamp-2 mb-1.5"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {item.description}
                    </p>
                  )}
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    ₹{item.price.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => onAddToCart(item)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:scale-105"
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
