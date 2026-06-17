"use client";

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { HEBREW } from "@/lib/utils";
import PlayerRadarChart from "./PlayerRadarChart";

interface Props { userId: string; onComplete: () => void; }

// ─── Metric definitions ───────────────────────────────────────
const TECHNICAL = [
  { key: "passing",     label: HEBREW.passing     },
  { key: "long_shot",   label: HEBREW.longShot    },
  { key: "crossing",    label: HEBREW.crossing    },
  { key: "set_pieces",  label: HEBREW.setPieces   },
  { key: "first_touch", label: HEBREW.firstTouch  },
  { key: "tackling",    label: HEBREW.tackling    },
  { key: "dribbling",   label: HEBREW.dribbling   },
  { key: "heading",     label: HEBREW.heading     },
  { key: "finishing",   label: HEBREW.finishing   },
  { key: "weak_foot",   label: HEBREW.weakFoot    },
];
const MENTAL = [
  { key: "aggression",    label: HEBREW.aggression   },
  { key: "concentration", label: HEBREW.concentration},
  { key: "positioning",   label: HEBREW.positioning  },
  { key: "anticipation",  label: HEBREW.anticipation },
  { key: "work_rate",     label: HEBREW.workRate     },
  { key: "teamwork",      label: HEBREW.teamwork     },
  { key: "off_ball",      label: HEBREW.offBall      },
  { key: "vision",        label: HEBREW.vision       },
  { key: "leadership",    label: HEBREW.leadership   },
  { key: "decisions",     label: HEBREW.decisions    },
];
const PHYSICAL = [
  { key: "pace",        label: HEBREW.pace       },
  { key: "agility",     label: HEBREW.agility    },
  { key: "strength",    label: HEBREW.strength   },
  { key: "jumping",     label: HEBREW.jumping    },
  { key: "flexibility", label: HEBREW.flexibility},
  { key: "stamina",     label: HEBREW.stamina    },
  { key: "fitness",     label: HEBREW.fitness    },
  { key: "balance",     label: HEBREW.balance    },
];

const ROLE_MODELS = [
  "Cristiano Ronaldo","Lionel Messi","Kylian Mbappé","Erling Haaland",
  "Vinicius Jr.","Jude Bellingham","Phil Foden","Bukayo Saka",
  "Mohamed Salah","Neymar Jr.","Harry Kane","Kevin De Bruyne",
  "Lamine Yamal","Pedri","Gavi","Rodri",
];

const POSITIONS = [
  { code: "GK", label: "שוער" }, { code: "CB", label: "בלם" },
  { code: "FB_WB", label: "מגן צד" }, { code: "CM_CDM", label: "קשר" },
  { code: "Winger", label: "כנף" }, { code: "Striker", label: "חלוץ" },
];

type Scores = Record<string, number>;

function defaultScores(): Scores {
  return Object.fromEntries([...TECHNICAL, ...MENTAL, ...PHYSICAL].map((m) => [m.key, 5]));
}

function scoreColor(v: number) {
  if (v <= 3) return "#ff4757";
  if (v <= 5) return "#ffa502";
  if (v <= 7) return "#2ed573";
  return "#00e5ff";
}

function groupAvg(keys: string[], scores: Scores) {
  const vals = keys.map((k) => scores[k] ?? 5);
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ─── Sub-components ───────────────────────────────────────────
function FifaCard({ scores, roleModel, position }: { scores: Scores; roleModel: string; position: string }) {
  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  );
  const tec = groupAvg(TECHNICAL.map((m) => m.key), scores);
  const men = groupAvg(MENTAL.map((m) => m.key), scores);
  const phy = groupAvg(PHYSICAL.map((m) => m.key), scores);

  return (
    <div className="relative w-36 mx-auto">
      {/* Card body */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{
          background: "linear-gradient(145deg, #1a1a3e 0%, #0d0d1f 60%, #0a0a18 100%)",
          border: "1px solid rgba(0,229,255,0.3)",
          boxShadow: "0 0 30px rgba(0,229,255,0.15), inset 0 0 20px rgba(0,0,0,0.5)",
        }}
      >
        <p className="text-[10px] font-black text-cyan-400/70 tracking-widest uppercase mb-1">
          {POSITIONS.find((p) => p.code === position)?.label ?? "שחקן"}
        </p>
        <div
          className="text-5xl font-black leading-none mb-1"
          style={{ color: scoreColor(Math.round(overall / 9 * 9)) }}
        >
          {overall}
        </div>
        <p className="text-[9px] text-white/40 mb-3">OVR</p>

        <div className="w-10 h-10 rounded-full glass border border-white/20 flex items-center justify-center mx-auto mb-3 text-2xl">
          {roleModel ? roleModel[0] : "⭐"}
        </div>
        {roleModel && <p className="text-[9px] text-white/60 truncate mb-2">{roleModel}</p>}

        <div className="grid grid-cols-3 gap-1 text-center">
          {[["TEC", tec, "#00e5ff"], ["MEN", men, "#7b2ff7"], ["PHY", phy, "#2ed573"]].map(
            ([label, val, color]) => (
              <div key={label as string}>
                <div className="text-base font-black" style={{ color: color as string }}>{val}</div>
                <div className="text-[8px] text-white/40">{label}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = scoreColor(value);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/70 w-28 shrink-0 text-right leading-tight">{label}</span>
      <div className="flex-1 relative">
        <input
          type="range" min={1} max={9} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ accentColor: color }}
          className="w-full"
        />
        <div
          className="absolute top-0 right-0 h-full pointer-events-none"
          style={{ width: `${((value - 1) / 8) * 100}%`, background: `linear-gradient(to left, ${color}20, transparent)`, borderRadius: "3px" }}
        />
      </div>
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 transition-all"
        style={{ background: color + "22", color, border: `1px solid ${color}40` }}
      >
        {value}
      </span>
    </div>
  );
}

function MetricSection({
  title, icon, color, metrics, scores, onScore,
}: {
  title: string; icon: string; color: string;
  metrics: { key: string; label: string }[];
  scores: Scores; onScore: (k: string, v: number) => void;
}) {
  const avg = groupAvg(metrics.map((m) => m.key), scores);
  return (
    <div className="glass rounded-3xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2" style={{ color }}>
          <span>{icon}</span> {title}
        </h3>
        <span
          className="text-lg font-black px-3 py-0.5 rounded-lg"
          style={{ background: color + "20", color }}
        >
          {avg}
        </span>
      </div>
      {metrics.map((m) => (
        <Slider key={m.key} label={m.label} value={scores[m.key]} onChange={(v) => onScore(m.key, v)} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function SelfEvaluation({ userId, onComplete }: Props) {
  const supabase = createClient();
  const [scores, setScores] = useState<Scores>(defaultScores());
  const [roleModel, setRoleModel] = useState("");
  const [roleModelQuery, setRoleModelQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [position, setPosition] = useState("");
  const [whyLines, setWhyLines] = useState<string[]>(Array(10).fill(""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setScore = useCallback((key: string, v: number) => {
    setScores((prev) => ({ ...prev, [key]: v }));
  }, []);

  const suggestions = useMemo(
    () => ROLE_MODELS.filter((r) => r.toLowerCase().includes(roleModelQuery.toLowerCase())),
    [roleModelQuery]
  );

  const filledWhyCount = whyLines.filter((l) => l.trim().length > 2).length;
  const whyValid = filledWhyCount >= 10;

  async function handleSubmit() {
    if (!roleModel) { setError("בחר מודל לחיקוי"); return; }
    if (!position)  { setError("בחר עמדה"); return; }
    if (!whyValid)  { setError("מלא לפחות 10 סיבות"); return; }
    setSaving(true);
    setError("");

    // Build JSONB payloads
    const technical = Object.fromEntries(TECHNICAL.map((m) => [m.key, scores[m.key]]));
    const mental    = Object.fromEntries(MENTAL.map((m) => [m.key, scores[m.key]]));
    const physical  = Object.fromEntries(PHYSICAL.map((m) => [m.key, scores[m.key]]));

    const { error: err } = await supabase.from("self_evaluations").insert({
      user_id:    userId,
      technical,
      mental,
      physical,
      role_model: roleModel,
      why_text:   whyLines.join("\n"),
      // Also save flat columns for backward compat
      ...scores,
      why_professional: whyLines.join("\n"),
    });

    if (!err) {
      await supabase.from("profiles").update({
        role_model_name: roleModel,
        position_code:   position,
        position,
      }).eq("id", userId);
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onComplete();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gradient mb-1">{HEBREW.selfEvalTitle}</h2>
        <p className="text-white/50 text-sm">{HEBREW.selfEvalSubtitle}</p>
      </div>

      {/* FIFA Card + Radar side by side */}
      <div className="glass rounded-3xl p-5">
        <p className="text-center text-xs text-white/40 mb-4 uppercase tracking-wider">{HEBREW.radarChartTitle}</p>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <FifaCard scores={scores} roleModel={roleModel} position={position} />
          <div className="flex-1 w-full">
            <PlayerRadarChart scores={scores} roleModel={roleModel} />
          </div>
        </div>
      </div>

      {/* Position selector */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold mb-3 text-sm text-white/70">עמדה בשטח</h3>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p.code}
              onClick={() => setPosition(p.code)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                position === p.code
                  ? "bg-gradient-to-l from-cyan-500 to-purple-600 text-white"
                  : "glass border border-white/10 text-white/60 hover:border-white/20"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric sections */}
      <MetricSection title={HEBREW.technicalSkills} icon="⚡" color="#00e5ff"
        metrics={TECHNICAL} scores={scores} onScore={setScore} />
      <MetricSection title={HEBREW.mentalSkills} icon="🧠" color="#7b2ff7"
        metrics={MENTAL} scores={scores} onScore={setScore} />
      <MetricSection title={HEBREW.physicalSkills} icon="💪" color="#2ed573"
        metrics={PHYSICAL} scores={scores} onScore={setScore} />

      {/* Role model autocomplete */}
      <div className="glass rounded-3xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <span>⭐</span> {HEBREW.roleModel}
        </h3>
        <div className="relative">
          <input
            type="text"
            value={roleModelQuery || roleModel}
            onChange={(e) => { setRoleModelQuery(e.target.value); setRoleModel(""); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            placeholder={HEBREW.roleModelPlaceholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 text-sm"
          />
          {roleModel && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px]">✓</div>
          )}
          {showSuggest && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 glass border border-white/10 rounded-xl overflow-hidden">
              {suggestions.map((s) => (
                <button key={s} onMouseDown={() => { setRoleModel(s); setRoleModelQuery(""); setShowSuggest(false); }}
                  className="w-full text-right px-4 py-2.5 hover:bg-white/10 transition-colors text-sm">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* "Why" — 10 numbered inputs */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><span>💎</span> {HEBREW.whyPro}</h3>
          <span className={`text-sm font-black px-3 py-1 rounded-full ${
            whyValid ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {filledWhyCount}/10
          </span>
        </div>
        <div className="space-y-2">
          {whyLines.map((line, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                line.trim().length > 2
                  ? "bg-gradient-to-br from-cyan-500 to-purple-600 text-white"
                  : "bg-white/10 text-white/30"
              }`}>
                {i + 1}
              </div>
              <input
                type="text"
                value={line}
                onChange={(e) => {
                  const next = [...whyLines];
                  next[i] = e.target.value;
                  setWhyLines(next);
                }}
                placeholder={`סיבה ${i + 1}...`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-cyan-400/60 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-gradient-to-l from-cyan-500 to-purple-600 text-white font-black py-4 rounded-2xl hover:opacity-90 disabled:opacity-50 text-lg transition-opacity"
      >
        {saving ? "שומר..." : `${HEBREW.next} ←`}
      </button>
    </div>
  );
}
