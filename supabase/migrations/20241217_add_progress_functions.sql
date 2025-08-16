-- Enhanced progress tracking functions for AI tutor system

-- Function to get comprehensive session progress summary
CREATE OR REPLACE FUNCTION get_session_progress_summary(session_uuid UUID)
RETURNS TABLE (
  progress_percentage NUMERIC,
  total_concepts INTEGER,
  delivered_concepts INTEGER,
  pending_concepts INTEGER,
  equations_count INTEGER,
  resource_sections_covered INTEGER,
  avg_engagement_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND(
            (COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'understood'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
          )
        ELSE 0
      END, 0
    ) as progress_percentage,
    COUNT(*)::INTEGER as total_concepts,
    COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'understood'))::INTEGER as delivered_concepts,
    COUNT(*) FILTER (WHERE delivery_status = 'pending')::INTEGER as pending_concepts,
    COALESCE(
      (
        SELECT COUNT(DISTINCT equation_ref)
        FROM lesson_progress lp,
        LATERAL jsonb_array_elements_text(COALESCE(lp.equation_references, '[]'::jsonb)) as equation_ref
        WHERE lp.session_id = session_uuid
      ), 0
    )::INTEGER as equations_count,
    COUNT(DISTINCT resource_section) FILTER (WHERE resource_section IS NOT NULL)::INTEGER as resource_sections_covered,
    COALESCE(AVG(student_engagement_score) FILTER (WHERE student_engagement_score IS NOT NULL), 0) as avg_engagement_score
  FROM lesson_progress
  WHERE session_id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add concept progress with enhanced tracking
CREATE OR REPLACE FUNCTION add_concept_progress(
  session_uuid UUID,
  concept_text TEXT,
  resource_section_text TEXT DEFAULT NULL,
  equation_refs JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  progress_id UUID;
  session_exists BOOLEAN;
BEGIN
  -- Verify session exists
  SELECT EXISTS(
    SELECT 1 FROM lesson_sessions 
    WHERE id = session_uuid
  ) INTO session_exists;
  
  IF NOT session_exists THEN
    RAISE EXCEPTION 'Session not found: %', session_uuid;
  END IF;
  
  -- Insert progress record
  INSERT INTO lesson_progress (
    id,
    session_id,
    concept_name,
    delivery_status,
    resource_section,
    equation_references,
    created_at
  ) VALUES (
    gen_random_uuid(),
    session_uuid,
    concept_text,
    'pending',
    resource_section_text,
    equation_refs,
    NOW()
  ) RETURNING id INTO progress_id;
  
  -- Update session progress percentage
  PERFORM update_session_progress(session_uuid);
  
  RETURN progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark concept as delivered with engagement tracking
CREATE OR REPLACE FUNCTION mark_concept_delivered(
  progress_uuid UUID,
  engagement_score NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  session_uuid UUID;
BEGIN
  -- Update progress record
  UPDATE lesson_progress 
  SET 
    delivery_status = 'delivered',
    delivery_timestamp = NOW(),
    student_engagement_score = engagement_score,
    understanding_verified = CASE 
      WHEN engagement_score IS NOT NULL AND engagement_score >= 0.7 THEN true 
      ELSE false 
    END
  WHERE id = progress_uuid
  RETURNING session_id INTO session_uuid;
  
  IF session_uuid IS NULL THEN
    RAISE EXCEPTION 'Progress record not found: %', progress_uuid;
  END IF;
  
  -- Update session progress
  PERFORM update_session_progress(session_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark concept as needing review
CREATE OR REPLACE FUNCTION mark_concept_needs_review(
  progress_uuid UUID,
  review_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  session_uuid UUID;
BEGIN
  UPDATE lesson_progress 
  SET 
    delivery_status = 'needs_review',
    delivery_timestamp = NOW(),
    notes = COALESCE(notes, '') || CASE 
      WHEN review_reason IS NOT NULL THEN ' [Review needed: ' || review_reason || ']'
      ELSE ' [Review needed]'
    END
  WHERE id = progress_uuid
  RETURNING session_id INTO session_uuid;
  
  IF session_uuid IS NULL THEN
    RAISE EXCEPTION 'Progress record not found: %', progress_uuid;
  END IF;
  
  PERFORM update_session_progress(session_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to update session progress with comprehensive tracking
CREATE OR REPLACE FUNCTION update_session_progress(session_uuid UUID)
RETURNS VOID AS $$
DECLARE
  progress_data RECORD;
  concepts_array TEXT[];
  equations_array TEXT[];
  resource_coverage JSONB;
BEGIN
  -- Get comprehensive progress data
  SELECT 
    COUNT(*) as total_concepts,
    COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'understood')) as delivered_concepts,
    COALESCE(
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'understood'))::NUMERIC / COUNT(*)::NUMERIC) * 100
        ELSE 0
      END, 0
    ) as progress_percentage,
    ARRAY_AGG(DISTINCT concept_name) FILTER (WHERE concept_name IS NOT NULL) as concepts,
    COALESCE(AVG(student_engagement_score) FILTER (WHERE student_engagement_score IS NOT NULL), 0) as avg_engagement
  INTO progress_data
  FROM lesson_progress
  WHERE session_id = session_uuid;
  
  -- Extract unique equations from all progress records
  SELECT ARRAY_AGG(DISTINCT equation_ref)
  INTO equations_array
  FROM lesson_progress lp,
  LATERAL jsonb_array_elements_text(COALESCE(lp.equation_references, '[]'::jsonb)) as equation_ref
  WHERE lp.session_id = session_uuid;
  
  -- Build resource coverage map
  SELECT jsonb_object_agg(
    resource_section,
    jsonb_build_object(
      'concepts_count', COUNT(*),
      'delivered_count', COUNT(*) FILTER (WHERE delivery_status IN ('delivered', 'understood')),
      'avg_engagement', COALESCE(AVG(student_engagement_score), 0)
    )
  )
  INTO resource_coverage
  FROM lesson_progress
  WHERE session_id = session_uuid AND resource_section IS NOT NULL
  GROUP BY resource_section;
  
  -- Update session with comprehensive progress data
  UPDATE lesson_sessions
  SET 
    progress_percentage = progress_data.progress_percentage,
    concepts_covered = COALESCE(progress_data.concepts, ARRAY[]::TEXT[]),
    equations_covered = COALESCE(equations_array, ARRAY[]::TEXT[]),
    resource_coverage = COALESCE(resource_coverage, '{}'::jsonb),
    last_content_position = jsonb_build_object(
      'total_concepts', progress_data.total_concepts,
      'delivered_concepts', progress_data.delivered_concepts,
      'avg_engagement', progress_data.avg_engagement,
      'last_updated', NOW()
    ),
    updated_at = NOW()
  WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session completion readiness
CREATE OR REPLACE FUNCTION check_session_completion_readiness(
  session_uuid UUID,
  min_concepts_threshold NUMERIC DEFAULT 0.8,
  min_equations_threshold INTEGER DEFAULT 1,
  min_resource_sections INTEGER DEFAULT 1
)
RETURNS TABLE (
  ready_for_completion BOOLEAN,
  completion_percentage NUMERIC,
  concepts_threshold_met BOOLEAN,
  equations_threshold_met BOOLEAN,
  resource_threshold_met BOOLEAN,
  missing_requirements TEXT[]
) AS $$
DECLARE
  progress_summary RECORD;
  missing_reqs TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get current progress summary
  SELECT * INTO progress_summary
  FROM get_session_progress_summary(session_uuid)
  LIMIT 1;
  
  -- Check each requirement
  IF (progress_summary.delivered_concepts::NUMERIC / GREATEST(progress_summary.total_concepts, 1)::NUMERIC) < min_concepts_threshold THEN
    missing_reqs := array_append(missing_reqs, 'Insufficient concepts delivered');
  END IF;
  
  IF progress_summary.equations_count < min_equations_threshold THEN
    missing_reqs := array_append(missing_reqs, 'Insufficient equations covered');
  END IF;
  
  IF progress_summary.resource_sections_covered < min_resource_sections THEN
    missing_reqs := array_append(missing_reqs, 'Insufficient resource sections utilized');
  END IF;
  
  RETURN QUERY SELECT 
    array_length(missing_reqs, 1) IS NULL as ready_for_completion,
    progress_summary.progress_percentage as completion_percentage,
    (progress_summary.delivered_concepts::NUMERIC / GREATEST(progress_summary.total_concepts, 1)::NUMERIC) >= min_concepts_threshold as concepts_threshold_met,
    progress_summary.equations_count >= min_equations_threshold as equations_threshold_met,
    progress_summary.resource_sections_covered >= min_resource_sections as resource_threshold_met,
    missing_reqs as missing_requirements;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_session_progress_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_concept_progress(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_concept_delivered(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_concept_needs_review(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_session_completion_readiness(UUID, NUMERIC, INTEGER, INTEGER) TO authenticated;