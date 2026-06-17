"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";

type Timeframe = "1_year" | "3_year" | "5_year";

interface GoalEntry {
  id: string;
  timeframe: Timeframe;
  goal_text: string;
}

interface Props {
  userId: string;
  onComplete: () => void;
}

const TABS: { id: Timeframe; label: string; icon: string; color: string }[] = [
  { id: "1_year", label: HEBREW.oneYear, icon: "📅", color: "from-green-500 to-emerald-600" },
  { id: "3_year", label: HEBREW.threeYears, icon: "🎯", color: "from-cyan-500 to-blue-600" },
  { id: "5_year", label: HEBREW.fiveYears, icon: "🚀", color: "from-purple-500 to-violet-600" },
];

export default function GoalBoard({ userId, onComplete }: Props) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Timeframe>("5_year");
  const [goals, setGoals] = useState<GoalEntry[]>([]);
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const tabGoals = goals.filter((g) => g.timeframe === activeTab);
  const totalGoals = goals.length;

  async function addGoal() {
    if (!inputText.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("long_goals")
      .insert({ user_id: userId, timeframe: activeTab, goal_text: inputText.trim() })
      .select()
      .single();

    if (!error && data) {
      setGoals((prev) => [...prev, data]);
      setInputText("");
    }
    setSaving(false);
  }

  function useInspiration(text: string) {
    setInputText(text);
  }

  function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    supabase.from("long_goals").delete().eq("id", id);
  }

  const canComplete = goals.filter((g) => g.timeframe === "1_year").length >= 1 &&
    goals.filter((g) => g.timeframe === "3_year").length >= 1 &&
    goals.filter((g) => g.timeframe === "5_year").length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-gradient mb-1">{HEBREW.goalsTitle}</h2>
        <p className="text-white/50 text-sm">{HEBREW.goalsSubtitle}</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((tab) => {
          const count = goals.filter((g) => g.timeframe === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative rounded-2xl p-3 text-center transition-all border ${
                activeTab === tab.id
                  ? "border-white/20 bg-white/10"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className="text-2xl mb-1">{tab.icon}</div>
              <div className="text-xs text-white/70 leading-snug">{tab.label}</div>
              {count > 0 && (
                <span className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br ${tab.color} text-white text-[10px] font-black flex items-center justify-center`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inspiration cards */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/40 mb-3">💡 כרטיסי השראה — לחץ כדי להשתמש:</p>
        <div className="flex flex-wrap gap-2">
          {HEBREW.inspirationCards.map((card) => (
            <button
              key={card}
              onClick={() => useInspiration(card)}
              className="glass border border-white/10 rounded-xl px-3 py-1.5 text-xs hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
            >
              {card}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="glass rounded-3xl p-6 space-y-3">
        <h3 className="font-bold text-sm text-white/70 flex items-center gap-2">
          <span>{TABS.find((t) => t.id === activeTab)?.icon}</span>
          {TABS.find((t) => t.id === activeTab)?.label}
        </h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addGoal(); } }}
          placeholder={HEBREW.goalPlaceholder}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 resize-none text-sm"
        />
        <button
          onClick={addGoal}
          disabled={saving || !inputText.trim()}
          className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <span>+</span> {saving ? "..." : HEBREW.addGoal}
        </button>
      </div>

      {/* Goals list for active tab */}
      {tabGoals.length > 0 && (
        <div className="space-y-2">
          {tabGoals.map((g, i) => (
            <div key={g.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3 group">
              <span className="text-white/30 text-sm w-5 shrink-0 text-center">{i + 1}</span>
              <p className="flex-1 text-sm">{g.goal_text}</p>
              <button
                onClick={() => removeGoal(g.id)}
                className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {TABS.map((tab) => {
          const count = goals.filter((g) => g.timeframe === tab.id).length;
          return (
            <div key={tab.id} className={`rounded-xl p-2 ${count > 0 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-white/5 text-white/30"}`}>
              {tab.icon} {count > 0 ? `${count} מטרות` : "ריק"}
            </div>
          );
        })}
      </div>

      {!canComplete && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-sm text-center">
          הגדר לפחות מטרה אחת בכל אחד מ-3 טווחי הזמן
        </div>
      )}

      <button
        onClick={() => { setSubmitting(true); onComplete(); }}
        disabled={!canComplete || submitting}
        className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 text-lg"
      >
        {submitting ? "..." : "🚀 סיים את ההגדרה"}
      </button>
    </div>
  );
}
