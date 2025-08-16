-- Add missing chunk_structure column to master_lesson_plans table
ALTER TABLE public.master_lesson_plans 
ADD COLUMN IF NOT EXISTS chunk_structure JSONB DEFAULT '[]'::jsonb;

-- Update the get_or_create_master_lesson_plan function to handle chunk_structure
CREATE OR REPLACE FUNCTION public.get_or_create_master_lesson_plan(
  p_subject_id UUID,
  p_topic_id UUID DEFAULT NULL,
  p_chapter_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_id UUID;
BEGIN
  -- Try to find existing plan
  SELECT id INTO plan_id
  FROM public.master_lesson_plans
  WHERE subject_id = p_subject_id
    AND (topic_id = p_topic_id OR (topic_id IS NULL AND p_topic_id IS NULL))
    AND (chapter_title = p_chapter_title OR (chapter_title IS NULL AND p_chapter_title IS NULL))
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no plan exists, create a placeholder
  IF plan_id IS NULL THEN
    INSERT INTO public.master_lesson_plans (
      subject_id,
      topic_id,
      chapter_title,
      comprehensive_plan,
      chunks,
      chunk_structure,
      learning_objectives,
      estimated_duration_minutes,
      key_concepts
    ) VALUES (
      p_subject_id,
      p_topic_id,
      COALESCE(p_chapter_title, 'Generated Lesson'),
      '{"status": "pending", "generated": false}'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      ARRAY['To be determined'],
      30,
      ARRAY['To be determined']
    )
    RETURNING id INTO plan_id;
  END IF;

  RETURN plan_id;
END;
$$;