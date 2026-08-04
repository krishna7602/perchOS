"use client";

import { useState, useRef, useEffect } from "react";
import { OnlineUsersBar } from "./OnlineUsersBar";
import { DMPanel } from "./DMPanel";
import { Send, LogOut, UtensilsCrossed, X, Star, Link as LinkIcon, Compass, Sparkles, MessageSquare, Vote, Plus, Check, BarChart2, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { 
  getVenueMessages, 
  sendVenueMessage, 
  getDiscoveryProfiles, 
  getPublicProfile, 
  sendWave, 
  acceptWave, 
  getDirectMessages, 
  sendDirectMessage,
  getPendingWaves,
  getVenuePolls,
  createVenuePoll,
  voteVenuePoll
} from "@/lib/api";
import { playNotificationSound } from "@/lib/audio";

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

interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  creator_handle: string;
  created_at: string;
  total_votes: number;
  options: PollOption[];
  voted_option_id: string | null;
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

  // Polls state
  const [showPolls, setShowPolls] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isPollsLoading, setIsPollsLoading] = useState(true);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [isPollSubmitting, setIsPollSubmitting] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [profileError, setProfileError] = useState("");

  // Wave notification state
  const [incomingWave, setIncomingWave] = useState<{
    waveId: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string | null;
  } | null>(null);

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

  // Connect real-time WebSocket for live presence & instant message sync
  useEffect(() => {
    if (!venueId || !chatToken) return;

    const host = process.env.NEXT_PUBLIC_WS_URL || 
                 process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, "ws") || 
                 "wss://perchos.onrender.com";
    const cleanHost = host.replace(/\/$/, "");
    const wsUrl = `${cleanHost}/ws/room/${venueId}?token=${encodeURIComponent(chatToken)}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "presence" && Array.isArray(data.online)) {
            const cleanOnline = data.online.filter((h: string) => h && !/^\d+$/.test(h.trim()));
            setOnlineUsers((prev) => {
              const cleanPrev = prev.filter((h: string) => !/^\d+$/.test(h.trim()));
              return Array.from(new Set([...cleanPrev, ...cleanOnline]));
            });
          } else if (data.type === "wave_notification") {
            setIncomingWave({
              waveId: data.wave_id,
              senderId: data.sender_id,
              senderName: data.sender_name,
              senderPhoto: data.sender_photo,
            });
            try { playNotificationSound(); } catch (e) {}
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };
    } catch (e) {
      console.warn("WS init error:", e);
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [venueId, chatToken]);

  // Poll Discovery profiles as fallback every 10 seconds
  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const data = await getDiscoveryProfiles(chatToken, 1, 50);
        if (data && data.profiles) {
          const realProfiles = data.profiles.filter((p: any) => p.display_name && !/^\d+$/.test(p.display_name.trim()));
          setActiveProfiles(realProfiles);
          const handles = realProfiles.map((p: any) => p.display_name);
          setOnlineUsers((prev) => {
            const cleanPrev = prev.filter((h: string) => !/^\d+$/.test(h.trim()));
            const merged = Array.from(new Set([...cleanPrev, ...handles]));
            return merged;
          });
        }
      } catch (err) {
        console.error("Error polling discovery", err);
      }
    };

    fetchDiscovery();
    const interval = setInterval(fetchDiscovery, 10000);
    return () => clearInterval(interval);
  }, [chatToken]);

  // Poll pending incoming wave requests every 4 seconds
  useEffect(() => {
    const checkPendingWaves = async () => {
      try {
        const waves = await getPendingWaves(chatToken);
        if (waves && waves.length > 0) {
          const first = waves[0];
          setIncomingWave({
            waveId: first.wave_id,
            senderId: first.sender_id,
            senderName: first.sender_name,
            senderPhoto: first.sender_photo,
          });
        }
      } catch (err) {
        // quiet
      }
    };

    checkPendingWaves();
    const interval = setInterval(checkPendingWaves, 4000);
    return () => clearInterval(interval);
  }, [chatToken]);

  const handleAcceptIncomingWave = async () => {
    if (!incomingWave) return;
    try {
      const res = await acceptWave(incomingWave.waveId, chatToken);
      if (res.status === "accepted" && res.connection_id) {
        setDmThread({
          connectionId: res.connection_id,
          handle: incomingWave.senderName,
          messages: [],
          isAccepted: true,
        });
      }
    } catch (err) {
      console.error("Error accepting wave", err);
    } finally {
      setIncomingWave(null);
    }
  };

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

  const profilePhoto = typeof window !== "undefined" ? sessionStorage.getItem("perch_profile_photo") : null;
  const userEmail = typeof window !== "undefined" ? sessionStorage.getItem("perch_email") : null;

  // Poll helpers
  const roundNum = (num: number, decimals: number) =>
    Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);

  const fetchPolls = async () => {
    if (!venueId || !chatToken) return;
    try {
      const data = await getVenuePolls(venueId, chatToken);
      setPolls(data.polls || []);
    } catch (err) {
      console.error("Error fetching polls", err);
    } finally {
      setIsPollsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!showPolls) return;
    fetchPolls();
    const interval = setInterval(fetchPolls, 4000);
    return () => clearInterval(interval);
  }, [showPolls, venueId, chatToken]);

  const handlePollVote = async (pollId: string, optionId: string) => {
    if (!chatToken) return;
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const newTotal = poll.voted_option_id ? poll.total_votes : poll.total_votes + 1;
        const updatedOptions = poll.options.map((opt) => {
          let count = opt.votes;
          if (poll.voted_option_id === opt.id) count -= 1;
          if (opt.id === optionId) count += 1;
          return { ...opt, votes: count, percentage: newTotal > 0 ? roundNum((count / newTotal) * 100, 1) : 0 };
        });
        return { ...poll, voted_option_id: optionId, total_votes: newTotal, options: updatedOptions };
      })
    );
    try {
      await voteVenuePoll(venueId, pollId, optionId, chatToken);
      fetchPolls();
    } catch (err) {
      console.error("Failed to vote", err);
      fetchPolls();
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    setIsPollSubmitting(true);
    try {
      await createVenuePoll(venueId, pollQuestion.trim(), validOptions, chatToken);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowCreatePoll(false);
      fetchPolls();
    } catch (err) {
      console.error("Failed to create poll", err);
    } finally {
      setIsPollSubmitting(false);
    }
  };

  const POLL_TEMPLATES = [
    { question: "🎵 What song style should we play next?", options: ["Chill Lofi Beats 🎧", "Acoustic Pop 🎸", "Upbeat House 🕺"] },
    { question: "☕ Best drink for this weather?", options: ["Iced Spanish Latte ❄️", "Hot Caramel Macchiato ☕", "Matcha Lemonade 🍵"] },
    { question: "🎲 Anyone down for board games?", options: ["Yes! Count me in 🙋", "Maybe later ⌛", "Just relaxing 📖"] },
  ];

  return (
    <div className="flex flex-col h-full relative" style={{ background: "var(--color-bg)" }}>
      {/* Floating Wave Notification Toast */}
      {incomingWave && (
        <div className="fixed top-16 inset-x-4 max-w-md mx-auto z-50 animate-bounce">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-amber-300/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {incomingWave.senderPhoto ? (
                <img src={incomingWave.senderPhoto} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md ring-2 ring-white/30" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center border-2 border-white/80 text-sm shadow-md">
                  {incomingWave.senderName ? incomingWave.senderName[0] : "W"}
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={12} className="animate-spin" /> New Wave Notification
                </p>
                <p className="text-sm font-bold">{incomingWave.senderName} waved at you!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAcceptIncomingWave}
                className="px-3.5 py-1.5 bg-white text-orange-600 font-bold rounded-xl text-xs shadow-md hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Accept 👋
              </button>
              <button
                onClick={() => setIncomingWave(null)}
                className="p-1 rounded-full text-amber-200 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 relative overflow-hidden"
        style={{
          background: "linear-gradient(90deg, var(--color-surface) 0%, rgba(245, 239, 230, 0.5) 50%, var(--color-surface) 100%)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-800 border border-amber-500/20">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-base font-bold leading-tight"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
              >
                {venueName}
              </h1>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-amber-900/60 font-medium">Live Cafe Chatroom</p>
          </div>
        </div>

        {/* User Google Profile Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-amber-900/10 shadow-xs hover:border-amber-500/30 transition-all">
          <img 
            src={profilePhoto || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(handle || "user")}`} 
            alt={handle || ""} 
            className="w-6 h-6 rounded-full object-cover border border-amber-500/40 bg-amber-50" 
          />
          <span className="text-xs font-bold text-gray-800 leading-tight">{handle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowPolls(!showPolls); if (!showPolls) { setIsPollsLoading(true); } }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
              showPolls ? "ring-2 ring-amber-500/30" : ""
            }`}
            style={{
              background: showPolls ? "rgba(217, 119, 6, 0.22)" : "rgba(217, 119, 6, 0.12)",
              color: "#b45309",
              border: "1px solid rgba(217, 119, 6, 0.25)"
            }}
          >
            <Vote size={14} />
            Polls
          </button>

          {menuQrToken && (
            <Link
              href={`/venue/${venueId}/menu`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs"
              style={{
                background: "rgba(124, 148, 115, 0.15)",
                color: "var(--color-accent)",
                border: "1px solid rgba(124, 148, 115, 0.25)"
              }}
            >
              <UtensilsCrossed size={14} />
              Menu
            </Link>
          )}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
            style={{
              background: "rgba(185, 84, 45, 0.12)",
              color: "var(--color-danger)",
              border: "1px solid rgba(185, 84, 45, 0.2)"
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
        activeProfiles={activeProfiles}
        onUserClick={handleUserClick}
      />

      {/* Messages Feed + Polls Panel */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* Chat Messages */}
        <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth transition-all duration-300 ${showPolls ? "hidden sm:block sm:flex-1" : "flex-1"}`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-inner">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                  <Compass size={12} />
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-800 mb-1">Welcome to {venueName}!</h3>
              <p className="text-xs text-gray-500 max-w-xs mb-6">
                Connect with fellow patrons, share vibes, or order food together.
              </p>
              
              {/* Quick Starter Pills */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {[
                  "👋 Hey everyone!",
                  "☕ What's good to drink here?",
                  "🍕 Anyone want to recommend a dish?",
                  "🎵 Love the music in here!"
                ].map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(starter);
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-amber-50 text-amber-900 border border-amber-900/10 hover:border-amber-500/30 transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.from === handle;

              return (
                <div 
                  key={msg.id} 
                  className={`animate-slide-up flex gap-2.5 transition-all duration-200 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Photo & Status */}
                  <div 
                    className="relative shrink-0 cursor-pointer group self-end"
                    onClick={() => msg.from && handleUserClick(msg.from)}
                  >
                    <img 
                      src={msg.profilePhoto || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(msg.username || msg.from || "guest")}`} 
                      alt={msg.from || ""} 
                      className="w-9 h-9 rounded-full border-2 border-white shadow-xs object-cover bg-amber-50 group-hover:scale-110 transition-transform" 
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center text-[8px] border border-gray-100 shadow-xs">
                      {msg.statusEmoji || "🟢"}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col space-y-1 max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-baseline gap-1.5 px-1">
                      <span 
                        className="text-xs font-bold cursor-pointer hover:underline text-gray-800 flex items-center gap-1" 
                        onClick={() => msg.from && handleUserClick(msg.from)}
                      >
                        <span>{isMe ? "You" : msg.from}</span>
                        {msg.username && !isMe && (
                          <span className="text-[10px] font-normal text-amber-800/60 font-mono">@{msg.username}</span>
                        )}
                      </span>
                      <span className="text-[9px] text-gray-400">{msg.timestamp}</span>
                    </div>

                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs transition-all ${
                        isMe
                          ? "bg-gradient-to-r from-[var(--color-primary)] to-[#996845] text-white rounded-br-xs"
                          : "bg-white text-[var(--color-text)] border border-amber-900/10 rounded-bl-xs hover:border-amber-500/20"
                      }`}
                    >
                      {msg.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Inline Polls Panel ─── */}
        {showPolls && (
          <div
            className="w-full sm:w-[340px] sm:max-w-[340px] sm:min-w-[280px] flex flex-col border-l animate-slide-in-right"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            {/* Polls Panel Header */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5 shrink-0 border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPolls(false)}
                  className="p-1 rounded-lg hover:bg-black/5 cursor-pointer transition-colors sm:hidden"
                >
                  <ChevronLeft size={16} style={{ color: "var(--color-muted)" }} />
                </button>
                <div className="flex items-center gap-1.5">
                  <Vote size={16} style={{ color: "var(--color-primary)" }} />
                  <span className="text-sm font-bold" style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}>Polls</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">Live</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowCreatePoll(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{ background: "var(--color-primary)" }}
                >
                  <Plus size={12} />
                  New
                </button>
                <button
                  onClick={() => setShowPolls(false)}
                  className="p-1 rounded-lg hover:bg-black/5 cursor-pointer transition-colors hidden sm:block"
                >
                  <X size={14} style={{ color: "var(--color-muted)" }} />
                </button>
              </div>
            </div>

            {/* Polls Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {isPollsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
                </div>
              ) : polls.length === 0 ? (
                <div className="text-center py-10 px-4 animate-fade-in">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 mx-auto mb-3">
                    <Vote size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">No Polls Yet</h3>
                  <p className="text-[11px] text-gray-500 mb-4">Be the first to start one!</p>
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    style={{ background: "var(--color-primary)" }}
                  >
                    + Create Poll
                  </button>
                </div>
              ) : (
                polls.map((poll) => (
                  <div
                    key={poll.id}
                    className="bg-white rounded-2xl p-3.5 border border-amber-900/10 shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-bold text-gray-900 leading-snug">{poll.question}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          by <span className="font-semibold text-amber-900/70">@{poll.creator_handle}</span> · {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
                        </p>
                      </div>
                      {poll.voted_option_id && (
                        <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={10} /> Voted
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 mt-2.5">
                      {poll.options.map((option) => {
                        const isVoted = poll.voted_option_id === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handlePollVote(poll.id, option.id)}
                            className={`w-full relative overflow-hidden p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                              isVoted
                                ? "border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                                : "border-gray-200 hover:border-amber-400/50 bg-gray-50/50"
                            }`}
                          >
                            <div
                              className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out ${
                                isVoted
                                  ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20"
                                  : "bg-amber-100/50"
                              }`}
                              style={{ width: `${option.percentage}%` }}
                            />
                            <div className="relative z-10 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isVoted
                                      ? "bg-amber-600 border-amber-600 text-white"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isVoted && <Check size={8} strokeWidth={3} />}
                                </div>
                                <span className={`text-[11px] font-semibold truncate ${isVoted ? "text-amber-950 font-bold" : "text-gray-800"}`}>
                                  {option.text}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[11px] font-bold text-gray-700">{option.percentage}%</span>
                                <span className="text-[9px] text-gray-400">({option.votes})</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create Poll Inline Form (bottom sheet style inside panel) */}
            {showCreatePoll && (
              <div className="border-t p-3.5 shrink-0 animate-slide-up" style={{ borderColor: "var(--color-border)", background: "white" }}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <BarChart2 size={14} style={{ color: "var(--color-primary)" }} />
                    <span className="text-xs font-bold text-gray-900">New Poll</span>
                  </div>
                  <button
                    onClick={() => setShowCreatePoll(false)}
                    className="p-1 rounded-full hover:bg-black/5 text-gray-400 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Quick Templates */}
                <div className="flex gap-1.5 mb-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {POLL_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setPollQuestion(tmpl.question); setPollOptions(tmpl.options); }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 text-amber-900 border border-amber-900/10 transition-all whitespace-nowrap cursor-pointer shrink-0"
                    >
                      {tmpl.question.split(" ").slice(0, 3).join(" ")}…
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCreatePoll} className="space-y-2">
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    required
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        required
                        className="flex-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                      className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={10} /> Add Option
                    </button>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCreatePoll(false)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPollSubmitting}
                      className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {isPollSubmitting ? "Creating..." : "Publish"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Emoji Toolbar & Input */}
      <div
        className="px-4 py-2.5 shrink-0 space-y-2"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        {/* Quick Emojis strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5" style={{ scrollbarWidth: "none" }}>
          {["👋", "☕", "🍕", "🔥", "❤️", "👍", "🎉", "😄"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => setInput((prev) => prev + emoji)}
              className="px-2 py-1 rounded-lg text-xs hover:bg-amber-500/10 transition-transform active:scale-90 cursor-pointer border border-transparent hover:border-amber-500/20"
              title={`Add ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Say something to the room..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/30"
            style={{
              background: "var(--color-bg)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 rounded-full transition-all duration-200 cursor-pointer disabled:opacity-40 hover:scale-105 active:scale-95 shadow-sm"
            style={{ background: "var(--color-primary)", color: "var(--color-surface)" }}
          >
            <Send size={16} className="transform transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Profile Card Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col animate-slide-up transform transition-all">
            {/* Header / Cover color */}
            <div className="h-20 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 relative flex justify-end p-3">
              <button 
                onClick={() => setSelectedProfile(null)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white cursor-pointer transition-all hover:rotate-90 duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-6 pb-6 pt-0 flex-1 relative">
              <div className="flex justify-between items-end -mt-10 mb-4">
                <img 
                  src={selectedProfile.profile_photo || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(selectedProfile.username || selectedProfile.display_name)}`} 
                  alt="" 
                  className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-amber-50" 
                />
                
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
