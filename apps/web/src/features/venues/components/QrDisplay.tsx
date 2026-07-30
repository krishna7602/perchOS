"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QrDisplayProps {
  label: string;
  base64Png: string;
  description?: string;
}

export function QrDisplay({ label, base64Png, description }: QrDisplayProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${base64Png}`;
    link.download = `${label.toLowerCase().replace(/\s+/g, "_")}_qr.png`;
    link.click();
  };

  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h3
        className="text-sm font-semibold mb-1"
        style={{ color: "var(--color-text)" }}
      >
        {label}
      </h3>
      {description && (
        <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
          {description}
        </p>
      )}
      <div
        className="inline-block p-3 rounded-xl mb-3"
        style={{ background: "white" }}
      >
        <img
          src={`data:image/png;base64,${base64Png}`}
          alt={`${label} QR Code`}
          className="w-48 h-48"
        />
      </div>
      <div>
        <Button variant="secondary" onClick={handleDownload}>
          <Download size={14} />
          Download QR
        </Button>
      </div>
    </div>
  );
}
