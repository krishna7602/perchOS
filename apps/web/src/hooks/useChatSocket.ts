"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getWsUrl } from "@/lib/api";

export type ChatMessage =
  | { type: "message"; from: string; body: string }
  | { type: "system"; body: string }
  | { type: "presence"; online: string[]; count: number }
  | { type: "rejected"; reason: string }
  | { type: "dm_request"; from: string; body: string }
  | { type: "dm_accept"; from: string }
  | { type: "dm_message"; from: string; body: string };

interface UseChatSocketOptions {
  venueId: string;
  chatToken: string;
  onMessage: (msg: ChatMessage) => void;
  onSessionExpired?: () => void;
}

export function useChatSocket({ venueId, chatToken, onMessage, onSessionExpired }: UseChatSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  useEffect(() => {
    if (!venueId || !chatToken) return;

    const url = getWsUrl(venueId, chatToken);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ChatMessage;
        onMessageRef.current(data);
      } catch {}
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      // 4008 = session expired (2-hour limit reached)
      if (event.code === 4008) {
        setSessionExpired(true);
        onSessionExpiredRef.current?.();
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [venueId, chatToken]);

  const sendMessage = useCallback((body: string) => {
    wsRef.current?.send(JSON.stringify({ type: "message", body }));
  }, []);

  const sendDmRequest = useCallback((to: string, body: string) => {
    wsRef.current?.send(JSON.stringify({ type: "dm_request", to, body }));
  }, []);

  const sendDmAccept = useCallback((to: string) => {
    wsRef.current?.send(JSON.stringify({ type: "dm_accept", to }));
  }, []);

  const sendDmMessage = useCallback((to: string, body: string) => {
    wsRef.current?.send(JSON.stringify({ type: "dm_message", to, body }));
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    sessionExpired,
    sendMessage,
    sendDmRequest,
    sendDmAccept,
    sendDmMessage,
    disconnect,
  };
}
