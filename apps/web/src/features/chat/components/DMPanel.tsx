"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { X, Send } from "lucide-react";

interface DMMessage {
  from: string;
  body: string;
  isMine: boolean;
}

interface DMPanelProps {
  handle: string;
  currentUser: string;
  messages: DMMessage[];
  pendingRequest?: { from: string; body: string } | null;
  isAccepted: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onSend: (body: string) => void;
  onClose: () => void;
}

export function DMPanel({
  handle,
  currentUser,
  messages,
  pendingRequest,
  isAccepted,
  onAccept,
  onDecline,
  onSend,
  onClose,
}: DMPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !isAccepted) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div
      className="fixed inset-x-0 bottom-[64px] z-50 flex flex-col animate-slide-up"
      style={{
        maxHeight: "calc(70vh - 64px)",
        background: "var(--color-surface)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        boxShadow: "0 -4px 24px rgba(58, 46, 39, 0.2)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            💬 DM with {handle}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 cursor-pointer transition-colors">
          <X size={18} style={{ color: "var(--color-muted)" }} />
        </button>
      </div>

      {/* Pending request prompt */}
      {pendingRequest && !isAccepted && (
        <div className="px-4 py-4 text-center" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <p className="text-sm mb-1" style={{ color: "var(--color-text)" }}>
            <strong>{pendingRequest.from}</strong> wants to chat with you
          </p>
          {pendingRequest.body && (
            <p className="text-xs mb-3 italic" style={{ color: "var(--color-muted)" }}>
              &quot;{pendingRequest.body}&quot;
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="accent" onClick={onAccept}>
              Accept
            </Button>
            <Button variant="ghost" onClick={onDecline}>
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] px-3 py-2 rounded-xl text-sm"
              style={{
                background: msg.isMine
                  ? "var(--color-primary)"
                  : "var(--color-bg)",
                color: msg.isMine
                  ? "var(--color-surface)"
                  : "var(--color-text)",
              }}
            >
              {msg.body}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isAccepted && (
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
            style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
