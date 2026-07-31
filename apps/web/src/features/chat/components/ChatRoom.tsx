"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatSocket, ChatMessage } from "@/hooks/useChatSocket";
import { OnlineUsersBar } from "./OnlineUsersBar";
import { DMPanel } from "./DMPanel";
import { Send, LogOut, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

interface DisplayMessage {
  id: number;
  type: "message" | "system";
  from?: string;
  body: string;
}

interface DMThread {
  handle: string;
  messages: { from: string; body: string; isMine: boolean }[];
  isAccepted: boolean;
  pendingRequest: { from: string; body: string } | null;
}

interface ChatRoomProps {
  venueId: string;
  venueName: string;
  chatToken: string;
  handle: string;
  menuQrToken?: string;
  onLeave: () => void;
}

export function ChatRoom({
  venueId,
  venueName,
  chatToken,
  handle,
  menuQrToken,
  onLeave,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [dmThread, setDmThread] = useState<DMThread | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  const handleChatMessage = useCallback(
    (msg: ChatMessage) => {
      switch (msg.type) {
        case "message":
          setMessages((prev) => [
            ...prev,
            { id: ++msgIdRef.current, type: "message", from: msg.from, body: msg.body },
          ]);
          break;
        case "system":
          setMessages((prev) => [
            ...prev,
            { id: ++msgIdRef.current, type: "system", body: msg.body },
          ]);
          break;
        case "presence":
          setOnlineUsers(msg.online);
          break;
        case "rejected":
          setMessages((prev) => [
            ...prev,
            {
              id: ++msgIdRef.current,
              type: "system",
              body: `Message rejected: ${msg.reason}`,
            },
          ]);
          break;
        case "dm_request":
          setDmThread({
            handle: msg.from,
            messages: [],
            isAccepted: false,
            pendingRequest: { from: msg.from, body: msg.body },
          });
          break;
        case "dm_accept":
          setDmThread((prev) =>
            prev && prev.handle === msg.from
              ? { ...prev, isAccepted: true, pendingRequest: null }
              : prev
          );
          break;
        case "dm_message":
          setDmThread((prev) => {
            if (!prev || prev.handle !== msg.from) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                { from: msg.from, body: msg.body, isMine: false },
              ],
            };
          });
          break;
      }
    },
    []
  );

  const { isConnected, sendMessage, sendDmRequest, sendDmAccept, sendDmMessage, disconnect } =
    useChatSocket({
      venueId,
      chatToken,
      onMessage: handleChatMessage,
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleUserClick = (targetHandle: string) => {
    setDmThread({
      handle: targetHandle,
      messages: [],
      isAccepted: false,
      pendingRequest: null,
    });
    sendDmRequest(targetHandle, "Hey, want to chat?");
  };

  const handleLeave = () => {
    disconnect();
    onLeave();
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-72px)]" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center gap-2">
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            {venueName}
          </h1>
          <span
            className={`inline-block w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-400"}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {menuQrToken && (
            <Link
              href={`/menu/${menuQrToken}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: "rgba(124, 148, 115, 0.1)",
                color: "var(--color-accent)",
              }}
            >
              <UtensilsCrossed size={14} />
              Menu
            </Link>
          )}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: "rgba(185, 84, 45, 0.1)",
              color: "var(--color-danger)",
            }}
          >
            <LogOut size={14} />
            Leave
          </button>
        </div>
      </div>

      {/* Online users */}
      <OnlineUsersBar
        users={onlineUsers}
        currentUser={handle}
        onUserClick={handleUserClick}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in">
            {msg.type === "system" ? (
              <div className="text-center">
                <span
                  className="inline-block text-xs px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(169, 153, 138, 0.15)",
                    color: "var(--color-muted)",
                  }}
                >
                  {msg.body}
                </span>
              </div>
            ) : (
              <div className={`flex ${msg.from === handle ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  {msg.from !== handle && (
                    <span
                      className="text-xs font-medium ml-1 mb-0.5 block"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {msg.from}
                    </span>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      background:
                        msg.from === handle
                          ? "var(--color-primary)"
                          : "var(--color-surface)",
                      color:
                        msg.from === handle
                          ? "var(--color-surface)"
                          : "var(--color-text)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Say something..."
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

      {/* DM Panel overlay */}
      {dmThread && (
        <DMPanel
          handle={dmThread.handle}
          currentUser={handle}
          messages={dmThread.messages}
          pendingRequest={dmThread.pendingRequest}
          isAccepted={dmThread.isAccepted}
          onAccept={() => {
            sendDmAccept(dmThread.handle);
            setDmThread((prev) =>
              prev ? { ...prev, isAccepted: true, pendingRequest: null } : prev
            );
          }}
          onDecline={() => setDmThread(null)}
          onSend={(body) => {
            sendDmMessage(dmThread.handle, body);
            setDmThread((prev) =>
              prev
                ? {
                    ...prev,
                    messages: [
                      ...prev.messages,
                      { from: handle, body, isMine: true },
                    ],
                  }
                : prev
            );
          }}
          onClose={() => setDmThread(null)}
        />
      )}
    </div>
  );
}
