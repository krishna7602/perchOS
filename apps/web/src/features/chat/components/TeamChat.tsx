"use client";

import { useState, useEffect, useRef } from "react";
import { getTeamChannels, getTeamMessages, sendTeamMessage, createTeamChannel } from "@/features/chat/api";
import { listVenues } from "@/features/venues/api";
import { getStaffList } from "@/features/staff/api";
import { Send, Hash, Users, MessageSquare, Plus, X } from "lucide-react";

export function TeamChat() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState("");
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [userRole, setUserRole] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelPublic, setNewChannelPublic] = useState(false);
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Branches or Determine Current Branch
  useEffect(() => {
    const token = localStorage.getItem("perch_admin_token") || "";
    if (!token) return;

    try {
      const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(payloadBase64));
      if (payload.role) setUserRole(payload.role);
      
      if (payload.branch_id) {
        // Chef/Staff: Lock to their specific branch
        setSelectedBranch(payload.branch_id);
        setBranches([{ id: payload.branch_id, name: "My Branch" }]);
      } else {
        // Owner/SuperAdmin: Fetch all venues to pick from
        listVenues(token).then((res) => {
          setBranches(res.venues || []);
          if (res.venues && res.venues.length > 0) {
            const defaultBranch = String(res.venues[0]._id || res.venues[0].id);
            setSelectedBranch(defaultBranch);
          }
        }).catch(console.error);
      }
    } catch (e) {
      console.error("Failed to decode token", e);
    }
  }, []);

  // 2. Fetch Channels and Staff when Branch changes
  useEffect(() => {
    if (!selectedBranch) return;
    const token = localStorage.getItem("perch_admin_token") || "";
    getTeamChannels(selectedBranch, token).then(res => {
      setChannels(res.channels || []);
      if (res.channels && res.channels.length > 0 && !activeChannel) {
        setActiveChannel(res.channels[0].id);
      }
    });

    if (userRole === "owner" || userRole === "super_admin" || userRole === "manager") {
      getStaffList(selectedBranch, token).then(res => {
        setStaffList(res.staff || []);
      });
    }
  }, [selectedBranch, userRole]);

  // 3. HTTP Polling for Messages (MVP)
  useEffect(() => {
    if (!activeChannel) return;
    
    let isMounted = true;
    
    const fetchMsgs = async () => {
      const token = localStorage.getItem("perch_admin_token") || "";
      try {
        const res = await getTeamMessages(activeChannel, token);
        if (isMounted) {
          setMessages(res.messages || []);
        }
      } catch (e) {
        console.error("Failed to fetch messages");
      }
    };

    fetchMsgs();
    const intervalId = setInterval(fetchMsgs, 3000); // Poll every 3 seconds
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeChannel]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    
    const msg = newMessage;
    setNewMessage(""); // Optimistic clear
    
    try {
      const token = localStorage.getItem("perch_admin_token") || "";
      await sendTeamMessage(activeChannel, msg, token);
      // Fetch immediately to show the new message
      const res = await getTeamMessages(activeChannel, token);
      setMessages(res.messages || []);
    } catch (e) {
      alert("Failed to send message");
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !selectedBranch) return;
    const token = localStorage.getItem("perch_admin_token") || "";
    try {
      const res = await createTeamChannel(
        selectedBranch,
        newChannelName,
        newChannelPublic,
        newChannelMembers,
        token,
        newChannelDesc
      );
      // Refresh channels
      const chRes = await getTeamChannels(selectedBranch, token);
      setChannels(chRes.channels || []);
      setActiveChannel(res.channel_id);
      setShowCreateModal(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setNewChannelMembers([]);
    } catch (err) {
      alert("Failed to create channel");
    }
  };

  const canCreateChannels = ["owner", "super_admin", "manager"].includes(userRole);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Sidebar: Channels */}
      <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 border-b border-gray-100">
          <select 
            value={selectedBranch} 
            onChange={e => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm border outline-none bg-white shadow-sm"
          >
            {branches.map(b => (
              <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Channels</h3>
            {canCreateChannels && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="text-gray-400 hover:text-[var(--color-primary)] transition-colors p-1"
                title="Create Channel"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {channels.map(ch => (
              <li key={ch.id}>
                <button
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                    activeChannel === ch.id 
                      ? "bg-[rgba(139,94,60,0.1)] text-[var(--color-primary)] font-medium" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Hash size={16} />
                  {ch.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {channels.find(c => c.id === activeChannel)?.name || "Select a channel"}
              </h2>
              <p className="text-xs text-gray-500">Team communication</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users size={18} />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>No messages in this channel yet.</p>
              <p className="text-sm">Be the first to say hello!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showHeader = !prev || prev.sender_id !== m.sender_id;
                
                return (
                  <div key={m.id} className={`flex flex-col ${showHeader ? 'mt-6' : 'mt-1'}`}>
                    {showHeader && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                          {m.sender_name}
                          {m.sender_role && (
                            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {m.sender_role.replace("_", " ")}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className="text-sm text-gray-700 bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-none self-start shadow-sm max-w-[80%] break-words">
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name || 'channel'}`}
              className="w-full pl-4 pr-12 py-3 rounded-2xl border outline-none bg-gray-50 focus:bg-white focus:border-[var(--color-primary)] transition-colors text-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 relative">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-1 text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>Create Channel</h2>
            <p className="text-sm text-gray-500 mb-6">Create a new space for your team to communicate.</p>
            
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Channel Name *</label>
                <input
                  type="text"
                  required
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                  placeholder="e.g. kitchen-staff"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Description</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={e => setNewChannelDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                  placeholder="What is this channel about?"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={newChannelPublic}
                  onChange={e => {
                    setNewChannelPublic(e.target.checked);
                    if (e.target.checked) setNewChannelMembers([]);
                  }}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="is_public" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Make Public (All staff can join)
                </label>
              </div>

              {!newChannelPublic && staffList.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Invite Members</label>
                  <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2 space-y-1">
                    {staffList.map((staff: any) => (
                      <label key={staff._id || staff.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newChannelMembers.includes(staff._id || staff.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewChannelMembers(prev => [...prev, staff._id || staff.id]);
                            } else {
                              setNewChannelMembers(prev => prev.filter(id => id !== (staff._id || staff.id)));
                            }
                          }}
                          className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                          <span className="text-xs text-gray-500 uppercase tracking-wider">{staff.role}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim()}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
