/** Perch design tokens — mirrors CSS variables for JS-side access. */
export const theme = {
  colors: {
    bg: "var(--color-bg)",
    surface: "var(--color-surface)",
    primary: "var(--color-primary)",
    primaryHover: "var(--color-primary-hover)",
    accent: "var(--color-accent)",
    accentHover: "var(--color-accent-hover)",
    text: "var(--color-text)",
    muted: "var(--color-muted)",
    danger: "var(--color-danger)",
    dangerHover: "var(--color-danger-hover)",
    border: "var(--color-border)",
    overlay: "var(--color-overlay)",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  },
  shadow: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
  },
  font: {
    heading: "var(--font-heading)",
    body: "var(--font-body)",
  },
} as const;

/** Order status progression for kanban and status tracker */
export const ORDER_STATUSES = ["received", "preparing", "ready", "served"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Order Received",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  served: "Served",
};

export const ORDER_STATUS_EMOJI: Record<OrderStatus, string> = {
  received: "📋",
  preparing: "👨‍🍳",
  ready: "✅",
  served: "🍽️",
};
