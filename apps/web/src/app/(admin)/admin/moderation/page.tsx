"use client";

import { Shield, AlertTriangle, MessageSquareOff, Settings2, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function ModerationPage() {
  const [isChatEnabled, setIsChatEnabled] = useState(true);
  const [keywordFilter, setKeywordFilter] = useState("profanity, spam");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Moderation settings saved! (Simulated)");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(139, 94, 60, 0.1)" }}>
            <Shield size={24} style={{ color: "var(--color-primary)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>Chat Moderation</h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>Control and monitor your venue's live chat room.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
        
        {/* Left Column: Controls */}
        <div className="space-y-6">
          <form onSubmit={handleSave} className="p-6 rounded-2xl space-y-6" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="text-lg font-bold flex items-center gap-2"><Settings2 size={18} /> Room Controls</h2>
            
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <div>
                <p className="font-semibold text-sm">Enable Live Chat</p>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>Allow guests to chat with each other.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isChatEnabled} onChange={() => setIsChatEnabled(!isChatEnabled)} />
                <div className="w-11 h-6 bg-black/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Restricted Keywords</label>
              <textarea 
                value={keywordFilter}
                onChange={e => setKeywordFilter(e.target.value)}
                rows={3} 
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none" 
                placeholder="Comma separated words..." 
              />
              <p className="text-xs mt-2" style={{ color: "var(--color-muted)" }}>Messages containing these words will be automatically rejected by the AI moderator.</p>
            </div>

            <Button type="submit" variant="primary">Save Controls</Button>
          </form>

          {/* Active Protections */}
          <div className="p-6 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-semibold mb-4">Active Protections</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-medium">Message Length Limit</p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>Messages &gt; 2000 chars are rejected.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-medium">DM Permission Gate</p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>Direct messages require recipient approval.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Monitor Placeholder */}
        <div className="p-6 rounded-2xl flex flex-col h-[500px]" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-sm font-bold flex items-center gap-2"><Users size={16} /> Live Monitor</h2>
            <span className="flex items-center gap-1 text-xs font-medium text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Active
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
            <MessageSquareOff size={32} />
            <div>
              <p className="text-sm font-semibold">Live Feed coming soon</p>
              <p className="text-xs max-w-[200px] mx-auto mt-1" style={{ color: "var(--color-muted)" }}>
                You will be able to monitor messages in real-time and delete them instantly.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
