-- Migration: Add progress tracking to lesson_sessions and create lesson_progress table
-- Date: 2024-12-16
-- Purpose: Enhance AI tutor with comprehensive progress tracking capabilities

-- Add progress tracking columns to lesson_sessions table
ALTER TABLE public.lesson_sessions 
ADD COLUMN concepts_covered JSONB DEFAULT '[]'::jsonb,
ADD COLUMN content_delivered JSONB DEFAULT '{}'::jsonb,
ADD COLUMN equations_covered JSONB DEFAULT '[]'::jsonb,
ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN resource_coverage JSONB DEFAULT '{}'::jsonb,
ADD COLUMN last_content_position TEXT DEFAULT '';

-- Create lesson_progress table for granular tracking
CREATE TABLE public.lesson_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE NOT NULL,
  concept_name TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'understood', 'needs_review')) NOT NULL,
  resource_section TEXT,
  equation_references JSONB DEFAULT '[]'::jsonb,
  student_engagement_score DECIMAL(3,2) DEFAULT 0.00 CHECK (student_engagement_score >= 0 AND student_engagement_score <= 10),
  delivery_timestamp TIMESTAMP WITH TIME ZONE,
  understanding_verified BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on lesson_progress table
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for lesson_progress table
CREATE POLICY "Users can view progress from their sessions."
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can insert progress for their sessions."
  ON public.lesson_progress FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can update progress from their sessions."
  ON public.lesson_progress FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can delete progress from their sessions."
  ON public.lesson_progress FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

-- Create performance indexes
CREATE INDEX idx_lesson_sessions_progress ON public.lesson_sessions(progress_percentage, status);
CREATE INDEX idx_lesson_sessions_concepts ON public.lesson_sessions USING GIN(concepts_covered);
CREATE INDEX idx_lesson_sessions_equations ON public.lesson_sessions USING GIN(equations_covered);
CREATE INDEX idx_lesson_sessions_resources ON public.lesson_sessions USING GIN(resource_coverage);
CREATE INDEX idx_lesson_progress_session_concept ON public.lesson_progress(session_id, concept_name);
CREATE INDEX idx_lesson_progress_status ON public.lesson_progress(delivery_status);
CREATE INDEX idx_lesson_progress_engagement ON public.lesson_progress(student_engagement_score);

-- Create updated_at trigger for lesson_progress
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to calculate and update progress percentage
CREATE OR REPLACE FUNCTION public.update_session_progress(session_uuid UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  total_concepts INTEGER;
  delivered_concepts INTEGER;
  new_percentage DECIMAL(5,2);
BEGIN
  -- Count total concepts for this session
  SELECT COUNT(*) INTO total_concepts
  FROM public.lesson_progress
  WHERE session_id = session_uuid;
  
  -- Count delivered concepts
  SELECT COUNT(*) INTO delivered_concepts
  FROM public.lesson_progress
  WHERE session_id = session_uuid 
    AND delivery_status IN ('delivered', 'understood');
  
  -- Calculate percentage
  IF total_concepts > 0 THEN
    new_percentage := (delivered_concepts::DECIMAL / total_concepts::DECIMAL) * 100;
  ELSE
    new_percentage := 0;
  END IF;
  
  -- Update lesson_sessions table
  UPDATE public.lesson_sessions
  SET progress_percentage = new_percentage,
      updated_at = timezone('utc'::text, now())
  WHERE id = session_uuid;
END;
$$;

-- Function to get session progress summary
CREATE OR REPLACE FUNCTION public.get_session_progress_summary(session_uuid UUID)
RETURNS TABLE(
  session_id UUID,
  progress_percentage DECIMAL(5,2),
  total_concepts INTEGER,
  delivered_concepts INTEGER,
  pending_concepts INTEGER,
  equations_count INTEGER,
  resource_sections_covered INTEGER,
  avg_engagement_score DECIMAL(3,2)
)
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.progress_percentage,
    COUNT(lp.id)::INTEGER as total_concepts,
    COUNT(CASE WHEN lp.delivery_status IN ('delivered', 'understood') THEN 1 END)::INTEGER as delivered_concepts,
    COUNT(CASE WHEN lp.delivery_status = 'pending' THEN 1 END)::INTEGER as pending_concepts,
    jsonb_array_length(COALESCE(ls.equations_covered, '[]'::jsonb))::INTEGER as equations_count,
    jsonb_array_length(jsonb_object_keys(COALESCE(ls.resource_coverage, '{}'::jsonb)))::INTEGER as resource_sections_covered,
    COALESCE(AVG(lp.student_engagement_score), 0)::DECIMAL(3,2) as avg_engagement_score
  FROM public.lesson_sessions ls
  LEFT JOIN public.lesson_progress lp ON ls.id = lp.session_id
  WHERE ls.id = session_uuid
  GROUP BY ls.id, ls.progress_percentage;
END;
$$;

-- Function to add concept to progress tracking
CREATE OR REPLACE FUNCTION public.add_concept_progress(
  session_uuid UUID,
  concept_text TEXT,
  resource_section_text TEXT DEFAULT NULL,
  equation_refs JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  progress_id UUID;
BEGIN
  INSERT INTO public.lesson_progress (
    session_id, 
    concept_name, 
    resource_section, 
    equation_references
  )
  VALUES (
    session_uuid, 
    concept_text, 
    resource_section_text, 
    equation_refs
  )
  RETURNING id INTO progress_id;
  
  RETURN progress_id;
END;
$$;

-- Function to mark concept as delivered
CREATE OR REPLACE FUNCTION public.mark_concept_delivered(
  progress_uuid UUID,
  engagement_score DECIMAL(3,2) DEFAULT 5.0
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  session_uuid UUID;
BEGIN
  -- Update the progress record
  UPDATE public.lesson_progress
  SET delivery_status = 'delivered',
      delivery_timestamp = timezone('utc'::text, now()),
      student_engagement_score = engagement_score,
      updated_at = timezone('utc'::text, now())
  WHERE id = progress_uuid
  RETURNING session_id INTO session_uuid;
  
  -- Update overall session progress
  PERFORM public.update_session_progress(session_uuid);
END;
$$;

COMMENT ON TABLE public.lesson_progress IS 'Granular tracking of concept delivery and student understanding in AI tutor sessions';
COMMENT ON COLUMN public.lesson_sessions.concepts_covered IS 'Array of concepts that have been covered in this session';
COMMENT ON COLUMN public.lesson_sessions.content_delivered IS 'Object tracking what content has been delivered from resources';
COMMENT ON COLUMN public.lesson_sessions.equations_covered IS 'Array of mathematical equations/formulas covered';
COMMENT ON COLUMN public.lesson_sessions.progress_percentage IS 'Overall progress percentage (0-100)';
COMMENT ON COLUMN public.lesson_sessions.resource_coverage IS 'Object tracking which sections of resources have been used';
COMMENT ON COLUMN public.lesson_sessions.last_content_position IS 'Last position in content delivery for resuming sessions';