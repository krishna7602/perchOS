"use client";

import { useEffect, useState } from "react";
import { CreditCard, Banknote } from "lucide-react";
import { getPaymentMethods } from "../api";

interface PaymentMethodPickerProps {
  selected: string;
  onChange: (method: string) => void;
}

interface PaymentMethodInfo {
  id: string;
  label: string;
  description: string;
}

const DEFAULT_METHODS: PaymentMethodInfo[] = [
  {
    id: "razorpay",
    label: "Pay via UPI / Card",
    description: "Secure payment via Razorpay (UPI, Cards, Wallets)",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when you receive your order",
  },
];

export function PaymentMethodPicker({ selected, onChange }: PaymentMethodPickerProps) {
  const [methods, setMethods] = useState<PaymentMethodInfo[]>(DEFAULT_METHODS);

  useEffect(() => {
    getPaymentMethods()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMethods(data);
          // If currently selected method is not available, default to first available
          if (!data.some((m) => m.id === selected)) {
            onChange(data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback to default methods if API call fails
      });
  }, []);

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
      {methods.map(({ id, label, description }) => {
        const Icon = getIcon(id);
        const isSelected = selected === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 cursor-pointer"
            style={{
              background: isSelected ? "rgba(139, 94, 60, 0.08)" : "var(--color-surface)",
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
            <div>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                {label}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {description}
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

