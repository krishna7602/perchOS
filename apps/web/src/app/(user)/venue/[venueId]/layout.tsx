"use client";

import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Vote, UtensilsCrossed, ClipboardList } from "lucide-react";

export default function GuestVenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const venueId = params?.venueId as string;

  const tabs = [
    { name: "Chat", path: `/venue/${venueId}/chat`, icon: MessageSquare },
    { name: "Polls", path: `/venue/${venueId}/polls`, icon: Vote },
    { name: "Menu", path: `/venue/${venueId}/menu`, icon: UtensilsCrossed },
    { name: "Orders", path: `/venue/${venueId}/orders`, icon: ClipboardList },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
      {/* Main Content Area */}
      <main className="flex-1 pb-[72px] overflow-y-auto">
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
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className="flex flex-col items-center justify-center p-2 min-w-[64px]"
            >
              <div 
                className={`p-1.5 rounded-full transition-colors ${isActive ? "bg-amber-100/30" : ""}`}
                style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
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
