-- ============================================================
-- Player ↔ Mentor/Parent Multi-Tenant Routing
-- Security Amendment: no personal identifiers in code.
-- All player accountability alerts are routed dynamically
-- to the mentor(s) attached to that specific player.
-- ============================================================

-- Mentor/Coach/Parent profiles (may or may not have auth accounts)
CREATE TABLE IF NOT EXISTS mentors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,                       -- routing target for player alerts
  phone       TEXT,
  role        TEXT NOT NULL CHECK (role IN ('coach', 'parent', 'guardian')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

-- Mentors can only be inserted/managed by service role (admin cron jobs, admin panel)
-- Players cannot view or modify mentor records directly
CREATE POLICY "Service role manages mentors"
  ON mentors FOR ALL
  USING (auth.role() = 'service_role');

-- Join table: one player can have multiple mentors (coach + parent)
CREATE TABLE IF NOT EXISTS player_mentors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id     UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL CHECK (relationship IN ('coach', 'parent', 'guardian')),
  is_primary    BOOLEAN DEFAULT FALSE,             -- primary contact receives all alerts
  notify_email  BOOLEAN DEFAULT TRUE,
  notify_push   BOOLEAN DEFAULT FALSE,             -- future: push to mentor's own device
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, mentor_id)
);

ALTER TABLE player_mentors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages player_mentors"
  ON player_mentors FOR ALL
  USING (auth.role() = 'service_role');

-- Players can view who their mentors are (read-only)
CREATE POLICY "Players can view own mentor links"
  ON player_mentors FOR SELECT
  USING (auth.uid() = player_id);

-- ============================================================
-- Helper function: get all notifiable mentor emails for a player
-- Used by the notification engine to avoid hardcoding any addresses
-- ============================================================
CREATE OR REPLACE FUNCTION get_player_mentor_emails(p_player_id UUID)
RETURNS TABLE(mentor_email TEXT, mentor_name TEXT, relationship TEXT) AS $$
  SELECT
    m.email   AS mentor_email,
    m.full_name AS mentor_name,
    pm.relationship
  FROM player_mentors pm
  JOIN mentors m ON m.id = pm.mentor_id
  WHERE pm.player_id = p_player_id
    AND pm.notify_email = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- Extend notification_log to record mentor routing
-- ============================================================
ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS routed_to_email TEXT,   -- which mentor email received this
  ADD COLUMN IF NOT EXISTS mentor_id        UUID REFERENCES mentors(id) ON DELETE SET NULL;

-- ============================================================
-- Extend profiles: link to primary mentor for quick lookup
-- (denormalized for performance; player_mentors is the source of truth)
-- ============================================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS primary_mentor_id UUID REFERENCES mentors(id) ON DELETE SET NULL;

-- Auto-sync primary_mentor_id when player_mentors.is_primary changes
CREATE OR REPLACE FUNCTION sync_primary_mentor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE profiles SET primary_mentor_id = NEW.mentor_id WHERE id = NEW.player_id;
    -- Ensure only one primary per player
    UPDATE player_mentors
      SET is_primary = FALSE
      WHERE player_id = NEW.player_id AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_primary_mentor_set
  AFTER INSERT OR UPDATE OF is_primary ON player_mentors
  FOR EACH ROW WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION sync_primary_mentor();

CREATE TRIGGER mentors_updated_at BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
