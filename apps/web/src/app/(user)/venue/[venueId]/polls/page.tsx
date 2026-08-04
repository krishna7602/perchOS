"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVenuePolls, createVenuePoll, voteVenuePoll } from "@/lib/api";
import { Loader } from "@/components/ui/Loader";
import { Vote, Plus, Check, Sparkles, ArrowLeft, X, BarChart2, CheckCircle2 } from "lucide-react";

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

export default function VenuePollsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.venueId as string;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const chatToken = typeof window !== "undefined" ? sessionStorage.getItem("perch_chat_token") || "" : "";

  const fetchPolls = async () => {
    if (!venueId || !chatToken) return;
    try {
      const data = await getVenuePolls(venueId, chatToken);
      setPolls(data.polls || []);
    } catch (err) {
      console.error("Error fetching polls", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
    const interval = setInterval(fetchPolls, 4000);
    return () => clearInterval(interval);
  }, [venueId, chatToken]);

  const handleVote = async (pollId: string, optionId: string) => {
    if (!chatToken) return;
    // Optimistic UI update
    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id !== pollId) return poll;
        const newTotal = poll.voted_option_id ? poll.total_votes : poll.total_votes + 1;
        const updatedOptions = poll.options.map((opt) => {
          let count = opt.votes;
          if (poll.voted_option_id === opt.id) count -= 1;
          if (opt.id === optionId) count += 1;
          return {
            ...opt,
            votes: count,
            percentage: newTotal > 0 ? round((count / newTotal) * 100, 1) : 0,
          };
        });
        return {
          ...poll,
          voted_option_id: optionId,
          total_votes: newTotal,
          options: updatedOptions,
        };
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
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) {
      alert("Please provide a question and at least 2 options.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createVenuePoll(venueId, question.trim(), validOptions, chatToken);
      setQuestion("");
      setOptions(["", ""]);
      setShowCreateModal(false);
      fetchPolls();
    } catch (err) {
      alert("Failed to create poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const round = (num: number, decimals: number) => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  const PRESET_TEMPLATES = [
    { question: "🎵 What song style should we play next?", options: ["Chill Lofi Beats 🎧", "Acoustic Pop 🎸", "Upbeat House 🕺"] },
    { question: "☕ Best drink for this weather?", options: ["Iced Spanish Latte ❄️", "Hot Caramel Macchiato ☕", "Matcha Lemonade 🍵"] },
    { question: "🎲 Anyone down for board games?", options: ["Yes! Count me in 🙋", "Maybe later ⌛", "Just relaxing 📖"] },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Loading venue polls..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-4 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/venue/${venueId}/chat`)}
              className="p-2 rounded-xl hover:bg-black/5 cursor-pointer transition-colors"
            >
              <ArrowLeft size={18} style={{ color: "var(--color-muted)" }} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}
                >
                  Venue Polls
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/20">
                  Live 📊
                </span>
              </div>
              <p className="text-xs text-gray-500">Vote & see what fellow patrons are thinking</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer text-white"
            style={{ background: "var(--color-primary)" }}
          >
            <Plus size={16} />
            Create Poll
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {polls.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border border-amber-900/10 shadow-xs animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 mx-auto mb-4">
              <Vote size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">No Active Polls Yet</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
              Be the first to start a conversation! Create a poll to ask about music, drinks, or games.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              style={{ background: "var(--color-primary)" }}
            >
              + Create First Poll
            </button>
          </div>
        ) : (
          polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-white rounded-3xl p-5 border border-amber-900/10 shadow-xs hover:shadow-md transition-all animate-slide-up"
            >
              {/* Poll Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-snug">{poll.question}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Asked by <span className="font-semibold text-amber-900/70">@{poll.creator_handle}</span> · {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
                  </p>
                </div>
                {poll.voted_option_id && (
                  <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 size={12} /> Voted
                  </span>
                )}
              </div>

              {/* Poll Options */}
              <div className="space-y-2.5 mt-4">
                {poll.options.map((option) => {
                  const isVoted = poll.voted_option_id === option.id;

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleVote(poll.id, option.id)}
                      className={`w-full relative overflow-hidden p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                        isVoted
                          ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                          : "border-gray-200 hover:border-amber-400/50 bg-gray-50/50"
                      }`}
                    >
                      {/* Background Percentage Bar */}
                      <div
                        className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ease-out ${
                          isVoted
                            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20"
                            : "bg-amber-100/50"
                        }`}
                        style={{ width: `${option.percentage}%` }}
                      />

                      {/* Content */}
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isVoted
                                ? "bg-amber-600 border-amber-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isVoted && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span className={`text-xs font-semibold truncate ${isVoted ? "text-amber-950 font-bold" : "text-gray-800"}`}>
                            {option.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-gray-700">{option.percentage}%</span>
                          <span className="text-[10px] text-gray-400">({option.votes})</span>
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

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
                  <BarChart2 size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Create a Poll</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Preset Templates */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Quick Templates</span>
              <div className="flex flex-col gap-1.5">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuestion(tmpl.question);
                      setOptions(tmpl.options);
                    }}
                    className="text-left text-xs p-2 rounded-xl bg-amber-50/50 hover:bg-amber-100/50 text-amber-900 border border-amber-900/10 transition-all truncate cursor-pointer"
                  >
                    {tmpl.question}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What song should we play next?"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Options</label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = e.target.value;
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      required
                      className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setOptions([...options, ""])}
                    className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Plus size={14} /> Add Option
                  </button>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--color-primary)" }}
                >
                  {isSubmitting ? "Creating..." : "Publish Poll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
