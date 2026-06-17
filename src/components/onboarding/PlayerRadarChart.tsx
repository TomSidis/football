"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import { HEBREW } from "@/lib/utils";

type Scores = Record<string, number>;

interface Props {
  scores: Scores;
  roleModel: string;
}

const RADAR_METRICS = [
  { key: "passing", label: HEBREW.passing, group: "technical" },
  { key: "dribbling", label: HEBREW.dribbling, group: "technical" },
  { key: "finishing", label: HEBREW.finishing, group: "technical" },
  { key: "weak_foot", label: HEBREW.weakFoot, group: "technical" },
  { key: "pace", label: HEBREW.pace, group: "physical" },
  { key: "strength", label: HEBREW.strength, group: "physical" },
  { key: "stamina", label: HEBREW.stamina, group: "physical" },
  { key: "vision", label: HEBREW.vision, group: "mental" },
  { key: "decisions", label: HEBREW.decisions, group: "mental" },
  { key: "leadership", label: HEBREW.leadership, group: "mental" },
];

export default function PlayerRadarChart({ scores, roleModel }: Props) {
  const data = RADAR_METRICS.map((m) => ({
    subject: m.label,
    value: scores[m.key] ?? 5,
    fullMark: 9,
  }));

  const overall = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
  );

  return (
    <div className="relative">
      {/* Overall badge */}
      <div className="absolute top-0 left-0 z-10">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex flex-col items-center justify-center">
          <span className="text-xl font-black leading-none">{overall}</span>
          <span className="text-[9px] text-white/70 leading-none">OVR</span>
        </div>
      </div>

      {/* Role model badge */}
      {roleModel && (
        <div className="absolute top-0 right-0 z-10">
          <div className="glass rounded-xl px-3 py-1.5 text-xs font-bold text-cyan-400">
            ⭐ {roleModel}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11, fontFamily: "Arial" }}
          />
          <PolarRadiusAxis domain={[0, 9]} tick={false} axisLine={false} />
          <Radar
            name="שחקן"
            dataKey="value"
            stroke="#00e5ff"
            fill="#00e5ff"
            fillOpacity={0.2}
            strokeWidth={2}
            dot={{ fill: "#00e5ff", r: 4, strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
