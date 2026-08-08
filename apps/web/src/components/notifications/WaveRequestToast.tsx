"use client";

import { useConnectionsStore } from "@/stores/connectionsStore";
import { useNotificationsStore } from "@/stores/notificationsStore";

interface WaveRequestToastProps {
  id: string;
  requestId: string;
  senderName: string;
  senderPhoto?: string | null;
  token: string;
}

export function WaveRequestToast({
  id,
  requestId,
  senderName,
  senderPhoto,
  token,
}: WaveRequestToastProps) {
  const acceptWave = useConnectionsStore((s) => s.acceptWave);
  const isAccepting = useConnectionsStore((s) => s.isAccepting[requestId]);
  const dismissToast = useNotificationsStore((s) => s.dismiss);

  async function onAccept() {
    await acceptWave(requestId, token);
    dismissToast(id);
  }

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white shadow-xl border border-amber-200/80 animate-fade-in text-left">
      {senderPhoto ? (
        <img
          src={senderPhoto}
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover border border-amber-300 shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-bold flex items-center justify-center text-sm shrink-0">
          {(senderName || "W").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 truncate">
          {senderName} waved at you! 👋
        </p>
        <p className="text-[11px] text-gray-500">Tap accept to start chatting</p>
      </div>
      <button
        onClick={onAccept}
        disabled={isAccepting}
        className="text-xs px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer disabled:opacity-50 transition-all shrink-0"
      >
        {isAccepting ? "..." : "Accept"}
      </button>
      <button
        onClick={() => dismissToast(id)}
        className="text-xs text-gray-400 hover:text-gray-600 p-1 shrink-0 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
