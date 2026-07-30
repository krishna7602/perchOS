import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--color-primary)",
    color: "var(--color-surface)",
    border: "none",
  },
  secondary: {
    background: "transparent",
    color: "var(--color-primary)",
    border: "1.5px solid var(--color-primary)",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-muted)",
    border: "none",
  },
  danger: {
    background: "var(--color-danger)",
    color: "var(--color-surface)",
    border: "none",
  },
  accent: {
    background: "var(--color-accent)",
    color: "var(--color-surface)",
    border: "none",
  },
};

export function Button({
  variant = "primary",
  children,
  isLoading,
  disabled,
  className = "",
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div
          className="h-4 w-4 rounded-full border-2 border-t-transparent"
          style={{
            borderColor: "currentColor",
            borderTopColor: "transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}
