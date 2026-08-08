"use client";

import { useEffect, useState } from "react";
import { CreditCard, Banknote, Lock } from "lucide-react";
import { getPaymentMethods } from "../api";

interface PaymentMethodPickerProps {
  selected: string;
  onChange: (method: string) => void;
  venueId?: string;
}

interface PaymentMethodInfo {
  id: string;
  label: string;
  description: string;
  enabled?: boolean;
}

const DEFAULT_METHODS: PaymentMethodInfo[] = [
  {
    id: "razorpay",
    label: "Pay via UPI / Card",
    description: "Secure payment via Razorpay (UPI, Cards, Wallets)",
    enabled: true,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when you receive your order",
    enabled: true,
  },
];

export function PaymentMethodPicker({ selected, onChange, venueId }: PaymentMethodPickerProps) {
  const [methods, setMethods] = useState<PaymentMethodInfo[]>(DEFAULT_METHODS);

  useEffect(() => {
    getPaymentMethods(venueId)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMethods(data);
          // If currently selected method is disabled or not available, auto-select first enabled method
          const currentMethod = data.find((m) => m.id === selected);
          if (!currentMethod || currentMethod.enabled === false) {
            const firstActive = data.find((m) => m.enabled !== false);
            if (firstActive) {
              onChange(firstActive.id);
            }
          }
        }
      })
      .catch(() => {
        // Fallback to default methods if API call fails
      });
  }, [venueId]);

  const getIcon = (id: string) => {
    return id === "cod" ? Banknote : CreditCard;
  };

  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-medium"
        style={{ color: "var(--color-text)" }}
      >
        Payment Method
      </h3>
      {methods.map(({ id, label, description, enabled }) => {
        const Icon = getIcon(id);
        const isEnabled = enabled !== false;
        const isSelected = selected === id && isEnabled;

        return (
          <button
            key={id}
            disabled={!isEnabled}
            onClick={() => isEnabled && onChange(id)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 relative overflow-hidden ${
              !isEnabled
                ? "opacity-45 filter blur-[0.4px] pointer-events-none cursor-not-allowed select-none bg-gray-100/70 border border-gray-200"
                : "cursor-pointer"
            }`}
            style={{
              background: isSelected
                ? "rgba(139, 94, 60, 0.08)"
                : !isEnabled
                ? "#f5f5f4"
                : "var(--color-surface)",
              border: isSelected
                ? "2px solid var(--color-primary)"
                : "1.5px solid var(--color-border)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-bg)",
              }}
            >
              <Icon
                size={18}
                style={{
                  color: isSelected
                    ? "var(--color-surface)"
                    : "var(--color-muted)",
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {label}
                </p>
                {!isEnabled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                    <Lock size={10} /> Disabled by Venue
                  </span>
                )}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
                {isEnabled ? description : "Currently turned off by cafe management"}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: isSelected
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                }}
              >
                {isSelected && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
