"use client";

import { Check, CheckCircle2 } from "lucide-react";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollData {
  id: string;
  question: string;
  creator_handle: string;
  created_at: string;
  total_votes: number;
  options: PollOption[];
  voted_option_id: string | null;
}

interface PollMessageCardProps {
  poll: PollData;
  onVote: (pollId: string, optionId: string) => void;
}

export function PollMessageCard({ poll, onVote }: PollMessageCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-900/10 shadow-xs hover:shadow-sm transition-all my-2">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900 leading-snug">{poll.question}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Asked by <span className="font-semibold text-amber-900/70">@{poll.creator_handle}</span> · {poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"}
          </p>
        </div>
        {poll.voted_option_id && (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 size={11} /> Voted
          </span>
        )}
      </div>

      <div className="space-y-2 mt-3">
        {poll.options.map((option) => {
          const isVoted = poll.voted_option_id === option.id;

          return (
            <button
              key={option.id}
              onClick={() => onVote(poll.id, option.id)}
              className={`w-full relative overflow-hidden p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                isVoted
                  ? "border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
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
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isVoted
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isVoted && <Check size={9} strokeWidth={3} />}
                  </div>
                  <span className={`text-xs truncate ${isVoted ? "text-amber-950 font-bold" : "text-gray-800"}`}>
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-gray-700">{option.percentage}%</span>
                  <span className="text-[10px] text-gray-400">({option.votes})</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
