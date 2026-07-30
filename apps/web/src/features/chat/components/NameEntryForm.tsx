"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { User, UserCircle } from "lucide-react";

interface NameEntryFormProps {
  venueName: string;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  onSubmit: (name: string, isAnonymous: boolean) => void;
  isLoading?: boolean;
}

export function NameEntryForm({
  venueName,
  wifiSsid,
  wifiPassword,
  onSubmit,
  isLoading,
}: NameEntryFormProps) {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (wifiPassword) {
      await navigator.clipboard.writeText(wifiPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Venue header */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">☕</div>
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
        >
          {venueName}
        </h1>
        <p style={{ color: "var(--color-muted)" }} className="text-sm">
          Join the conversation
        </p>
      </div>

      {/* WiFi info card */}
      {wifiSsid && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{
            background: "rgba(124, 148, 115, 0.1)",
            border: "1px solid rgba(124, 148, 115, 0.2)",
          }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-accent)" }}>
            📶 WiFi Available
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {wifiSsid}
              </p>
              {wifiPassword && (
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {wifiPassword}
                </p>
              )}
            </div>
            {wifiPassword && (
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                style={{
                  background: copied ? "var(--color-accent)" : "var(--color-surface)",
                  color: copied ? "white" : "var(--color-accent)",
                  border: copied ? "none" : "1px solid var(--color-accent)",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Name entry */}
      <div
        className="rounded-xl p-6"
        style={{
          background: "var(--color-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--color-text)" }}
        >
          Choose a display name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Coffee Lover"
          maxLength={30}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
          style={{
            background: "var(--color-bg)",
            border: "1.5px solid var(--color-border)",
            color: "var(--color-text)",
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = "var(--color-primary)")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = "var(--color-border)")
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              onSubmit(name.trim(), false);
            }
          }}
        />

        <Button
          variant="primary"
          className="w-full mt-4"
          onClick={() => onSubmit(name.trim(), false)}
          disabled={!name.trim()}
          isLoading={isLoading}
        >
          <User size={16} />
          Join as {name.trim() || "..."}
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => onSubmit("", true)}
          isLoading={isLoading}
        >
          <UserCircle size={16} />
          Continue anonymously
        </Button>
      </div>
    </div>
  );
}
