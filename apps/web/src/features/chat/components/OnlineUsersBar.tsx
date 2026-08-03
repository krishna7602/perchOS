"use client";

interface OnlineUsersBarProps {
  users: string[];
  currentUser: string;
  onUserClick: (handle: string) => void;
}

export function OnlineUsersBar({ users, currentUser, onUserClick }: OnlineUsersBarProps) {
  // Ensure currentUser is always included in the online users count and list
  const allUsers = users.includes(currentUser) ? users : [currentUser, ...users];

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 overflow-x-auto"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <span
        className="text-xs font-semibold shrink-0"
        style={{ color: "var(--color-accent)" }}
      >
        🟢 {allUsers.length} online
      </span>
      <div className="w-px h-4 shrink-0" style={{ background: "var(--color-border)" }} />
      <div className="flex gap-1.5 overflow-x-auto">
        {allUsers.map((handle) => (
          <button
            key={handle}
            onClick={() => handle !== currentUser && onUserClick(handle)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
              handle === currentUser ? "" : "hover:scale-105"
            }`}
            style={{
              background:
                handle === currentUser
                  ? "var(--color-primary)"
                  : "rgba(139, 94, 60, 0.1)",
              color:
                handle === currentUser
                  ? "var(--color-surface)"
                  : "var(--color-primary)",
            }}
            disabled={handle === currentUser}
            title={handle === currentUser ? "You" : `Send DM to ${handle}`}
          >
            {handle === currentUser ? `${handle} (you)` : handle}
          </button>
        ))}
      </div>
    </div>
  );
}
