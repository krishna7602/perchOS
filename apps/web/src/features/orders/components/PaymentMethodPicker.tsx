"use client";

import { useState } from "react";
import { CreditCard, Banknote } from "lucide-react";

interface PaymentMethodPickerProps {
  selected: string;
  onChange: (method: string) => void;
}

const methods = [
  {
    id: "dummy_card",
    label: "Card Payment",
    description: "Simulated card payment (demo)",
    icon: CreditCard,
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when you receive your order",
    icon: Banknote,
  },
];

export function PaymentMethodPicker({ selected, onChange }: PaymentMethodPickerProps) {
  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-medium"
        style={{ color: "var(--color-text)" }}
      >
        Payment Method
      </h3>
      {methods.map(({ id, label, description, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200 cursor-pointer"
          style={{
            background: selected === id ? "rgba(139, 94, 60, 0.08)" : "var(--color-surface)",
            border:
              selected === id
                ? "2px solid var(--color-primary)"
                : "1.5px solid var(--color-border)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background:
                selected === id
                  ? "var(--color-primary)"
                  : "var(--color-bg)",
            }}
          >
            <Icon
              size={18}
              style={{
                color:
                  selected === id
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
                borderColor:
                  selected === id
                    ? "var(--color-primary)"
                    : "var(--color-border)",
              }}
            >
              {selected === id && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: "var(--color-primary)" }}
                />
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
