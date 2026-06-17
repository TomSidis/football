"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";

interface Achievement {
  id: string;
  achievement_text: string;
  date_logged: string;
  category: string;
}

interface Props { userId: string; onComplete: () => void; }

const CATEGORIES = [
  { value: "goal",       label: "שער",        icon: "⚽", color: "#00e5ff" },
  { value: "tournament", label: "טורניר",      icon: "🏆", color: "#ffd700" },
  { value: "personal",   label: "אישי",        icon: "⭐", color: "#7b2ff7" },
  { value: "team",       label: "קבוצתי",      icon: "🤝", color: "#2ed573" },
  { value: "award",      label: "פרס/הכרה",   icon: "🎖️", color: "#ff6b6b" },
];

const EXAMPLES = [
  "כבשתי 3 שערים במשחק אחד",
  "הצטרפתי לנבחרת העיר",
  "שיפרתי את זמן הספרינט ל-30 מטר",
  "נבחרתי לשחקן המשחק",
  "אימנתי 5 ימים ברצף",
  "שיפרתי את הרגל החלשה",
  "הקבוצה שלי זכתה בגביע",
  "עברתי מבחן כדורגל במועדון",
];

export default function AchievementList({ userId, onComplete }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState<Achievement[]>([]);
  const [form, setForm] = useState({ text: "", date: "", category: "personal" });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canComplete = items.length >= 10;
  const remaining   = Math.max(0, 10 - items.length);

  async function addItem() {
    if (!form.text.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("achievements")
      .insert({
        user_id:          userId,
        player_id:        userId,
        achievement_text: form.text.trim(),
        title:            form.text.trim(),
        date_logged:      form.date || null,
        achieved_at:      form.date || null,
        category:         form.category,
      })
      .select()
      .single();

    if (!error && data) {
      const next = [...items, data];
      setItems(next);
      setForm((f) => ({ ...f, text: "", date: "" }));
      if (next.length === 10) { setCelebration(true); setTimeout(() => setCelebration(false), 3000); }
    }
    setSaving(false);
    inputRef.current?.focus();
  }

  function useExample(ex: string) {
    setForm((f) => ({ ...f, text: ex }));
    inputRef.current?.focus();
  }

  async function removeItem(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const catFor = (value: string) => CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[2];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gradient mb-1">{HEBREW.achievementsTitle}</h2>
        <p className="text-white/50 text-sm">{HEBREW.achievementsSubtitle}</p>
      </div>

      {/* Celebration banner */}
      {celebration && (
        <div className="bg-gradient-to-l from-cyan-500/30 to-purple-600/30 border border-cyan-400/40 rounded-2xl p-4 text-center animate-pulse">
          <span className="text-2xl">🎉</span>
          <p className="font-black text-cyan-400 mt-1">מצוין! הגעת ל-10 הישגים!</p>
        </div>
      )}

      {/* Progress track */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">התקדמות</span>
          <span className={`font-black text-lg ${canComplete ? "text-green-400" : "text-white/60"}`}>
            {items.length}/10
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (items.length / 10) * 100)}%`,
              background: "linear-gradient(to left, #00e5ff, #7b2ff7)",
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < items.length ? "bg-cyan-400 scale-125" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Example chips */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/40 mb-3">💡 דוגמאות — לחץ להוסיף:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => useExample(ex)}
              className="glass border border-white/10 rounded-xl px-3 py-1.5 text-xs hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <div className="glass rounded-3xl p-5 space-y-3">
        {/* Category selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                form.category === cat.value
                  ? "text-white border-transparent"
                  : "border-white/10 text-white/40 hover:border-white/20"
              }`}
              style={form.category === cat.value ? { backgroundColor: cat.color + "30", borderColor: cat.color + "50", color: cat.color } : {}}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder={HEBREW.achievementPlaceholder}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-cyan-400/60 text-sm"
          />
        </div>

        <button
          onClick={addItem}
          disabled={saving || !form.text.trim()}
          className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="text-xl">+</span>
          {saving ? "שומר..." : HEBREW.addAchievement}
        </button>
      </div>

      {/* Timeline list */}
      {items.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute right-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-400/40 to-purple-600/40" />

          <div className="space-y-3">
            {items.map((item, i) => {
              const cat = catFor(item.category);
              return (
                <div key={item.id} className="flex items-start gap-4 group">
                  {/* Icon node */}
                  <div
                    className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 text-lg font-black relative z-10 border"
                    style={{ background: cat.color + "15", borderColor: cat.color + "30", color: cat.color }}
                  >
                    {cat.icon}
                    <span className="text-[9px] mt-0.5 font-black opacity-60">{i + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 glass rounded-2xl p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm leading-snug">{item.achievement_text}</p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cat.color + "20", color: cat.color }}>
                        {cat.label}
                      </span>
                      {item.date_logged && (
                        <span className="text-white/30 text-[10px]">
                          {new Date(item.date_logged).toLocaleDateString("he-IL")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!canComplete && items.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-300 text-sm text-center">
          עוד {remaining} הישגים נדרשים לפתיחת הפלטפורמה
        </div>
      )}

      <button
        onClick={() => { setSubmitting(true); onComplete(); }}
        disabled={!canComplete || submitting}
        className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-black py-4 rounded-2xl hover:opacity-90 disabled:opacity-40 text-lg transition-opacity"
      >
        {submitting ? "..." : `${HEBREW.next} ←`}
      </button>
    </div>
  );
}
