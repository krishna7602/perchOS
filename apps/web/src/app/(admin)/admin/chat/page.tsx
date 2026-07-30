import { TeamChat } from "@/features/chat/components/TeamChat";

export default function ChatPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}
        >
          Team Chat
        </h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Communicate with your staff in real-time.
        </p>
      </div>

      <TeamChat />
    </div>
  );
}
