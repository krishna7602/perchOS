"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Vote, UtensilsCrossed, ClipboardList } from "lucide-react";
import { useNotificationsStore } from "@/stores/notificationsStore";
import { ToastContainer } from "@/components/notifications/ToastContainer";

export default function GuestVenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const venueId = params?.venueId as string;

  const unreadCount = useNotificationsStore((s) => s.unreadMessageCount);
  const clearUnread = useNotificationsStore((s) => s.clearUnreadMessages);

  const chatToken = typeof window !== "undefined" ? sessionStorage.getItem("perch_chat_token") : null;

  useEffect(() => {
    if (pathname.includes("/chat")) {
      clearUnread();
    }
  }, [pathname, clearUnread]);

  const tabs = [
    { name: "Menu", path: `/venue/${venueId}/menu`, icon: UtensilsCrossed },
    { name: "Chat", path: `/venue/${venueId}/chat`, icon: MessageSquare },
    { name: "Orders", path: `/venue/${venueId}/orders`, icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col h-[100dvh]" style={{ background: "var(--color-bg)" }}>
      {/* Realtime Toast Container */}
      <ToastContainer token={chatToken} />

      {/* Main Content Area */}
      <main className={`flex-1 min-h-0 ${pathname.includes("/chat") ? "overflow-hidden" : "overflow-y-auto"} pb-[64px]`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 w-full border-t flex items-center justify-around pb-safe pt-2 px-2 z-50 h-[64px]"
        style={{ 
          background: "var(--color-surface)", 
          borderColor: "var(--color-border)",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.03)"
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.path);
          const Icon = tab.icon;
          const isChat = tab.name === "Chat";

          return (
            <Link
              key={tab.path}
              href={tab.path}
              onClick={() => {
                if (isChat) clearUnread();
              }}
              className="flex flex-col items-center justify-center p-2 min-w-[64px] relative"
            >
              <div 
                className={`p-1.5 rounded-full transition-colors relative ${isActive ? "bg-amber-100/30" : ""}`}
                style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {isChat && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span 
                className="text-[10px] font-medium mt-1"
                style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
              >
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

