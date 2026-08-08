"use client";

import { useEffect } from "react";
import { useConnectionsStore } from "@/stores/connectionsStore";
import { useNotificationsStore } from "@/stores/notificationsStore";

export function useRealtimeEvents(socket: WebSocket | null) {
  const markWaveAccepted = useConnectionsStore((s) => s.markAccepted);
  const pushToast = useNotificationsStore((s) => s.push);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "wave_accepted") {
          const payload = data.payload || {};
          if (payload.request_id) {
            markWaveAccepted(payload.request_id);
          }
          pushToast({ kind: "wave_accepted", by: payload.by, requestId: payload.request_id });
        } else if (data.type === "new_message") {
          const payload = data.payload || {};
          pushToast({
            kind: "new_message",
            conversationId: payload.conversation_id,
            senderName: payload.sender_name,
          });
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.hidden
          ) {
            new Notification("New message on bytebox", {
              body: payload.sender_name
                ? `${payload.sender_name}: ${payload.content || "Sent you a message"}`
                : "New message arrived",
              icon: "/favicon.ico",
            });
          }
        }
      } catch (err) {
        // Ignore non-JSON frames
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, markWaveAccepted, pushToast]);
}
