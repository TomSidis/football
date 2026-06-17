-- ============================================================
-- Supabase Storage Bucket for Media Vault
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  false,
  104857600, -- 100MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- Helper view: weekly completion rate
-- ============================================================
CREATE OR REPLACE VIEW weekly_completion_stats AS
SELECT
  s.user_id,
  ws.week_start,
  COUNT(*) AS total_sessions,
  COUNT(*) FILTER (WHERE s.status = 'completed') AS completed_sessions,
  ROUND(
    COUNT(*) FILTER (WHERE s.status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100
  ) AS completion_rate,
  SUM(s.duration_minutes) AS total_minutes,
  ws.submitted_at IS NOT NULL AS schedule_locked
FROM schedule_sessions s
JOIN weekly_schedules ws ON s.schedule_id = ws.id
GROUP BY s.user_id, ws.week_start, ws.submitted_at;

-- ============================================================
-- Function: get player full context for AI chat
-- ============================================================
CREATE OR REPLACE FUNCTION get_player_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.id = p_user_id),
    'latest_evaluation', (
      SELECT row_to_json(e)
      FROM self_evaluations e
      WHERE e.user_id = p_user_id
      ORDER BY e.created_at DESC
      LIMIT 1
    ),
    'goals', (
      SELECT jsonb_agg(jsonb_build_object('timeframe', g.timeframe, 'text', g.goal_text))
      FROM long_goals g WHERE g.user_id = p_user_id
    ),
    'achievements_count', (SELECT COUNT(*) FROM achievements WHERE user_id = p_user_id),
    'weekly_completion', (
      SELECT completion_rate FROM weekly_completion_stats
      WHERE user_id = p_user_id
      ORDER BY week_start DESC LIMIT 1
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
