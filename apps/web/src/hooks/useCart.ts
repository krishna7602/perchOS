"use client";

import { useState, useEffect, useCallback } from "react";

export interface CartItem {
  menu_item_id: string;
  name: string;
  variant_name?: string;
  price: number;
  quantity: number;
  is_veg: boolean;
}

const getCartItemId = (item: { menu_item_id: string; variant_name?: string }) => {
  return item.variant_name ? `${item.menu_item_id}-${item.variant_name}` : item.menu_item_id;
};

const CART_KEY = "perch_cart";

function loadCart(): { venueId: string; items: CartItem[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCart(venueId: string, items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify({ venueId, items }));
}

export function useCart(venueId?: string) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartVenueId, setCartVenueId] = useState<string>("");

  // Load cart on mount
  useEffect(() => {
    const saved = loadCart();
    if (saved) {
      // Only restore if same venue or no venue specified
      if (!venueId || saved.venueId === venueId) {
        setItems(saved.items);
        setCartVenueId(saved.venueId);
      }
    }
    if (venueId) {
      setCartVenueId(venueId);
    }
  }, [venueId]);

  // Persist cart changes
  useEffect(() => {
    if (cartVenueId) {
      saveCart(cartVenueId, items);
    }
  }, [items, cartVenueId]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setItems((prev) => {
        const itemId = getCartItemId(item);
        const existing = prev.find((i) => getCartItemId(i) === itemId);
        if (existing) {
          return prev.map((i) =>
            getCartItemId(i) === itemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((menuItemId: string, variantName?: string) => {
    const idToRemove = getCartItemId({ menu_item_id: menuItemId, variant_name: variantName });
    setItems((prev) => prev.filter((i) => getCartItemId(i) !== idToRemove));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, variantName: string | undefined, quantity: number) => {
    const idToUpdate = getCartItemId({ menu_item_id: menuItemId, variant_name: variantName });
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => getCartItemId(i) !== idToUpdate));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        getCartItemId(i) === idToUpdate ? { ...i, quantity } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_KEY);
    }
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    venueId: cartVenueId,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
}
