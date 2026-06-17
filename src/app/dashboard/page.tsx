import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HEBREW } from "@/lib/utils";
import FloatingAvatar from "@/components/dashboard/FloatingAvatar";
import WeeklyStats from "@/components/dashboard/WeeklyStats";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("schedule_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("session_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("session_date", { ascending: true }),
  ]);

  if (!profile || profile.onboarding_step < 3) redirect("/onboarding");

  const completedSessions = sessions?.filter((s) => s.status === "completed") ?? [];
  const totalSessions = sessions?.length ?? 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions.length / totalSessions) * 100) : 0;
  const isStreaking = completionRate === 100 && totalSessions > 0;
  const hasMissedDeadline = false; // computed via cron; placeholder

  const todaySessions = sessions?.filter((s) => {
    const today = new Date().toISOString().split("T")[0];
    return s.session_date === today && s.status === "pending";
  }) ?? [];

  return (
    <div className="stadium-bg min-h-screen pb-24">
      <DashboardNav profile={profile} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-white/50 text-sm">שלום,</p>
          <h1 className="text-3xl font-black">
            {profile.full_name?.split(" ")[0] ?? "שחקן"} 👋
          </h1>
        </div>

        {/* Hero stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "שלמות שבועית", value: `${completionRate}%`, icon: "📊", color: completionRate === 100 ? "text-green-400" : "text-cyan-400" },
            { label: "אימונים השבוע", value: totalSessions, icon: "⚡", color: "text-purple-400" },
            { label: "בוצעו", value: completedSessions.length, icon: "✅", color: "text-green-400" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Today's sessions */}
        {todaySessions.length > 0 && (
          <div className="glass rounded-3xl p-5">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <span className="animate-pulse-glow w-2 h-2 bg-amber-400 rounded-full inline-block" />
              אימונים היום — ממתינים לסימון
            </h2>
            <div className="space-y-2">
              {todaySessions.map((s) => (
                <div key={s.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">
                      {HEBREW.sessionTypes[s.session_type as keyof typeof HEBREW.sessionTypes]}
                    </p>
                    <p className="text-white/40 text-xs">{s.start_time?.slice(0, 5)} • {s.duration_minutes} דק'</p>
                  </div>
                  <div className="flex gap-2">
                    <a href="/dashboard/scheduler" className="bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-500/30 transition-colors">
                      ✓ בוצע
                    </a>
                    <a href="/dashboard/scheduler" className="bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors">
                      ✗ לא
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly stats chart */}
        <WeeklyStats sessions={sessions ?? []} />

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/dashboard/scheduler", icon: "📅", label: "תוכנית שבועית", desc: "תכנן ועקוב אחר האימונים" },
            { href: "/dashboard/matches", icon: "⚽", label: "משחקים", desc: "מטרות ומשחקים קרובים" },
            { href: "/dashboard/vault", icon: "🎬", label: "ארכיון מדיה", desc: "וידאו, תמונות, תעודות" },
            { href: "/onboarding", icon: "👤", label: "הפרופיל שלי", desc: "עדכן הערכה עצמית" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="glass rounded-2xl p-4 hover:bg-white/10 transition-all group"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{link.icon}</div>
              <p className="font-bold text-sm">{link.label}</p>
              <p className="text-white/40 text-xs mt-0.5">{link.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Floating AI Avatar */}
      <FloatingAvatar
        profile={profile}
        isStreaking={isStreaking}
        hasMissedDeadline={hasMissedDeadline}
      />
    </div>
  );
}
