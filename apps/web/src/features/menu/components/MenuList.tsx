"use client";

import { useState } from "react";
import { Leaf, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface MenuItemData {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  variants?: { name: string, price: number }[];
  category: string;
  is_veg: boolean;
  image_url?: string;
  available: boolean;
  is_coming_soon?: boolean;
}

interface MenuListProps {
  items: MenuItemData[];
  isLoading?: boolean;
  onAddToCart: (item: MenuItemData, variant?: { name: string, price: number }) => void;
}

export function MenuList({ items, isLoading, onAddToCart }: MenuListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      (item.description?.toLowerCase() || "").includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  // Group by category
  const categories = filteredItems.reduce<Record<string, MenuItemData[]>>((acc, item) => {
    const cat = item.category || "misc";
    (acc[cat] = acc[cat] || []).push(item);
    return acc;
  }, {});

  const funkyPlaceholders = [
    "Search for a funky flavor... 🕺",
    "Craving something specific? 🌮",
    "Find your delicious bite... 🍕",
    "Looking for a snack or a feast? 🍔"
  ];
  
  // Choose a placeholder (for simplicity using a static one or pseudo-random)
  const placeholder = funkyPlaceholders[0];

  return (
    <div className="space-y-4 p-4">
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm transition duration-150 ease-in-out shadow-sm"
        />
      </div>

      {Object.keys(categories).length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🍽️</p>
          <p style={{ color: "var(--color-muted)" }}>No menu items match your search.</p>
        </div>
      )}

      {Object.entries(categories).map(([category, catItems], index) => {
        const isExpanded = expandedCategories[category] !== undefined ? expandedCategories[category] : false;

        return (
          <div 
            key={category} 
            className="rounded-2xl overflow-hidden transition-all duration-200"
            style={{ 
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <button
              onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !isExpanded }))}
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-semibold capitalize"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
                >
                  {category}
                </h2>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--color-bg)", color: "var(--color-muted)" }}>
                  {catItems.length}
                </span>
              </div>
              <div style={{ color: "var(--color-muted)" }}>
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </button>

            {isExpanded && (
              <div className="p-3 pt-0 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                {catItems.map((item) => (
                  <div
                    key={item._id}
                    className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-200 ${
                      (!item.available || item.is_coming_soon) ? "opacity-60 grayscale-[0.5]" : ""
                    }`}
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-sm text-[10px] border shrink-0"
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
                      <div className="flex flex-col gap-1">
                        {item.variants && item.variants.length > 0 ? (
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            Starts at ₹{Math.min(...item.variants.map(v => v.price)).toFixed(2)}
                          </p>
                        ) : (
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            ₹{item.price?.toFixed(2) || "0.00"}
                          </p>
                        )}
                      </div>
                      
                      {(!item.available || item.is_coming_soon) && (
                        <div className="mt-2">
                          <span className="text-[10px] px-2 py-1 rounded-md font-semibold" style={{ background: "var(--color-surface)", color: "var(--color-danger)", border: "1px solid var(--color-border)" }}>
                            {item.is_coming_soon ? "🕒 Coming Soon" : "🚫 Temporarily Unavailable"}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="shrink-0 flex flex-col gap-2 items-end">
                      {item.variants && item.variants.length > 0 ? (
                        item.variants.map((v, i) => (
                          <button
                            key={i}
                            onClick={() => onAddToCart(item, v)}
                            disabled={!item.available || item.is_coming_soon}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border"
                            style={{
                              borderColor: "var(--color-primary)",
                              color: "var(--color-primary)",
                            }}
                          >
                            <Plus size={14} />
                            {v.name}
                          </button>
                        ))
                      ) : (
                        <button
                          onClick={() => onAddToCart(item)}
                          disabled={!item.available || item.is_coming_soon}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          style={{
                            background: "var(--color-accent)",
                            color: "white",
                          }}
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
