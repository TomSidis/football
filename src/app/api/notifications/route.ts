import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Email / Push helpers ─────────────────────────────────────
// All recipient addresses resolved at runtime from DB — never literals.

function systemAdminEmail(): string {
  const addr = process.env.NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL;
  if (!addr) throw new Error("NEXT_PUBLIC_SYSTEM_ADMIN_EMAIL not configured");
  return addr;
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  // Wire: Resend / SendGrid / Nodemailer
  console.log(`[EMAIL] ▶ ${to} | ${subject}\n${body}`);
}

async function pushToPlayer(userId: string, title: string, msg: string): Promise<void> {
  const { ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY } = process.env;
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return;
  await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${ONESIGNAL_REST_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { he: title }, contents: { he: msg },
    }),
  });
}

// ── Route mentor emails dynamically (no hardcoding) ───────────
async function emailPlayerMentors(
  db: SupabaseClient,
  playerId: string,
  playerName: string,
  subject: string,
  body: string
): Promise<number> {
  // Try new player_mentor_relations first, fall back to player_mentors (migration 003)
  const { data: mentors } = await db.rpc("get_mentor_emails_v2", { p_player_id: playerId })
    .then(async (res) => {
      if (res.data?.length) return res;
      return db.rpc("get_player_mentor_emails", { p_player_id: playerId });
    });

  let sent = 0;
  for (const m of mentors ?? []) {
    if (!m.mentor_email) continue;
    await sendEmail(
      m.mentor_email,
      subject,
      `שלום ${m.mentor_name},\n\n${body}\n\nשם השחקן: ${playerName}\n\n— Football Stars`
    );
    await db.from("notification_log").insert({
      user_id: playerId, trigger: subject, channel: "email",
      payload: { player: playerName }, routed_to_email: m.mentor_email,
    });
    sent++;
  }
  return sent;
}

async function log(db: SupabaseClient, userId: string, trigger: string, channel: string, payload: object): Promise<void> {
  await db.from("notification_log").insert({ user_id: userId, trigger, channel, payload });
}

// ─── Auth guard ───────────────────────────────────────────────
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── POST handler ─────────────────────────────────────────────
export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trigger } = await request.json().catch(() => ({ trigger: null }));
  if (!trigger) return NextResponse.json({ error: "trigger required" }, { status: 400 });

  const db = (await createAdminClient()) as SupabaseClient;

  // ── 1. Onboarding check (fires ~48 h after registration) ─────
  if (trigger === "onboarding_check") {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: players } = await db
      .from("profiles")
      .select("id, full_name")
      .lt("onboarding_step", 3)
      .lt("created_at", cutoff);

    let mentorAlerts = 0;
    const missing = players ?? [];

    for (const p of missing) {
      // Push to player
      await pushToPlayer(p.id, "Football Stars ⚽", "עדיין לא סיימת להגדיר את הפרופיל שלך. בוא נסיים! 🔥");
      await log(db, p.id, "onboarding_check", "push", {});

      // Dynamic mentor routing
      mentorAlerts += await emailPlayerMentors(
        db, p.id, p.full_name,
        "[Football Stars] פרופיל לא הושלם — 48 שעות",
        `השחקן לא השלים את הגדרת הפרופיל תוך 48 שעות מההרשמה.\nאנא פנה אליו ועודד אותו להשלים את שלושת המסמכים.`
      );
    }

    // System admin: aggregate only, no player PII
    if (missing.length > 0) {
      await sendEmail(
        systemAdminEmail(),
        "[Football Stars] Onboarding Incomplete — Batch Report",
        `Incomplete onboarding count: ${missing.length}\nMentor alerts dispatched: ${mentorAlerts}\nTimestamp: ${new Date().toISOString()}`
      );
    }

    return NextResponse.json({ trigger, players: missing.length, mentorAlerts });
  }

  // ── 2. Weekly schedule deadline (Sunday 12:01 PM) ─────────────
  if (trigger === "schedule_deadline") {
    const sunday = new Date();
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const weekStart = sunday.toISOString().split("T")[0];

    const { data: allPlayers } = await db
      .from("profiles")
      .select("id, full_name")
      .gte("onboarding_step", 3);

    const { data: locked } = await db
      .from("weekly_schedules")
      .select("user_id")
      .eq("week_start", weekStart)
      .not("submitted_at", "is", null);

    const lockedIds = new Set((locked ?? []).map((r) => r.user_id));
    const missing = (allPlayers ?? []).filter((p) => !lockedIds.has(p.id));

    let mentorAlerts = 0;
    for (const p of missing) {
      await pushToPlayer(
        p.id,
        "Football Stars — לוח שבועי ⚡",
        "לא הגשת את התוכנית השבועית שלך! חייב להגיש עד יום ראשון 12:00."
      );
      await log(db, p.id, "schedule_deadline", "push", { weekStart });

      mentorAlerts += await emailPlayerMentors(
        db, p.id, p.full_name,
        "[Football Stars] תוכנית שבועית לא הוגשה",
        `השחקן לא הגיש את התוכנית השבועית לשבוע ${weekStart}.\nאנא בדוק מה קרה ועזור לו להכין את לוח האימונים.`
      );
    }

    if (missing.length > 0) {
      await sendEmail(
        systemAdminEmail(),
        "[Football Stars] Weekly Schedule — Missed Deadline",
        `Missing: ${missing.length} | Week: ${weekStart} | Mentor alerts: ${mentorAlerts}`
      );
    }

    return NextResponse.json({ trigger, missing: missing.length, mentorAlerts });
  }

  // ── 3. Achievement reminder (every 14 days since last entry) ──
  if (trigger === "achievement_reminder") {
    const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: players } = await db
      .from("profiles")
      .select("id")
      .gte("onboarding_step", 3);

    let reminded = 0;
    for (const p of players ?? []) {
      const { data: last } = await db
        .from("achievements")
        .select("created_at")
        .eq("user_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count } = await db
        .from("achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", p.id);

      const outdated = !last?.[0] || last[0].created_at < cutoff14d;
      const belowMin = (count ?? 0) < 10;

      if (outdated || belowMin) {
        await pushToPlayer(
          p.id,
          "Football Stars 🏆",
          "הגיע הזמן להוסיף הישג חדש! תיעוד ההתקדמות שלך הוא חלק מהדרך להצלחה. 💪"
        );
        await log(db, p.id, "achievement_reminder", "push", { count, outdated, belowMin });
        reminded++;
      }
    }

    return NextResponse.json({ trigger, checked: players?.length ?? 0, reminded });
  }

  // ── 4. Match reminder (24 h before kickoff — locks pre-goal modal) ─
  if (trigger === "match_reminder") {
    const now   = new Date().toISOString();
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Support both match_days (new schema) and matches (old schema)
    const [{ data: newMatches }, { data: oldMatches }] = await Promise.all([
      db.from("match_days")
        .select("id, player_id, opponent, match_timestamp")
        .gte("match_timestamp", now)
        .lte("match_timestamp", in24h)
        .eq("pre_goals_locked", false),
      db.from("matches")
        .select("id, user_id, opponent, kickoff_at")
        .gte("kickoff_at", now)
        .lte("kickoff_at", in24h)
        .eq("pre_goals_set", false),
    ]);

    let sent = 0;
    for (const m of newMatches ?? []) {
      await pushToPlayer(
        m.player_id,
        "Football Stars — משחק מחר! ⚽",
        `יש לך משחק מחר נגד ${m.opponent || "יריב"}! כנס לאפליקציה והגדר 3 מטרות למשחק. חובה!`
      );
      await log(db, m.player_id, "match_reminder", "push", { match_id: m.id });
      sent++;
    }
    for (const m of oldMatches ?? []) {
      await pushToPlayer(
        m.user_id,
        "Football Stars — משחק מחר! ⚽",
        `יש לך משחק מחר נגד ${m.opponent || "יריב"}! כנס לאפליקציה והגדר 3 מטרות. חובה לפני הכיפאוף!`
      );
      await log(db, m.user_id, "match_reminder", "push", { match_id: m.id });
      sent++;
    }

    return NextResponse.json({ trigger, sent });
  }

  return NextResponse.json({ error: `Unknown trigger: ${trigger}` }, { status: 400 });
}
