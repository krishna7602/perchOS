import { create } from "zustand";

export type Toast = {
  id: string;
  kind: "wave_accepted" | "new_message" | "wave_request";
  by?: string;
  conversationId?: string;
  requestId?: string;
  senderName?: string;
  senderPhoto?: string | null;
  [k: string]: any;
};

interface NotificationsState {
  toasts: Toast[];
  unreadMessageCount: number;
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
  clearUnreadMessages: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  toasts: [],
  unreadMessageCount: 0,
  push: (t) =>
    set((s) => {
      const newToast: Toast = {
        kind: t.kind,
        ...t,
        id: crypto.randomUUID(),
      };
      return {
        toasts: [...s.toasts, newToast],
        unreadMessageCount: t.kind === "new_message" ? s.unreadMessageCount + 1 : s.unreadMessageCount,
      };
    }),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  clearUnreadMessages: () => set({ unreadMessageCount: 0 }),
}));
