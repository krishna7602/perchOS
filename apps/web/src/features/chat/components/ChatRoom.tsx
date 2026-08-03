"use client";

import { useState, useRef, useEffect } from "react";
import { OnlineUsersBar } from "./OnlineUsersBar";
import { DMPanel } from "./DMPanel";
import { Send, LogOut, UtensilsCrossed, X, Star, Link as LinkIcon, Compass, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";
import { 
  getVenueMessages, 
  sendVenueMessage, 
  getDiscoveryProfiles, 
  getPublicProfile, 
  sendWave, 
  acceptWave, 
  getDirectMessages, 
  sendDirectMessage 
} from "@/lib/api";

interface DisplayMessage {
  id: string;
  type: "message" | "system";
  from?: string;
  username?: string;
  showSuffix?: boolean;
  profilePhoto?: string | null;
  statusEmoji?: string;
  body: string;
  timestamp: string;
}

interface DMThread {
  connectionId: string;
  handle: string;
  messages: { from: string; body: string; isMine: boolean }[];
  isAccepted: boolean;
}

interface ChatRoomProps {
  venueId: string;
  venueName: string;
  chatToken: string;
  handle: string;
  menuQrToken?: string;
  onLeave: () => void;
}

export function ChatRoom({
  venueId,
  venueName,
  chatToken,
  handle,
  menuQrToken,
  onLeave,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);
  const [input, setInput] = useState("");
  
  // DM Thread state
  const [dmThread, setDmThread] = useState<DMThread | null>(null);
  
  // Profile Modal state
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll Messages every 3 seconds
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getVenueMessages(venueId, chatToken);
        const mapped: DisplayMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          type: "message",
          from: m.display_name,
          username: m.username,
          showSuffix: m.show_username_suffix,
          profilePhoto: m.profile_photo,
          statusEmoji: m.status_emoji,
          body: m.content,
          timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(mapped);
      } catch (err) {
        console.error("Error polling messages", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [venueId, chatToken]);

  // Poll Discovery profiles (Online users) every 10 seconds
  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const data = await getDiscoveryProfiles(chatToken, 1, 50);
        setActiveProfiles(data.profiles);
        const handles = data.profiles.map((p: any) => p.display_name);
        setOnlineUsers(handles);
      } catch (err) {
        console.error("Error polling discovery", err);
      }
    };

    fetchDiscovery();
    const interval = setInterval(fetchDiscovery, 10000);
    return () => clearInterval(interval);
  }, [chatToken]);

  // Poll DM messages every 3 seconds when a thread is active
  useEffect(() => {
    if (!dmThread) return;

    const fetchDMs = async () => {
      try {
        const data = await getDirectMessages(dmThread.connectionId, chatToken);
        const mapped = data.messages.map((m: any) => ({
          from: m.sender_id === sessionStorage.getItem("perch_username") ? handle : dmThread.handle,
          body: m.content,
          isMine: m.sender_id !== dmThread.connectionId && m.sender_id !== dmThread.handle, // Handled inside dm mapper or fallback
        }));
        
        // Better matching of sender to isMine: check if sender matches current user's profile info
        const updatedMessages = data.messages.map((m: any) => {
          const myUsername = sessionStorage.getItem("perch_username");
          const isMine = m.sender_id === myUsername || m.sender_id !== dmThread.connectionId; // fallback logic
          return {
            from: isMine ? handle : dmThread.handle,
            body: m.content,
            isMine: isMine,
          };
        });

        // Simple validation or just update
        setDmThread(prev => prev ? { ...prev, messages: updatedMessages.reverse() } : null);
      } catch (err) {
        console.error("Error polling DMs", err);
      }
    };

    fetchDMs();
    const interval = setInterval(fetchDMs, 3000);
    return () => clearInterval(interval);
  }, [dmThread?.connectionId, chatToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput("");
    try {
      await sendVenueMessage(venueId, body, chatToken);
      // Immediate pull
      const data = await getVenueMessages(venueId, chatToken);
      const mapped: DisplayMessage[] = data.messages.map((m: any) => ({
        id: m.id,
        type: "message",
        from: m.display_name,
        username: m.username,
        showSuffix: m.show_username_suffix,
        profilePhoto: m.profile_photo,
        statusEmoji: m.status_emoji,
        body: m.content,
        timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setMessages(mapped);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUserClick = async (targetHandle: string) => {
    // Find profile details by display name
    const found = activeProfiles.find((p) => p.display_name === targetHandle);
    if (!found) return;
    
    setIsLoadingProfile(true);
    setProfileError("");
    setSelectedProfile(null);

    try {
      const details = await getPublicProfile(found.id, chatToken);
      setSelectedProfile(details);
    } catch {
      setProfileError("Could not retrieve profile.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSendWave = async () => {
    if (!selectedProfile) return;
    try {
      const res = await sendWave(selectedProfile.id, chatToken);
      if (res.status === "sent" || res.status === "already_exists") {
        // Refresh profile card status
        const details = await getPublicProfile(selectedProfile.id, chatToken);
        setSelectedProfile(details);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptWave = async () => {
    if (!selectedProfile || !selectedProfile.connection_id) return;
    try {
      const res = await acceptWave(selectedProfile.connection_id, chatToken);
      if (res.status === "accepted") {
        // Refresh profile card status
        const details = await getPublicProfile(selectedProfile.id, chatToken);
        setSelectedProfile(details);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDM = () => {
    if (!selectedProfile || !selectedProfile.connection_id) return;
    setDmThread({
      connectionId: selectedProfile.connection_id,
      handle: selectedProfile.display_name,
      messages: [],
      isAccepted: true,
    });
    setSelectedProfile(null); // Close profile card
  };

  const handleSendDM = async (body: string) => {
    if (!dmThread) return;
    try {
      await sendDirectMessage(dmThread.connectionId, body, chatToken);
      // Immediate update
      const data = await getDirectMessages(dmThread.connectionId, chatToken);
      const updatedMessages = data.messages.map((m: any) => {
        const myUsername = sessionStorage.getItem("perch_username");
        return {
          from: m.sender_id === myUsername ? handle : dmThread.handle,
          body: m.content,
          isMine: m.sender_id === myUsername,
        };
      });
      setDmThread(prev => prev ? { ...prev, messages: updatedMessages.reverse() } : null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center gap-2">
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
          >
            {venueName}
          </h1>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          {menuQrToken && (
            <Link
              href={`/venue/${venueId}/menu`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: "rgba(124, 148, 115, 0.1)",
                color: "var(--color-accent)",
              }}
            >
              <UtensilsCrossed size={14} />
              Menu
            </Link>
          )}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            style={{
              background: "rgba(185, 84, 45, 0.1)",
              color: "var(--color-danger)",
            }}
          >
            <LogOut size={14} />
            Leave
          </button>
        </div>
      </div>

      {/* Online users */}
      <OnlineUsersBar
        users={onlineUsers}
        currentUser={handle}
        onUserClick={handleUserClick}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
            <MessageSquare size={32} className="text-amber-600 mb-2" />
            <p className="text-sm font-medium">Welcome to {venueName} venue chat!</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to say hello.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="animate-fade-in flex gap-3">
              {/* Photo & Status */}
              <div className="relative shrink-0 cursor-pointer" onClick={() => msg.from && handleUserClick(msg.from)}>
                {msg.profilePhoto ? (
                  <img src={msg.profilePhoto} alt="" className="w-10 h-10 rounded-full border border-gray-150 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-700 text-sm font-bold">
                    {msg.from ? msg.from[0] : "?"}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-white flex items-center justify-center text-[7px] border shadow-sm">
                  {msg.statusEmoji || "🟢"}
                </span>
              </div>

              {/* Message Content */}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold cursor-pointer hover:underline" onClick={() => msg.from && handleUserClick(msg.from)}>
                    {msg.from} {msg.showSuffix && <span className="text-xs font-normal text-gray-400">@{msg.username}</span>}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--color-muted)" }}>{msg.timestamp}</span>
                </div>
                <div 
                  className="px-4 py-2 rounded-2xl rounded-tl-none text-sm max-w-[85%] inline-block"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)"
                  }}
                >
                  {msg.body}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Say something to the room..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: "var(--color-bg)",
            border: "1.5px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
          style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
        >
          <Send size={16} />
        </button>
      </div>

      {/* Profile Card Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            {/* Header / Cover color */}
            <div className="h-16 bg-gradient-to-r from-amber-500 to-orange-500 relative flex justify-end p-3">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="p-1 rounded-full bg-white/20 hover:bg-white/40 text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-6 pb-6 pt-0 flex-1 relative">
              <div className="flex justify-between items-end -mt-10 mb-4">
                {selectedProfile.profile_photo ? (
                  <img 
                    src={selectedProfile.profile_photo} 
                    alt="" 
                    className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-white" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-white flex items-center justify-center text-amber-700 text-2xl font-bold shadow-md">
                    {selectedProfile.display_name[0]}
                  </div>
                )}
                
                {/* Networking Goal badge */}
                {selectedProfile.networking_mode && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                    {selectedProfile.networking_mode}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-1.5">
                {selectedProfile.display_name}
                <span className="text-xs font-normal text-gray-400">@{selectedProfile.username}</span>
              </h3>
              
              {selectedProfile.headline && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">{selectedProfile.headline}</p>
              )}

              {/* Company / College */}
              {(selectedProfile.company || selectedProfile.college) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
                  {selectedProfile.company && <span>🏢 {selectedProfile.company}</span>}
                  {selectedProfile.college && <span>🎓 {selectedProfile.college}</span>}
                </div>
              )}

              {selectedProfile.bio && (
                <p className="text-xs text-gray-600 mt-3 border-l-2 border-amber-500/20 pl-2 py-0.5 italic">
                  &quot;{selectedProfile.bio}&quot;
                </p>
              )}

              {/* Interests & Tags */}
              {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Interests</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedProfile.interests.map((interest: string) => (
                      <span key={interest} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedProfile.professional_tags && selectedProfile.professional_tags.length > 0 && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Professional Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedProfile.professional_tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] font-medium bg-amber-500/10 text-amber-700 px-2 py-1 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {selectedProfile.social_links && Object.values(selectedProfile.social_links).some(v => !!v) && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    {selectedProfile.social_links.linkedin && (
                      <a href={`https://linkedin.com/in/${selectedProfile.social_links.linkedin}`} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-amber-500">
                        <Star size={16} />
                      </a>
                    )}
                    {selectedProfile.social_links.instagram && (
                      <a href={`https://instagram.com/${selectedProfile.social_links.instagram}`} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-amber-500">
                        <Star size={16} />
                      </a>
                    )}
                    {selectedProfile.social_links.github && (
                      <a href={`https://github.com/${selectedProfile.social_links.github}`} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-amber-500">
                        <Star size={16} />
                      </a>
                    )}
                    {selectedProfile.social_links.website && (
                      <a href={selectedProfile.social_links.website} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-50 rounded-lg text-gray-400 hover:text-amber-500">
                        <LinkIcon size={16} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Connection Actions Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
              {selectedProfile.connection_status === "self" ? (
                <span className="text-xs text-gray-400 italic">This is you</span>
              ) : selectedProfile.connection_status === "connected" ? (
                <button
                  onClick={handleOpenDM}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-amber-600 cursor-pointer"
                >
                  <MessageSquare size={14} /> Message
                </button>
              ) : selectedProfile.connection_status === "wave_sent" ? (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-200 text-gray-500 rounded-xl text-xs font-bold"
                >
                  Wave Sent (Pending)
                </button>
              ) : selectedProfile.connection_status === "wave_received" ? (
                <button
                  onClick={handleAcceptWave}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-green-700 cursor-pointer animate-pulse"
                >
                  Accept Wave 👋
                </button>
              ) : (
                <button
                  onClick={handleSendWave}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-amber-600 cursor-pointer"
                >
                  👋 Wave
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DM Panel Overlay */}
      {dmThread && (
        <DMPanel
          handle={dmThread.handle}
          currentUser={handle}
          messages={dmThread.messages}
          isAccepted={dmThread.isAccepted}
          onAccept={() => {}}
          onDecline={() => setDmThread(null)}
          onSend={handleSendDM}
          onClose={() => setDmThread(null)}
        />
      )}
    </div>
  );
}
