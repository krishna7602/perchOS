"use client";

interface OnlineUsersBarProps {
  users: string[];
  currentUser: string;
  activeProfiles?: any[];
  onUserClick: (handle: string) => void;
}

export function OnlineUsersBar({ users, currentUser, activeProfiles = [], onUserClick }: OnlineUsersBarProps) {
  // Filter out numeric anonymous IDs and invalid handles
  const validUsers = users.filter((h) => h && typeof h === "string" && !/^\d+$/.test(h.trim()));

  // Ensure currentUser is always included in the online users count and list
  const allUsers = validUsers.includes(currentUser) ? validUsers : [currentUser, ...validUsers];

  // Helper to look up profile username
  const getUsername = (displayName: string) => {
    const found = activeProfiles.find((p) => p.display_name === displayName);
    return found?.username || null;
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
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
      <div 
        className="flex gap-1.5 overflow-x-auto" 
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {allUsers.map((handle) => {
          const isMe = handle === currentUser;
          const uname = getUsername(handle);

          return (
            <button
              key={handle}
              onClick={() => !isMe && onUserClick(handle)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                isMe ? "" : "hover:scale-105"
              }`}
              style={{
                background: isMe ? "var(--color-primary)" : "rgba(139, 94, 60, 0.1)",
                color: isMe ? "var(--color-surface)" : "var(--color-primary)",
              }}
              disabled={isMe}
              title={isMe ? "You" : `Send DM to ${handle}`}
            >
              <span>{isMe ? `${handle} (you)` : handle}</span>
              {uname && !isMe && (
                <span className="text-[10px] opacity-70 font-normal">@{uname}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
