import { create } from "zustand";
import { acceptWave as acceptWaveApi } from "@/features/chat/api";

interface ConnectionsState {
  acceptedWaveIds: Set<string>;
  isAccepting: Record<string, boolean>;
  markAccepted: (requestId: string) => void;
  acceptWave: (requestId: string, token: string) => Promise<boolean>;
}

export const useConnectionsStore = create<ConnectionsState>((set, get) => ({
  acceptedWaveIds: new Set<string>(),
  isAccepting: {},
  markAccepted: (requestId: string) => {
    set((state) => {
      const next = new Set(state.acceptedWaveIds);
      next.add(requestId);
      return { acceptedWaveIds: next };
    });
  },
  acceptWave: async (requestId: string, token: string) => {
    if (get().acceptedWaveIds.has(requestId) || get().isAccepting[requestId]) {
      return true;
    }

    set((s) => ({ isAccepting: { ...s.isAccepting, [requestId]: true } }));

    // Optimistic UI update immediately
    get().markAccepted(requestId);

    try {
      await acceptWaveApi(requestId, token);
      return true;
    } catch (error) {
      console.error("Failed to accept wave:", error);
      // Revert optimistic update on failure
      set((state) => {
        const next = new Set(state.acceptedWaveIds);
        next.delete(requestId);
        return { acceptedWaveIds: next };
      });
      return false;
    } finally {
      set((s) => {
        const next = { ...s.isAccepting };
        delete next[requestId];
        return { isAccepting: next };
      });
    }
  },
}));
