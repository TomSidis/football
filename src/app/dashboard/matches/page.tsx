"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";
import DashboardNav from "@/components/dashboard/DashboardNav";

interface Match {
  id: string;
  opponent: string;
  kickoff_at: string;
  location: string;
  pre_goals_set: boolean;
  post_review_done: boolean;
}

interface MatchGoal {
  id: string;
  match_id: string;
  goal_type: "process" | "outcome";
  description: string;
  achieved: boolean | null;
}

export default function MatchesPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ full_name: string; role_model_name: string; position: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<Record<string, MatchGoal[]>>({});
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState<Match | null>(null);
  const [newMatch, setNewMatch] = useState({ opponent: "", kickoff_at: "", location: "" });
  const [processGoals, setProcessGoals] = useState(["", ""]);
  const [outcomeGoal, setOutcomeGoal] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      loadMatches(user.id);
    });
  }, []);

  async function loadMatches(uid: string) {
    const { data } = await supabase
      .from("matches")
      .select("*")
      .eq("user_id", uid)
      .order("kickoff_at", { ascending: true });
    setMatches(data ?? []);

    if (data) {
      for (const match of data) {
        const { data: mg } = await supabase.from("match_goals").select("*").eq("match_id", match.id);
        if (mg) setGoals((prev) => ({ ...prev, [match.id]: mg }));
      }
    }
  }

  async function createMatch() {
    const { data } = await supabase
      .from("matches")
      .insert({ user_id: userId, ...newMatch })
      .select()
      .single();
    if (data) {
      setMatches((prev) => [...prev, data]);
      setShowNewMatch(false);
      setNewMatch({ opponent: "", kickoff_at: "", location: "" });
    }
  }

  async function saveGoals(match: Match) {
    if (processGoals[0].trim() && processGoals[1].trim() && outcomeGoal.trim()) {
      const inserts = [
        { match_id: match.id, user_id: userId, goal_type: "process", description: processGoals[0] },
        { match_id: match.id, user_id: userId, goal_type: "process", description: processGoals[1] },
        { match_id: match.id, user_id: userId, goal_type: "outcome", description: outcomeGoal },
      ];
      const { data } = await supabase.from("match_goals").insert(inserts).select();
      if (data) {
        setGoals((prev) => ({ ...prev, [match.id]: data }));
        await supabase.from("matches").update({ pre_goals_set: true }).eq("id", match.id);
        setMatches((prev) => prev.map((m) => m.id === match.id ? { ...m, pre_goals_set: true } : m));
      }
      setShowGoalsModal(null);
      setProcessGoals(["", ""]);
      setOutcomeGoal("");
    }
  }

  async function toggleGoalAchieved(goalId: string, matchId: string, achieved: boolean) {
    await supabase.from("match_goals").update({ achieved }).eq("id", goalId);
    setGoals((prev) => ({
      ...prev,
      [matchId]: prev[matchId].map((g) => g.id === goalId ? { ...g, achieved } : g),
    }));
  }

  async function completeReview(matchId: string) {
    await supabase.from("matches").update({ post_review_done: true }).eq("id", matchId);
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, post_review_done: true } : m));
  }

  const now = new Date();

  return (
    <div className="stadium-bg min-h-screen pb-24">
      {profile && <DashboardNav profile={profile} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">{HEBREW.matchTitle}</h1>
          <button
            onClick={() => setShowNewMatch(true)}
            className="bg-gradient-to-l from-cyan-500 to-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:opacity-90"
          >
            + משחק חדש
          </button>
        </div>

        {matches.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-5xl mb-4">⚽</div>
            <p className="text-white/50">עדיין לא נקבעו משחקים</p>
            <button onClick={() => setShowNewMatch(true)} className="text-cyan-400 text-sm mt-2 hover:underline">+ הוסף משחק ראשון</button>
          </div>
        )}

        <div className="space-y-4">
          {matches.map((match) => {
            const kickoff = new Date(match.kickoff_at);
            const isPast = kickoff < now;
            const hoursUntil = (kickoff.getTime() - now.getTime()) / (1000 * 60 * 60);
            const needsPreGoals = !match.pre_goals_set && hoursUntil <= 24 && hoursUntil > 0;
            const needsReview = isPast && match.pre_goals_set && !match.post_review_done;
            const matchGoals = goals[match.id] ?? [];

            return (
              <div key={match.id} className={`glass rounded-3xl p-5 space-y-4 border ${
                needsPreGoals ? "border-amber-500/50" : needsReview ? "border-cyan-500/50" : "border-white/5"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-lg">נגד: {match.opponent || "יריב"}</h3>
                    <p className="text-white/50 text-sm">
                      {kickoff.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                      {" • "}
                      {kickoff.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {match.location && <p className="text-white/30 text-xs mt-0.5">📍 {match.location}</p>}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                    isPast ? "bg-white/10 text-white/40" :
                    needsPreGoals ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    "bg-green-500/20 text-green-400 border border-green-500/30"
                  }`}>
                    {isPast ? "הסתיים" : needsPreGoals ? "⚡ הגדר מטרות!" : "קרוב"}
                  </span>
                </div>

                {/* Pre-match goals prompt */}
                {needsPreGoals && (
                  <button
                    onClick={() => setShowGoalsModal(match)}
                    className="w-full bg-amber-500/20 border border-amber-500/40 rounded-2xl py-3 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-colors"
                  >
                    ⚡ {HEBREW.preMatchGoals} (נדרש לפני המשחק!)
                  </button>
                )}

                {/* Goals display */}
                {matchGoals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wide">מטרות למשחק</p>
                    {matchGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          goal.goal_type === "process" ? "bg-cyan-500/20 text-cyan-400" : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {goal.goal_type === "process" ? HEBREW.processGoal : HEBREW.outcomeGoal}
                        </span>
                        <p className="flex-1 text-sm">{goal.description}</p>
                        {isPast && (
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => toggleGoalAchieved(goal.id, match.id, true)}
                              className={`text-xs px-2 py-1 rounded-lg transition-colors ${goal.achieved === true ? "bg-green-500/40 text-green-300" : "bg-white/5 text-white/30 hover:bg-green-500/20"}`}>✓</button>
                            <button onClick={() => toggleGoalAchieved(goal.id, match.id, false)}
                              className={`text-xs px-2 py-1 rounded-lg transition-colors ${goal.achieved === false ? "bg-red-500/40 text-red-300" : "bg-white/5 text-white/30 hover:bg-red-500/20"}`}>✗</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Post-match review */}
                {needsReview && (
                  <button onClick={() => completeReview(match.id)}
                    className="w-full bg-cyan-500/20 border border-cyan-500/40 rounded-2xl py-3 text-cyan-300 font-bold text-sm hover:bg-cyan-500/30 transition-colors">
                    📊 {HEBREW.submitReview}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New match modal */}
      {showNewMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewMatch(false)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="font-black">משחק חדש</h3>
            <input type="text" placeholder="שם היריב" value={newMatch.opponent}
              onChange={(e) => setNewMatch({ ...newMatch, opponent: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm" />
            <input type="datetime-local" value={newMatch.kickoff_at}
              onChange={(e) => setNewMatch({ ...newMatch, kickoff_at: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/60 text-sm" />
            <input type="text" placeholder="מיקום (אופציונלי)" value={newMatch.location}
              onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowNewMatch(false)} className="flex-1 glass border border-white/10 rounded-xl py-3 text-sm">{HEBREW.back}</button>
              <button onClick={createMatch} className="flex-1 bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold rounded-xl py-3 text-sm hover:opacity-90">{HEBREW.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-match goals modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGoalsModal(null)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="font-black">{HEBREW.preMatchGoals}</h3>
            <p className="text-xs text-white/40">הגדר בדיוק 2 מטרות תהליך + 1 מטרת תוצאה</p>

            <div className="space-y-2">
              <p className="text-cyan-400 text-xs font-bold">{HEBREW.processGoal} (×2)</p>
              <input type="text" value={processGoals[0]}
                onChange={(e) => setProcessGoals([e.target.value, processGoals[1]])}
                placeholder={HEBREW.processGoalHint}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm" />
              <input type="text" value={processGoals[1]}
                onChange={(e) => setProcessGoals([processGoals[0], e.target.value])}
                placeholder="מטרת תהליך שניה..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm" />
            </div>

            <div className="space-y-2">
              <p className="text-purple-400 text-xs font-bold">{HEBREW.outcomeGoal} (×1)</p>
              <input type="text" value={outcomeGoal}
                onChange={(e) => setOutcomeGoal(e.target.value)}
                placeholder={HEBREW.outcomeGoalHint}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowGoalsModal(null)} className="flex-1 glass border border-white/10 rounded-xl py-3 text-sm">{HEBREW.back}</button>
              <button onClick={() => saveGoals(showGoalsModal)}
                disabled={!processGoals[0].trim() || !processGoals[1].trim() || !outcomeGoal.trim()}
                className="flex-1 bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold rounded-xl py-3 text-sm hover:opacity-90 disabled:opacity-40">
                {HEBREW.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
