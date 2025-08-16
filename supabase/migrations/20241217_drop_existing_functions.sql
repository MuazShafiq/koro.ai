-- Drop existing functions that need to be recreated with new signatures

DROP FUNCTION IF EXISTS get_session_progress_summary(uuid);
DROP FUNCTION IF EXISTS add_concept_progress(uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS mark_concept_delivered(uuid, numeric);
DROP FUNCTION IF EXISTS mark_concept_needs_review(uuid, text);
DROP FUNCTION IF EXISTS update_session_progress(uuid);
DROP FUNCTION IF EXISTS check_session_completion_readiness(uuid, numeric, integer, integer);