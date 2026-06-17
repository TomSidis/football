"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { HEBREW } from "@/lib/utils";

interface Session {
  session_type: string;
  duration_minutes: number;
  status: string;
}

const TYPE_COLORS: Record<string, string> = {
  team_training: "#00e5ff",
  technical_training: "#7b2ff7",
  athletic_training: "#2ed573",
  recovery: "#ffa502",
  match: "#ff4757",
};

export default function WeeklyStats({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-center">
        <p className="text-white/40 text-sm">לא נמצאו אימונים השבוע</p>
        <a href="/dashboard/scheduler" className="text-cyan-400 text-sm hover:underline mt-1 inline-block">
          + תכנן את השבוע שלך
        </a>
      </div>
    );
  }

  const totalMinutes = sessions.reduce((s, sess) => s + (sess.duration_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const byType = Object.entries(
    sessions.reduce((acc, s) => {
      acc[s.session_type] = (acc[s.session_type] ?? 0) + s.duration_minutes;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, minutes]) => ({
    name: HEBREW.sessionTypes[type as keyof typeof HEBREW.sessionTypes] ?? type,
    value: minutes,
    percent: Math.round((minutes / totalMinutes) * 100),
    color: TYPE_COLORS[type] ?? "#ffffff",
  }));

  return (
    <div className="glass rounded-3xl p-6">
      <h2 className="font-bold mb-4 flex items-center gap-2">
        <span>📊</span> {HEBREW.weeklyStats}
      </h2>

      <div className="flex items-center gap-6">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={byType}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              dataKey="value"
            >
              {byType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => typeof value === "number" ? [`${Math.round(value / 60 * 10) / 10} שעות`] : [String(value)]}
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          <div className="text-3xl font-black text-gradient">{totalHours}h</div>
          <p className="text-white/40 text-xs">{HEBREW.totalHours}</p>
          <div className="space-y-1.5 mt-3">
            {byType.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-white/70 flex-1">{item.name}</span>
                <span className="text-xs font-bold" style={{ color: item.color }}>{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
