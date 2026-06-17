import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HEBREW = {
  // Auth
  login: "כניסה",
  signup: "הרשמה",
  email: "אימייל",
  password: "סיסמה",
  fullName: "שם מלא",
  phone: "טלפון",
  loginWithGoogle: "כניסה עם גוגל",
  loginWithApple: "כניסה עם אפל",
  enterOtp: "הכנס קוד אימות",
  otpSent: "קוד אימות נשלח אליך",
  verify: "אמת",
  resendOtp: "שלח קוד מחדש",
  noAccount: "אין לך חשבון?",
  hasAccount: "כבר יש לך חשבון?",
  signupHere: "הירשם כאן",
  loginHere: "התחבר כאן",
  tagline: "הכוכב הבא מתחיל כאן",

  // Onboarding
  onboardingTitle: "לפני שמתחילים",
  onboardingSubtitle: "מלא 3 מסמכים חיוניים כדי להתחיל את המסע שלך",
  step: "שלב",
  of: "מתוך",
  next: "הבא",
  save: "שמור",
  complete: "סיים",
  back: "חזור",

  // Self Evaluation
  selfEvalTitle: "לוח הערכה עצמית",
  selfEvalSubtitle: "דרג את עצמך בכל תחום מ-1 (חלש בליגה) עד 9 (הטוב ביותר)",
  technicalSkills: "כישורים טכניים",
  mentalSkills: "כישורים מנטליים",
  physicalSkills: "כישורים פיזיים",
  roleModel: "מודל לחיקוי",
  roleModelPlaceholder: "חפש שחקן (למשל רונאלדו, מסי)",
  whyPro: "למה אתה רוצה להיות פרופסיונל?",
  whyProPlaceholder: "רשום לפחות 10 סיבות מדוע אתה רוצה להיות שחקן כדורגל מקצועי...",
  whyProHint: "נדרשות לפחות 10 סיבות",
  radarChartTitle: "כרטיס השחקן שלך",
  // Technical
  passing: "מסירה",
  longShot: "בעיטה מחוץ לרחבה",
  crossing: "הגבהה ופס רוחב",
  setPieces: "נייחים",
  firstTouch: "נגיעה ראשונה",
  tackling: "תיקול",
  dribbling: "דריבל",
  heading: "נגיחות",
  finishing: "סיומת",
  weakFoot: "רגל חלשה",
  // Mental
  aggression: "אגרסיביות",
  concentration: "ריכוז",
  positioning: "מיקום",
  anticipation: "סריקה וציפייה",
  workRate: "מוסר עבודה",
  teamwork: "קבוצתיות",
  offBall: "תנועה",
  vision: "ראיית משחק",
  leadership: "מנהיגות",
  decisions: "קבלת החלטות",
  // Physical
  pace: "מהירות",
  agility: "זריזות",
  strength: "כוח פיזי",
  jumping: "ניתור",
  flexibility: "גמישות",
  stamina: "סיבולת",
  fitness: "כושר גופני",
  balance: "יציבות",

  // Achievements
  achievementsTitle: "רשימת הישגים אישית",
  achievementsSubtitle: "הוסף לפחות 10 הישגים שלך כדי להמשיך",
  addAchievement: "הוסף הישג",
  achievementTitle: "כותרת ההישג",
  achievementDesc: "תיאור",
  achievementDate: "תאריך",
  minAchievementsWarning: "נדרשים לפחות 10 הישגים",
  achievementPlaceholder: "למשל: כבשתי 3 שערים במשחק אחד",

  // Goals
  goalsTitle: "לוח מטרות טווח ארוך",
  goalsSubtitle: "הגדר את החלומות שלך לעתיד",
  fiveYears: "מטרות ל-5 שנים הקרובות",
  threeYears: "מטרות ל-3 שנים הקרובות",
  oneYear: "מטרות לשנה הקרובה",
  addGoal: "הוסף מטרה",
  goalPlaceholder: "מה אתה רוצה להשיג?",
  inspirationCards: [
    "לחתום על חוזה מקצועי",
    "להתגייס לנבחרת הנוער",
    "לשפר את הרגל החלשה ל-7/9",
    "לשחק בליגה הלאומית",
    "לעבור ניסיון באקדמיה של מועדון אירופי",
    "להיות קפטן של הקבוצה",
  ],

  // Scheduler
  schedulerTitle: "תוכנית השבועית שלי",
  schedulerDeadline: "יש להגיש עד יום ראשון ב-12:00",
  sessionTypes: {
    team_training: "אימון קבוצה",
    technical_training: "אימון טכני",
    athletic_training: "אימון אתלטי",
    recovery: "אימון התאוששות",
    match: "משחק",
  },
  addSession: "הוסף אימון",
  lockSchedule: "נעל תוכנית שבועית",
  weeklyStats: "סטטיסטיקות שבועיות",
  totalHours: "סך שעות",
  days: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],

  // Daily check
  markCompleted: "סמן כבוצע ✓",
  markMissed: "לא בוצע ✗",
  missedReason: "מה מנע ממך לבצע את האימון?",
  missedReasons: {
    injury: "פציעה",
    school: "בית ספר",
    fatigue: "עייפות",
    other: "אחר",
  },

  // Match
  matchTitle: "משחק",
  preMatchGoals: "הגדר מטרות למשחק",
  processGoal: "מטרת תהליך",
  outcomeGoal: "מטרת תוצאה",
  processGoalHint: "מה תעשה במהלך המשחק? (2 מטרות)",
  outcomeGoalHint: "מה תרצה להשיג? (1 מטרה)",
  postMatchReview: "סקירה לאחר המשחק",
  goalAchieved: "הושג ✓",
  goalMissed: "לא הושג ✗",
  submitReview: "שלח סקירה",

  // Avatar
  avatarGreeting: "היי! אני כאן לעזור לך להגיע לפסגה 🔥",
  avatarStreak: "סיוו! שבוע מושלם! המשך כך! 💪",
  avatarOverdue: "היי, פספסת את המועד האחרון. בוא נחזור למסלול!",
  chatPlaceholder: "שאל אותי כל שאלה...",
  send: "שלח",

  // Dashboard
  welcome: "ברוך הבא",
  yourProgress: "ההתקדמות שלך",
  thisWeek: "השבוע",
  streak: "רצף",
  days_streak: "ימים ברצף",

  // Notifications
  notifOnboardingIncomplete: "עדיין לא סיימת להגדיר את הפרופיל שלך. בוא נסיים!",
  notifScheduleMissed: "לא הגשת את התוכנית השבועית שלך. צור קשר עם המאמן!",
  notifAchievementReminder: "הגיע הזמן להוסיף הישג חדש לרשימה שלך!",
  notifPreMatch: "יש לך משחק מחר! הגדר 3 מטרות למשחק עכשיו.",

  // Media
  mediaTitle: "ארכיון המדיה שלי",
  categories: {
    ball_control: "שליטה בכדור",
    dribbling: "דריבל",
    weak_foot: "רגל חלשה",
    free_kicks: "בעיטות עונשין",
    highlights: "הייליטס",
  },
  uploadVideo: "העלה וידאו",
  uploadPhoto: "העלה תמונה",
} as const;
