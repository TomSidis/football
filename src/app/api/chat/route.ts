import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Deep Research Knowledge Base ────────────────────────────
// Embedded directly into the system prompt context.
// Covers all 6 positions + adolescent nutrition + training load.

const POSITION_KB: Record<string, string> = {
  GK: `שוער (GK):
• טכני: הפצה עם הרגל ועם הידיים, עצירת שוטים, מיקום בשער, משחק עם הכדור ברגל (sweeper-keeper), יציאות לכדורים גבוהים.
• מנטלי: ריכוז קיצוני, מנהיגות, קריאת המשחק לפני כולם, תקשורת עם ההגנה, עמידות נפשית אחרי שגיאות.
• פיזי: כוח פיצוץ ורטיקלי, זריזות לאחור ולצדדים, ריאקשן < 0.2 שניות, גמישות מקסימלית.
• אימוני דגש: 40% שמירת שוטים, 30% הפצה + משחק ברגל, 20% יציאות, 10% כדורים גבוהים.`,

  CB: `בלם (CB):
• טכני: תיקול חזיתי ומהצד, נגיחות בהגנה ובהתקפה, בנייה מהאחור, מסירות ארוכות מדויקות.
• מנטלי: מיקום מבוסס ניתוח, קריאת ריצות יריב, תקשורת ברורה, אגרסיביות מחושבת.
• פיזי: כוח פיזי (70+ ק"ג דגש), ניתור (לפחות 70 ס"מ vertical), מהירות ממושכת על 50-60 מ'.
• אימוני דגש: 35% קרבות 1v1, 25% נגיחות + כדורים גבוהים, 25% בנייה מאחור, 15% גיבוש קו הגנה.`,

  FB_WB: `מגן צד / חלוץ-בק (FB/WB):
• טכני: ריצות חפיפה, קרוסים מדויקים, דריבל במהירות, הגנה 1v1 נגד כנפות, מסירות קצרות לשמירת כדור.
• מנטלי: מיקום כפול (הגנה-התקפה), ריצות ללא כדור, ראיית שטח 360°, עבודה קבוצתית בקצה.
• פיזי: סיבולת גבוהה (90+ דקות ריצות), מהירות גבוהה, יכולת חזרה מהירה, 10+ ריצות פעולה לשחקן.
• אימוני דגש: 30% ריצות חפיפה + קרוסים, 30% הגנה 1v1, 25% כושר + מעבר מהיר, 15% שמירת כדור.`,

  CM_CDM: `קשר אמצע / קשר הגנתי (CM/CDM):
• טכני: מסירות קצרות+ארוכות, שמירת כדור בלחץ, לכידת כדורים, פרסינג מתואם, מחוץ לתיבה בעיטות.
• מנטלי: ניצול רווחים בין הקווים, סריקה לפני קבלת כדור (Luka Modrić style), קבלת החלטות תחת לחץ, ניהול קצב משחק.
• פיזי: סיבולת גבוהה (12+ ק"מ למשחק), כוח בקרבות, נפח ריצה + עצימות גבוהה.
• אימוני דגש: 35% שמירת כדור + מסירות, 25% לחץ + לכידה, 25% מבנה תנועה קבוצתי, 15% ירי מרחוק.`,

  Winger: `כנף (Winger):
• טכני: דריבל 1v1 (גבוה, נמוך, שינוי כיוון), קרוסים מוקדמים ומאוחרים, חיתוך פנימה, רגל חלשה לסיומת.
• מנטלי: ביטחון עצמי גבוה, יצירתיות, ריצות חכמות ללא כדור, קריאת מצב גב אחורי להגנה.
• פיזי: מהירות פיצוץ על 10-30 מ' (פחות מ-3.5 שניות), זריזות שינוי כיוון, חזרה מהירה לאחר ספרינט.
• אימוני דגש: 40% דריבל + 1v1, 25% קרוסים + סיומות, 20% ריצות ללא כדור, 15% רגל חלשה.`,

  Striker: `חלוץ (Striker):
• טכני: סיומות מכל זווית, נגיחות בתוך התיבה, שמירת כדור גב להגנה (hold-up), חיבור שחקנים, רגל חלשה.
• מנטלי: חוסר רחמים בתוך התיבה, ציפייה ותנועה (Haaland/Kane), קריאת כדורים גבוהים, ריכוז ב"רגע".
• פיזי: כוח פיזי לשמירת כדור, ריצות פיצוץ קצרות (5-15 מ'), ניתור תחרותי.
• אימוני דגש: 40% סיומות + מיקום, 25% שמירת כדור + חיבור, 20% תנועה ללא כדור, 15% רגל חלשה.`,

  default: `שחקן כדורגל כללי: התמקד בשיפור הרגל החלשה, ראיית משחק, מסירות קצרות בלחץ, כושר גופני בסיסי.`,
};

const NUTRITION_KB = `
תזונה לשחקן כדורגל צעיר (12-18):
• צרכים יומיים: 2500-3500 קק"ל לפי עצימות אימון. ביום אימון כבד: +500 קק"ל.
• פחמימות: 55-60% מהדיאטה (ספגטי, אורז, לחם מלא, שיבולת שועל).
• חלבון: 1.4-1.7 גרם/ק"ג גוף ביום (עוף, דג, ביצים, גבינה, קטניות).
• שומן בריא: 25-30% (אבוקדו, שמן זית, אגוזים).
• הידרציה: 500 מ"ל 2 שעות לפני, 250 מ"ל כל 20 דקות באימון, 750 מ"ל+ לאחר.
• חלון אחרי אימון: 30 דקות — פחמימות מהירות + חלבון (1.2 גרם/ק"ג).

תפריט יומי לפי עצימות:
יום אימון:
  ארוחה 1 (07:00): שיבולת שועל + חלב + 2 ביצים + פרי
  ארוחה 2 (12:00): עוף/דג + אורז חום + ירקות + לחם מלא
  ארוחה 3 / לפני אימון (15:00): בננה + כפית חמאת שקדים + יוגורט
  ארוחה 4 / לאחר אימון (19:00): חלבון (קוטג'/עוף) + פחמימות + ירקות ירוקים + 1 ל' מים

יום מנוחה (מינוס 300-500 קק"ל): הפחת פחמימות, שמור חלבון.
`;

const LOAD_MGMT_KB = `
ניהול עומס לשחקן צעיר:
• עצימות שבועית: לא יותר מ-5 אימונים ביום כדורגל, שמור יום מנוחה 1-2.
• חוק 10%: לא להגדיל עומס שבועי ביותר מ-10% לשבוע.
• שינה: 8-10 שעות בלילה = ריקוברי עיקרי. אל תגמגם על שינה.
• אותות אזהרה לעייפות יתר: ירידה בביצועים, מצב רוח ירוד, קשיי שינה, כאבי שרירים קבועים.
• ריקוברי אקטיבי: שחייה קלה, מתיחות, פוליות, אמבטיית קרח אחרי משחקים.
`;

// ─── Runtime context builder ──────────────────────────────────
interface PlayerContext {
  name: string;
  age: number | string;
  position: string;
  positionCode: string;
  weight?: number;
  roleModel?: string;
  weakFoot?: number;
  todaySessionType?: string;
  todayDurationMinutes?: number;
  goals?: string[];
  latestScores?: Record<string, unknown>;
}

function buildSystemPrompt(ctx: PlayerContext): string {
  const positionKb =
    POSITION_KB[ctx.positionCode] ??
    POSITION_KB[ctx.position] ??
    POSITION_KB.default;

  const intensityLabel =
    ctx.todayDurationMinutes && ctx.todayDurationMinutes >= 90
      ? "גבוהה"
      : ctx.todayDurationMinutes && ctx.todayDurationMinutes >= 60
      ? "בינונית"
      : "נמוכה";

  return `אתה ${ctx.roleModel ?? "מאמן-מנטור"} — דמות AI אלופה המייעצת לשחקן כדורגל צעיר בישראל.

== פרופיל השחקן ==
שם: ${ctx.name}
גיל: ${ctx.age}
עמדה: ${ctx.position}${ctx.positionCode ? ` (${ctx.positionCode})` : ""}
${ctx.weight ? `משקל: ${ctx.weight} ק"ג` : ""}
${ctx.roleModel ? `מודל לחיקוי: ${ctx.roleModel}` : ""}
${ctx.weakFoot !== undefined ? `רגל חלשה: ${ctx.weakFoot}/9` : ""}
${ctx.todaySessionType ? `אימון היום: ${ctx.todaySessionType} | עצימות: ${intensityLabel} (${ctx.todayDurationMinutes ?? "??"} דקות)` : ""}
${ctx.goals?.length ? `מטרות: ${ctx.goals.slice(0, 3).join(" | ")}` : ""}

== בסיס ידע — עמדה ==
${positionKb}

== תזונה ==
${NUTRITION_KB}

== ניהול עומס ==
${LOAD_MGMT_KB}

== חוקי תגובה קריטיים ==
1. ענה בעברית בלבד — קצר, ממוקד, אנרגטי. עד 150 מילה.
2. פנה לשחקן בשמו לפחות פעם אחת.
3. אם השאלה על אוכל ("מה לאכול", "תפריט", "ארוחה") — הפק תפריט 4 ארוחות יומי מותאם לעצימות האימון של היום. כלול כמויות.
4. אם השאלה על אימון — התבסס על בסיס ידע העמדה הספציפי. תן 2-3 טיפים קונקרטיים.
5. אם השאלה על מנטליות — הפנה לחוויות ידועות של ${ctx.roleModel ?? "שחקנים מובילים"}.
6. אל תחזור על אותו מידע פעמיים. היה ספונטני וסמכותי.
7. תן מוטיבציה בסוף כל תגובה — משפט אחד חזק.`.trim();
}

// ─── Route handler ────────────────────────────────────────────
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, runtimeContext } = await request.json();

  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Fetch player data to enrich context
  const [{ data: profile }, { data: evalRow }, { data: goals }, { data: todaySession }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("self_evaluations")
        .select("technical, mental, physical, weak_foot, role_model")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("long_goals")
        .select("goal_text, goals_1y")
        .eq("user_id", user.id)
        .limit(5),
      supabase
        .from("schedule_sessions")
        .select("session_type, duration_minutes")
        .eq("user_id", user.id)
        .eq("session_date", new Date().toISOString().split("T")[0])
        .limit(1)
        .single(),
    ]);

  const age = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : (runtimeContext?.age ?? "לא ידוע");

  const ctx: PlayerContext = {
    name:               profile?.full_name ?? runtimeContext?.name ?? "שחקן",
    age,
    position:           profile?.position   ?? runtimeContext?.position ?? "שחקן",
    positionCode:       profile?.position_code ?? runtimeContext?.positionCode ?? "",
    weight:             runtimeContext?.weight,
    roleModel:          evalRow?.role_model ?? profile?.role_model_name ?? runtimeContext?.roleModel,
    weakFoot:           evalRow?.weak_foot  ?? runtimeContext?.weakFoot,
    todaySessionType:   todaySession?.session_type   ?? runtimeContext?.todaySessionType,
    todayDurationMinutes: todaySession?.duration_minutes ?? runtimeContext?.todayDurationMinutes,
    goals:              goals?.map((g) => g.goal_text ?? g.goals_1y).filter(Boolean) as string[],
    latestScores:       (evalRow?.technical as Record<string, unknown>) ?? undefined,
  };

  const systemPrompt = buildSystemPrompt(ctx);

  try {
    const response = await anthropic.messages.create({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system:     systemPrompt,
      messages:   [{ role: "user", content: message }],
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "לא הצלחתי להשיב. נסה שוב.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[CHAT API]", err);
    return NextResponse.json({ reply: "שגיאה זמנית. נסה שוב." }, { status: 200 });
  }
}
