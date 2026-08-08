"use client";

import { useNotificationsStore } from "@/stores/notificationsStore";
import { WaveRequestToast } from "./WaveRequestToast";

interface ToastContainerProps {
  token?: string | null;
}

export function ToastContainer({ token }: ToastContainerProps) {
  const toasts = useNotificationsStore((s) => s.toasts);
  const dismiss = useNotificationsStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-auto">
      {toasts.map((toast) => {
        if (toast.kind === "wave_request" && toast.requestId) {
          return (
            <WaveRequestToast
              key={toast.id}
              id={toast.id}
              requestId={toast.requestId}
              senderName={toast.senderName || "Someone"}
              senderPhoto={toast.senderPhoto}
              token={token || ""}
            />
          );
        }

        return (
          <div
            key={toast.id}
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white shadow-xl border border-amber-200/80 animate-fade-in text-xs font-medium text-gray-800"
          >
            <div>
              {toast.kind === "wave_accepted" && (
                <span>
                  🎉 Wave accepted by <strong className="text-amber-800">{toast.by || "user"}</strong>! You are now connected.
                </span>
              )}
              {toast.kind === "new_message" && (
                <span>
                  💬 New message from <strong className="text-amber-800">{toast.senderName || "connection"}</strong>
                </span>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-xs text-gray-400 hover:text-gray-600 p-1 cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
