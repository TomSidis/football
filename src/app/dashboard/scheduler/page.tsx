"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";
import DashboardNav from "@/components/dashboard/DashboardNav";

// ─── Types ────────────────────────────────────────────────────
interface ScheduleSession {
  id: string;
  date: string;         // YYYY-MM-DD
  start_time: string;   // HH:mm
  duration_minutes: number;
  session_type: string;
  status: "pending" | "completed" | "missed";
  missed_reason?: string;
}

interface ScheduleData { sessions: ScheduleSession[]; }

interface MatrixPercentages {
  [type: string]: number;
  total_minutes: number;
}

// ─── Constants ────────────────────────────────────────────────
const SESSION_TYPES = [
  { value: "team_training",     label: HEBREW.sessionTypes.team_training,     color: "#00e5ff", icon: "👥" },
  { value: "technical_training",label: HEBREW.sessionTypes.technical_training, color: "#7b2ff7", icon: "⚡" },
  { value: "athletic_training", label: HEBREW.sessionTypes.athletic_training,  color: "#2ed573", icon: "💪" },
  { value: "recovery",          label: HEBREW.sessionTypes.recovery,           color: "#ffa502", icon: "🧊" },
  { value: "match",             label: HEBREW.sessionTypes.match,              color: "#ff4757", icon: "⚽" },
];

const DURATIONS = [30, 60, 90, 120];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MISSED_REASONS = [
  { value: "injury",  label: "פציעה",   icon: "🤕" },
  { value: "school",  label: "בית ספר", icon: "📚" },
  { value: "fatigue", label: "עייפות",  icon: "😴" },
  { value: "other",   label: "אחר",     icon: "📌" },
];

// ─── Helpers ──────────────────────────────────────────────────
function getWeekDates(): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function computeMatrix(sessions: ScheduleSession[]): MatrixPercentages {
  const total = sessions.reduce((s, sess) => s + sess.duration_minutes, 0);
  if (total === 0) return { total_minutes: 0 };
  const matrix: MatrixPercentages = { total_minutes: total };
  for (const type of SESSION_TYPES.map((t) => t.value)) {
    const sum = sessions.filter((s) => s.session_type === type).reduce((a, s) => a + s.duration_minutes, 0);
    if (sum > 0) matrix[type] = Math.round((sum / total) * 100);
  }
  return matrix;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Sub-components ───────────────────────────────────────────
function MatrixBar({ matrix }: { matrix: MatrixPercentages }) {
  if (matrix.total_minutes === 0) {
    return (
      <div className="glass rounded-2xl p-4 text-center text-white/30 text-sm">
        הוסף אימונים לצפייה בניתוח
      </div>
    );
  }

  const totalHours = (matrix.total_minutes / 60).toFixed(1);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <span>📊</span> מטריצת אימונים
        </h3>
        <span className="text-gradient font-black text-lg">{totalHours}h</span>
      </div>

      {/* Stacked bar */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {SESSION_TYPES.map((t) => {
          const pct = matrix[t.value] ?? 0;
          return pct > 0 ? (
            <div
              key={t.value}
              className="h-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: t.color }}
              title={`${t.label}: ${pct}%`}
            />
          ) : null;
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {SESSION_TYPES.map((t) => {
          const pct = matrix[t.value] ?? 0;
          return (
            <div key={t.value} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <span className="text-xs text-white/60 flex-1 truncate">{t.label}</span>
              <span className="text-xs font-black" style={{ color: pct > 0 ? t.color : "rgba(255,255,255,0.2)" }}>
                {pct > 0 ? `${pct}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionCard({
  session, isToday, locked,
  onCheck, onDelete,
}: {
  session: ScheduleSession; isToday: boolean; locked: boolean;
  onCheck: (id: string, status: "completed" | "missed") => void;
  onDelete: (id: string) => void;
}) {
  const type = SESSION_TYPES.find((t) => t.value === session.session_type)!;
  const statusStyle = {
    pending:   "border-white/10 bg-white/5",
    completed: "border-green-500/30 bg-green-500/10",
    missed:    "border-red-500/30 bg-red-500/10",
  }[session.status];

  const isAmber = isToday && session.status === "pending";

  return (
    <div className={`border rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all ${statusStyle} ${isAmber ? "animate-pulse border-amber-500/50 bg-amber-500/10" : ""}`}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
        style={{ background: type.color + "20", color: type.color }}
      >
        {type.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate" style={{ color: type.color }}>{type.label}</p>
        <p className="text-white/40 text-[10px]">{session.start_time} · {session.duration_minutes} דק'</p>
      </div>

      {/* Status / actions */}
      {session.status === "completed" && <span className="text-green-400 text-xs shrink-0 font-bold">✓</span>}
      {session.status === "missed"    && <span className="text-red-400 text-xs shrink-0 font-bold">✗</span>}
      {isToday && session.status === "pending" && (
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onCheck(session.id, "completed")}
            className="w-7 h-7 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm hover:bg-green-500/40 transition-colors flex items-center justify-center font-bold"
          >V</button>
          <button
            onClick={() => onCheck(session.id, "missed")}
            className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/40 transition-colors flex items-center justify-center font-bold"
          >X</button>
        </div>
      )}
      {!locked && session.status === "pending" && !isToday && (
        <button onClick={() => onDelete(session.id)} className="text-white/20 hover:text-red-400 transition-colors text-lg leading-none ml-1">×</button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function SchedulerPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<{ full_name: string; role_model_name: string; position: string } | null>(null);
  const [userId,      setUserId]      = useState("");
  const [scheduleId,  setScheduleId]  = useState<string | null>(null);
  const [sessions,    setSessions]    = useState<ScheduleSession[]>([]);
  const [locked,      setLocked]      = useState(false);
  const [showAdd,     setShowAdd]     = useState<string | null>(null); // date string
  const [missedFor,   setMissedFor]   = useState<string | null>(null); // session id
  const [missedReason,setMissedReason]= useState("");
  const [savingLock,  setSavingLock]  = useState(false);

  const [newForm, setNewForm] = useState({
    start_time: "16:00", duration_minutes: 60, session_type: "team_training",
  });

  const weekDates = useMemo(getWeekDates, []);
  const weekStart = toDateStr(weekDates[0]);
  const today     = toDateStr(new Date());

  const matrix = useMemo(() => computeMatrix(sessions), [sessions]);

  // ── Load or create schedule ────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);

      const { data: existing } = await supabase
        .from("weekly_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .single();

      if (existing) {
        setScheduleId(existing.id);
        setLocked(!!existing.submitted_at);
        const data: ScheduleData = existing.schedule_data ?? { sessions: [] };
        setSessions(data.sessions ?? []);
      } else {
        const { data: created } = await supabase
          .from("weekly_schedules")
          .insert({
            user_id:       user.id,
            week_start:    weekStart,
            schedule_data: { sessions: [] },
            matrix_percentages: {},
          })
          .select()
          .single();
        if (created) setScheduleId(created.id);
      }
    });
  }, []);

  // ── Persist sessions to JSONB ──────────────────────────────
  const persistSessions = useCallback(async (next: ScheduleSession[]) => {
    if (!scheduleId) return;
    const mat = computeMatrix(next);
    await supabase
      .from("weekly_schedules")
      .update({ schedule_data: { sessions: next }, matrix_percentages: mat })
      .eq("id", scheduleId);
  }, [scheduleId]);

  // ── Add session ────────────────────────────────────────────
  function addSession() {
    if (!showAdd) return;
    const sess: ScheduleSession = {
      id: genId(),
      date: showAdd,
      start_time: newForm.start_time,
      duration_minutes: newForm.duration_minutes,
      session_type: newForm.session_type,
      status: "pending",
    };
    const next = [...sessions, sess].sort((a, b) =>
      a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)
    );
    setSessions(next);
    persistSessions(next);
    setShowAdd(null);
  }

  // ── Mark V/X ──────────────────────────────────────────────
  function handleCheck(id: string, status: "completed" | "missed") {
    if (status === "missed") { setMissedFor(id); return; }
    const next = sessions.map((s) => s.id === id ? { ...s, status } : s);
    setSessions(next);
    persistSessions(next);
  }

  function submitMissed() {
    if (!missedFor || !missedReason) return;
    const next = sessions.map((s) =>
      s.id === missedFor ? { ...s, status: "missed" as const, missed_reason: missedReason } : s
    );
    setSessions(next);
    persistSessions(next);
    setMissedFor(null);
    setMissedReason("");
  }

  // ── Delete ─────────────────────────────────────────────────
  function deleteSession(id: string) {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    persistSessions(next);
  }

  // ── Lock schedule ──────────────────────────────────────────
  async function lockSchedule() {
    if (!scheduleId) return;
    setSavingLock(true);
    await supabase
      .from("weekly_schedules")
      .update({ submitted_at: new Date().toISOString() })
      .eq("id", scheduleId);
    setLocked(true);
    setSavingLock(false);
  }

  const daySessions = (dateStr: string) =>
    sessions.filter((s) => s.date === dateStr).sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="stadium-bg min-h-screen pb-24">
      {profile && <DashboardNav profile={profile} />}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{HEBREW.schedulerTitle}</h1>
            <p className="text-white/40 text-xs mt-0.5">
              {weekDates[0].toLocaleDateString("he-IL", { day: "numeric", month: "long" })} —{" "}
              {weekDates[6].toLocaleDateString("he-IL", { day: "numeric", month: "long" })}
            </p>
          </div>
          {locked ? (
            <span className="glass border border-green-500/40 text-green-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
              🔒 נעול
            </span>
          ) : (
            <button
              onClick={lockSchedule}
              disabled={savingLock || sessions.length === 0}
              className="bg-gradient-to-l from-cyan-500 to-purple-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {savingLock ? "..." : HEBREW.lockSchedule}
            </button>
          )}
        </div>

        {/* Deadline warning */}
        {!locked && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-amber-300 text-xs flex items-center gap-2">
            <span>⚠️</span> {HEBREW.schedulerDeadline}
          </div>
        )}

        {/* Matrix */}
        <MatrixBar matrix={matrix} />

        {/* Calendar */}
        <div className="space-y-3">
          {weekDates.map((date) => {
            const dateStr  = toDateStr(date);
            const isToday  = dateStr === today;
            const isPast   = dateStr < today;
            const daySessl = daySessions(dateStr);
            const dayName  = DAY_NAMES[date.getDay()];

            return (
              <div
                key={dateStr}
                className={`glass rounded-2xl p-4 border transition-all ${
                  isToday ? "border-cyan-400/40" : "border-white/5"
                }`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-sm ${isToday ? "text-cyan-400" : isPast ? "text-white/30" : "text-white/80"}`}>
                      {dayName}
                    </span>
                    <span className="text-white/30 text-xs">
                      {date.toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                    </span>
                    {isToday && (
                      <span className="bg-cyan-400/20 text-cyan-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        היום
                      </span>
                    )}
                  </div>
                  {!locked && !isPast && (
                    <button
                      onClick={() => { setShowAdd(dateStr); setNewForm({ start_time: "16:00", duration_minutes: 60, session_type: "team_training" }); }}
                      className="w-7 h-7 rounded-lg glass border border-white/10 text-white/40 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors flex items-center justify-center text-xl leading-none"
                    >
                      +
                    </button>
                  )}
                </div>

                {daySessl.length === 0 ? (
                  <p className="text-white/15 text-xs text-center py-1">אין אימונים</p>
                ) : (
                  <div className="space-y-2">
                    {daySessl.map((s) => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        isToday={isToday}
                        locked={locked}
                        onCheck={handleCheck}
                        onDelete={deleteSession}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add session modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(null)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-3xl p-6 space-y-5">
            <h3 className="font-black text-lg">{HEBREW.addSession}</h3>

            {/* Session type grid */}
            <div>
              <p className="text-xs text-white/40 mb-2">סוג אימון</p>
              <div className="grid grid-cols-3 gap-2">
                {SESSION_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewForm((f) => ({ ...f, session_type: t.value }))}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-bold transition-all border ${
                      newForm.session_type === t.value
                        ? "text-white border-transparent"
                        : "glass border-white/10 text-white/40"
                    }`}
                    style={newForm.session_type === t.value
                      ? { backgroundColor: t.color + "25", borderColor: t.color + "50" }
                      : {}}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span style={newForm.session_type === t.value ? { color: t.color } : {}}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Time */}
            <div>
              <p className="text-xs text-white/40 mb-1.5">שעת התחלה</p>
              <input
                type="time"
                value={newForm.start_time}
                onChange={(e) => setNewForm((f) => ({ ...f, start_time: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400/60 text-sm"
              />
            </div>

            {/* Duration chips */}
            <div>
              <p className="text-xs text-white/40 mb-1.5">משך (דקות)</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setNewForm((f) => ({ ...f, duration_minutes: d }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      newForm.duration_minutes === d
                        ? "bg-gradient-to-l from-cyan-500 to-purple-600 text-white"
                        : "glass border border-white/10 text-white/60"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(null)} className="flex-1 glass border border-white/10 rounded-xl py-3 text-sm hover:bg-white/10">{HEBREW.back}</button>
              <button onClick={addSession} className="flex-1 bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold rounded-xl py-3 text-sm">{HEBREW.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* Missed reason modal */}
      {missedFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMissedFor(null)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="font-black text-red-400">❌ {HEBREW.missedReason}</h3>
            <div className="grid grid-cols-2 gap-2">
              {MISSED_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setMissedReason(r.value)}
                  className={`flex items-center gap-2 py-3 px-3 rounded-xl text-sm font-bold transition-all border ${
                    missedReason === r.value
                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                      : "glass border-white/10 text-white/60"
                  }`}
                >
                  <span>{r.icon}</span> {r.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMissedFor(null)} className="flex-1 glass border border-white/10 rounded-xl py-3 text-sm">{HEBREW.back}</button>
              <button
                onClick={submitMissed}
                disabled={!missedReason}
                className="flex-1 bg-red-500/80 hover:bg-red-500 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-40"
              >
                {HEBREW.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
