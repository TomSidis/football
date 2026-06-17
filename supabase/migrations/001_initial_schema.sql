-- ============================================================
-- Football Stars Platform — Initial Database Schema
-- Supabase / PostgreSQL Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT,
  date_of_birth     DATE,
  position          TEXT,                        -- e.g. "Striker", "Midfielder"
  team_name         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  role_model_name   TEXT,                        -- e.g. "Cristiano Ronaldo"
  role_model_image  TEXT,
  onboarding_step   INT DEFAULT 0,               -- 0=none, 1=eval done, 2=achievements done, 3=goals done
  onboarding_completed_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- SELF EVALUATIONS (versioned — never overwritten)
-- ============================================================
CREATE TABLE IF NOT EXISTS self_evaluations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  version         INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Technical (טכני)
  passing         SMALLINT CHECK (passing BETWEEN 1 AND 9),
  long_shot       SMALLINT CHECK (long_shot BETWEEN 1 AND 9),
  crossing        SMALLINT CHECK (crossing BETWEEN 1 AND 9),
  set_pieces      SMALLINT CHECK (set_pieces BETWEEN 1 AND 9),
  first_touch     SMALLINT CHECK (first_touch BETWEEN 1 AND 9),
  tackling        SMALLINT CHECK (tackling BETWEEN 1 AND 9),
  dribbling       SMALLINT CHECK (dribbling BETWEEN 1 AND 9),
  heading         SMALLINT CHECK (heading BETWEEN 1 AND 9),
  finishing       SMALLINT CHECK (finishing BETWEEN 1 AND 9),
  weak_foot       SMALLINT CHECK (weak_foot BETWEEN 1 AND 9),

  -- Mental (מנטלי)
  aggression      SMALLINT CHECK (aggression BETWEEN 1 AND 9),
  concentration   SMALLINT CHECK (concentration BETWEEN 1 AND 9),
  positioning     SMALLINT CHECK (positioning BETWEEN 1 AND 9),
  anticipation    SMALLINT CHECK (anticipation BETWEEN 1 AND 9),
  work_rate       SMALLINT CHECK (work_rate BETWEEN 1 AND 9),
  teamwork        SMALLINT CHECK (teamwork BETWEEN 1 AND 9),
  off_ball        SMALLINT CHECK (off_ball BETWEEN 1 AND 9),
  vision          SMALLINT CHECK (vision BETWEEN 1 AND 9),
  leadership      SMALLINT CHECK (leadership BETWEEN 1 AND 9),
  decisions       SMALLINT CHECK (decisions BETWEEN 1 AND 9),

  -- Physical (פיזי)
  pace            SMALLINT CHECK (pace BETWEEN 1 AND 9),
  agility         SMALLINT CHECK (agility BETWEEN 1 AND 9),
  strength        SMALLINT CHECK (strength BETWEEN 1 AND 9),
  jumping         SMALLINT CHECK (jumping BETWEEN 1 AND 9),
  flexibility     SMALLINT CHECK (flexibility BETWEEN 1 AND 9),
  stamina         SMALLINT CHECK (stamina BETWEEN 1 AND 9),
  fitness         SMALLINT CHECK (fitness BETWEEN 1 AND 9),
  balance         SMALLINT CHECK (balance BETWEEN 1 AND 9),

  -- Motivation statement
  why_professional TEXT,                         -- 10+ reasons textarea

  UNIQUE(user_id, version)
);

ALTER TABLE self_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own evaluations" ON self_evaluations FOR ALL USING (auth.uid() = user_id);

-- Auto-increment version on insert
CREATE OR REPLACE FUNCTION increment_eval_version()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
  FROM self_evaluations WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_eval_insert
  BEFORE INSERT ON self_evaluations
  FOR EACH ROW EXECUTE FUNCTION increment_eval_version();

-- ============================================================
-- ACHIEVEMENTS (personal achievement list)
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  achieved_at DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements" ON achievements FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- LONG-TERM GOALS (3 timeframes)
-- ============================================================
CREATE TABLE IF NOT EXISTS long_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  timeframe   TEXT NOT NULL CHECK (timeframe IN ('1_year', '3_year', '5_year')),
  goal_text   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE long_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON long_goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- WEEKLY SCHEDULE
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_schedules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,                   -- Monday of that week
  submitted_at  TIMESTAMPTZ,                     -- NULL = not yet locked in
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weekly schedule" ON weekly_schedules FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS schedule_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id       UUID REFERENCES weekly_schedules(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_date      DATE NOT NULL,
  start_time        TIME NOT NULL,
  duration_minutes  INT NOT NULL DEFAULT 60,
  session_type      TEXT NOT NULL CHECK (session_type IN (
                      'team_training', 'technical_training',
                      'athletic_training', 'recovery', 'match'
                    )),
  -- Daily accountability
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  missed_reason     TEXT,                        -- 'injury' | 'school' | 'fatigue' | 'other'
  missed_note       TEXT,
  checked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schedule_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON schedule_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- MATCHES & GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES schedule_sessions(id) ON DELETE SET NULL,
  opponent        TEXT,
  kickoff_at      TIMESTAMPTZ NOT NULL,
  location        TEXT,
  pre_goals_set   BOOLEAN DEFAULT FALSE,
  post_review_done BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own matches" ON matches FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS match_goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type   TEXT NOT NULL CHECK (goal_type IN ('process', 'outcome')),
  description TEXT NOT NULL,
  achieved    BOOLEAN,                           -- set in post-match review
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE match_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own match goals" ON match_goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATION AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  trigger     TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('push', 'email', 'admin_email')),
  payload     JSONB,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON notification_log FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- MEDIA / FILE VAULT
-- ============================================================
CREATE TABLE IF NOT EXISTS media_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  UUID REFERENCES achievements(id) ON DELETE SET NULL,
  storage_path    TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('video', 'image', 'certificate')),
  category        TEXT,                          -- 'ball_control' | 'dribbling' | etc.
  title           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media" ON media_items FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- HELPER: updated_at auto-trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER long_goals_updated_at BEFORE UPDATE ON long_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
