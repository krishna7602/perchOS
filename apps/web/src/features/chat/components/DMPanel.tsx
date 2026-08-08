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
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="w-full max-w-md mx-auto flex flex-col overflow-hidden rounded-3xl shadow-2xl animate-scale-up"
        style={{
          height: "480px",
          maxHeight: "75vh",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0 bg-gradient-to-r from-amber-500/10 to-orange-500/5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold text-xs border border-amber-500/30">
              💬
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block leading-tight">
                Direct Message
              </span>
              <span className="text-xs text-amber-800/60 font-semibold">with {handle}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-black/5 cursor-pointer transition-all hover:rotate-90 duration-200"
          >
            <X size={18} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {/* Pending request prompt */}
        {pendingRequest && !isAccepted && (
          <div className="px-5 py-4 text-center bg-amber-500/5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--color-text)" }}>
              👋 <strong>{pendingRequest.from}</strong> wants to connect with you
            </p>
            {pendingRequest.body && (
              <p className="text-xs mb-3 italic text-gray-600 bg-white p-2.5 rounded-xl border border-amber-900/10 max-w-sm mx-auto">
                &quot;{pendingRequest.body}&quot;
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="accent" onClick={onAccept} className="shadow-xs hover:scale-105 active:scale-95 transition-all">
                Accept Wave 👋
              </Button>
              <Button variant="ghost" onClick={onDecline} className="hover:bg-red-50 hover:text-red-600 transition-colors">
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400 italic">
              No direct messages yet. Break the ice!
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex animate-slide-up ${msg.isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                    msg.isMine
                      ? "bg-gradient-to-r from-[var(--color-primary)] to-[#996845] text-white rounded-br-xs"
                      : "bg-white text-[var(--color-text)] border border-amber-900/10 rounded-bl-xs"
                  }`}
                >
                  {msg.body}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input composer bar — inside centered modal */}
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0 bg-white/50"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message @${handle}...`}
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/30"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-40 hover:scale-105 active:scale-95 shadow-sm"
            style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
