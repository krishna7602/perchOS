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

  // Helper to look up profile username & photo
  const getProfileData = (displayName: string) => {
    const found = activeProfiles.find((p) => p.display_name === displayName);
    return {
      username: found?.username || null,
      photo: found?.profile_photo || null,
      statusEmoji: found?.status_emoji || "🟢",
    };
  };

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 shrink-0 transition-colors duration-200"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold tracking-wide">
          {allUsers.length} Live
        </span>
      </div>

      <div className="w-px h-4 shrink-0" style={{ background: "var(--color-border)" }} />

      <div 
        className="flex gap-2 overflow-x-auto py-0.5" 
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {allUsers.map((handle) => {
          const isMe = handle === currentUser;
          const { username, photo, statusEmoji } = getProfileData(handle);

          return (
            <button
              key={handle}
              onClick={() => !isMe && onUserClick(handle)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer flex items-center gap-1.5 shadow-xs border ${
                isMe 
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm" 
                  : "bg-white/80 hover:bg-amber-50/80 text-[var(--color-text)] border-amber-900/10 hover:border-amber-500/40 hover:scale-105 active:scale-95"
              }`}
              disabled={isMe}
              title={isMe ? "You" : `Click to view ${handle}'s profile`}
            >
              <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                <img 
                  src={photo || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(handle || "user")}`} 
                  alt={handle} 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="truncate max-w-[110px] font-semibold">
                {isMe ? `${handle} (you)` : handle}
              </span>
              {username && !isMe && (
                <span className="text-[10px] opacity-60 font-mono">@{username}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
