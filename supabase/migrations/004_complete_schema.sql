-- ============================================================
-- Migration 004: Complete Schema (JSONB + Multi-Tenant + Positions)
-- Safe to run alongside 001-003; uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================

-- ── ROLES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id   SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE CHECK (name IN ('player','coach','club_admin','super_admin'))
);
INSERT INTO roles (name) VALUES ('player'),('coach'),('club_admin'),('super_admin')
  ON CONFLICT (name) DO NOTHING;

-- ── PROFILES: add role_id + email + position_code ────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role_id        SMALLINT REFERENCES roles(id) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS position_code  TEXT CHECK (position_code IN ('GK','CB','FB_WB','CM_CDM','Winger','Striker'));

-- Back-fill role_id=1 (player) for existing rows
UPDATE profiles SET role_id = 1 WHERE role_id IS NULL;

-- ── FOOTBALL POSITIONS (static lookup) ───────────────────────
CREATE TABLE IF NOT EXISTS football_positions (
  code           TEXT PRIMARY KEY,
  name_he        TEXT NOT NULL,
  key_technical  TEXT[] NOT NULL,
  key_mental     TEXT[] NOT NULL,
  key_physical   TEXT[] NOT NULL
);

INSERT INTO football_positions VALUES
  ('GK',      'שוער',        ARRAY['distribution','shot_stopping','set_pieces'],
                              ARRAY['concentration','leadership','decisions'],
                              ARRAY['jumping','strength','agility']),
  ('CB',      'בלם',         ARRAY['tackling','heading','passing'],
                              ARRAY['positioning','aggression','leadership'],
                              ARRAY['strength','jumping','pace']),
  ('FB_WB',   'מגן צד',      ARRAY['crossing','dribbling','tackling'],
                              ARRAY['work_rate','positioning','teamwork'],
                              ARRAY['stamina','pace','agility']),
  ('CM_CDM',  'קשר אמצע',    ARRAY['passing','vision','first_touch'],
                              ARRAY['decisions','anticipation','work_rate'],
                              ARRAY['stamina','strength','agility']),
  ('Winger',  'כנף',         ARRAY['dribbling','crossing','weak_foot'],
                              ARRAY['creativity','off_ball','concentration'],
                              ARRAY['pace','agility','stamina']),
  ('Striker', 'חלוץ',        ARRAY['finishing','heading','weak_foot'],
                              ARRAY['positioning','decisions','aggression'],
                              ARRAY['pace','strength','jumping'])
ON CONFLICT (code) DO NOTHING;

-- ── PLAYER ↔ MENTOR RELATIONS (simplified join) ──────────────
CREATE TABLE IF NOT EXISTS player_mentor_relations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL CHECK (relationship IN ('coach','parent','guardian')),
  notify_email  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, mentor_id)
);
ALTER TABLE player_mentor_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmr_service_only" ON player_mentor_relations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "pmr_player_read"  ON player_mentor_relations FOR SELECT USING (auth.uid() = player_id);

-- ── SELF_EVALUATIONS: add JSONB columns alongside existing ───
ALTER TABLE self_evaluations
  ADD COLUMN IF NOT EXISTS technical  JSONB,
  ADD COLUMN IF NOT EXISTS mental     JSONB,
  ADD COLUMN IF NOT EXISTS physical   JSONB,
  ADD COLUMN IF NOT EXISTS role_model TEXT,
  ADD COLUMN IF NOT EXISTS why_text   TEXT;

-- Rename player reference column if needed (keep user_id for compat)
-- New inserts use player_id alias view:
CREATE OR REPLACE VIEW self_evaluations_view AS
  SELECT id,
         COALESCE(user_id, NULL) AS player_id,
         version,
         created_at,
         technical, mental, physical,
         role_model, why_text
  FROM self_evaluations;

-- ── ACHIEVEMENTS: add new columns (keep backward compat) ─────
ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS achievement_text TEXT,
  ADD COLUMN IF NOT EXISTS date_logged      DATE,
  ADD COLUMN IF NOT EXISTS category         TEXT CHECK (category IN ('goal','tournament','personal','team','award')),
  ADD COLUMN IF NOT EXISTS player_id        UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Back-fill player_id from user_id where user_id exists
UPDATE achievements SET player_id = user_id WHERE player_id IS NULL AND user_id IS NOT NULL;
UPDATE achievements SET achievement_text = title WHERE achievement_text IS NULL AND title IS NOT NULL;
UPDATE achievements SET date_logged = achieved_at WHERE date_logged IS NULL AND achieved_at IS NOT NULL;

-- ── LONG_GOALS: add consolidated text columns ─────────────────
ALTER TABLE long_goals
  ADD COLUMN IF NOT EXISTS goals_1y TEXT,
  ADD COLUMN IF NOT EXISTS goals_3y TEXT,
  ADD COLUMN IF NOT EXISTS goals_5y TEXT;

-- ── WEEKLY_SCHEDULES: add JSONB columns ──────────────────────
ALTER TABLE weekly_schedules
  ADD COLUMN IF NOT EXISTS schedule_data      JSONB DEFAULT '{"sessions":[]}'::JSONB,
  ADD COLUMN IF NOT EXISTS matrix_percentages JSONB DEFAULT '{}'::JSONB;

-- ── MATCH_DAYS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_days (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_timestamp TIMESTAMPTZ NOT NULL,
  opponent        TEXT,
  location        TEXT,
  process_goals   TEXT[]   DEFAULT '{}',
  outcome_goal    TEXT,
  pre_goals_locked BOOLEAN DEFAULT FALSE,
  review_data     JSONB    DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_days_owner" ON match_days FOR ALL USING (auth.uid() = player_id);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role_id              ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_position_code        ON profiles(position_code);
CREATE INDEX IF NOT EXISTS idx_pmr_player_id                 ON player_mentor_relations(player_id);
CREATE INDEX IF NOT EXISTS idx_pmr_mentor_id                 ON player_mentor_relations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_self_eval_player_created      ON self_evaluations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_player_date      ON achievements(player_id, date_logged DESC);
CREATE INDEX IF NOT EXISTS idx_achievements_user_created     ON achievements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_long_goals_player             ON long_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_player_week  ON weekly_schedules(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_match_days_player_ts          ON match_days(player_id, match_timestamp);
CREATE INDEX IF NOT EXISTS idx_match_days_upcoming           ON match_days(match_timestamp) WHERE pre_goals_locked = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_log_user_trigger        ON notification_log(user_id, trigger);

-- ── HELPER: mentor emails via new player_mentor_relations ─────
CREATE OR REPLACE FUNCTION get_mentor_emails_v2(p_player_id UUID)
RETURNS TABLE(mentor_email TEXT, mentor_name TEXT, relationship TEXT) AS $$
  SELECT
    p.email,
    p.full_name,
    pmr.relationship
  FROM player_mentor_relations pmr
  JOIN profiles p ON p.id = pmr.mentor_id
  WHERE pmr.player_id = p_player_id
    AND pmr.notify_email = TRUE
    AND p.email IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- ── HELPER: compute matrix percentages from schedule_data ─────
CREATE OR REPLACE FUNCTION compute_matrix_percentages(p_schedule_data JSONB)
RETURNS JSONB AS $$
DECLARE
  total INT := 0;
  result JSONB := '{}';
  session JSONB;
  stype TEXT;
  dur INT;
BEGIN
  -- Sum total minutes
  FOR session IN SELECT * FROM jsonb_array_elements(p_schedule_data->'sessions') LOOP
    total := total + COALESCE((session->>'duration_minutes')::INT, 0);
  END LOOP;
  IF total = 0 THEN RETURN '{"total_minutes":0}'::JSONB; END IF;

  -- Build per-type percentages
  FOR stype IN SELECT DISTINCT s->>'session_type' FROM jsonb_array_elements(p_schedule_data->'sessions') s LOOP
    SELECT COALESCE(SUM((s->>'duration_minutes')::INT), 0)
      INTO dur
      FROM jsonb_array_elements(p_schedule_data->'sessions') s
      WHERE s->>'session_type' = stype;
    result := result || jsonb_build_object(stype, ROUND((dur::NUMERIC / total) * 100));
  END LOOP;

  RETURN result || jsonb_build_object('total_minutes', total);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
