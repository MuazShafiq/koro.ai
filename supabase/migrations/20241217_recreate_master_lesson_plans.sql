-- Migration: Recreate master_lesson_plans table with correct schema
-- Date: 2024-12-17
-- Purpose: Fix schema mismatch and RLS policy issues

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_or_create_master_lesson_plan(UUID, UUID);

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.master_lesson_plans CASCADE;

-- Create master_lesson_plans table with correct schema
CREATE TABLE public.master_lesson_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  
  -- Core lesson plan metadata
  title TEXT NOT NULL,
  description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Comprehensive lesson structure
  learning_objectives JSONB DEFAULT '[]'::jsonb,
  prerequisite_concepts JSONB DEFAULT '[]'::jsonb,
  core_concepts JSONB DEFAULT '[]'::jsonb,
  concept_hierarchy JSONB DEFAULT '{}'::jsonb,
  
  -- Content organization
  content_sections JSONB DEFAULT '[]'::jsonb,
  key_equations JSONB DEFAULT '[]'::jsonb,
  practical_applications JSONB DEFAULT '[]'::jsonb,
  
  -- Dynamic chunk planning
  recommended_chunk_count INTEGER DEFAULT 3 CHECK (recommended_chunk_count >= 2 AND recommended_chunk_count <= 8),
  chunk_structure JSONB DEFAULT '[]'::jsonb,
  
  -- Assessment and evaluation
  assessment_criteria JSONB DEFAULT '[]'::jsonb,
  knowledge_checkpoints JSONB DEFAULT '[]'::jsonb,
  
  -- Resource mapping
  resource_references JSONB DEFAULT '[]'::jsonb,
  content_coverage_map JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_master_lesson_plans_subject_topic ON public.master_lesson_plans(subject_id, topic_id);
CREATE INDEX idx_master_lesson_plans_difficulty ON public.master_lesson_plans(difficulty_level);
CREATE INDEX idx_master_lesson_plans_active ON public.master_lesson_plans(is_active);
CREATE INDEX idx_master_lesson_plans_created ON public.master_lesson_plans(created_at);

-- Create updated_at trigger
CREATE TRIGGER set_master_lesson_plans_updated_at
  BEFORE UPDATE ON public.master_lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add RLS policies
ALTER TABLE public.master_lesson_plans ENABLE ROW LEVEL SECURITY;

-- Policy for anyone to read master lesson plans
CREATE POLICY "Anyone can view master lesson plans" ON public.master_lesson_plans
  FOR SELECT USING (true);

-- Policy for anyone to insert master lesson plans (for service operations)
CREATE POLICY "Anyone can create master lesson plans" ON public.master_lesson_plans
  FOR INSERT WITH CHECK (true);

-- Policy for anyone to update master lesson plans
CREATE POLICY "Anyone can update master lesson plans" ON public.master_lesson_plans
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy for service role to have full access
CREATE POLICY "Service role can manage master lesson plans" ON public.master_lesson_plans
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE public.master_lesson_plans IS 'Comprehensive master lesson plans stored separately from delivery plans';
COMMENT ON COLUMN public.master_lesson_plans.learning_objectives IS 'Specific, measurable learning goals for the lesson';
COMMENT ON COLUMN public.master_lesson_plans.concept_hierarchy IS 'JSON structure showing relationships between concepts';
COMMENT ON COLUMN public.master_lesson_plans.chunk_structure IS 'Detailed breakdown of lesson chunks with objectives and content';
COMMENT ON COLUMN public.master_lesson_plans.recommended_chunk_count IS 'Dynamic chunk count (2-8) based on content complexity';
COMMENT ON COLUMN public.master_lesson_plans.content_coverage_map IS 'Maps lesson content to specific resource sections';

-- Recreate the function
CREATE OR REPLACE FUNCTION public.get_or_create_master_lesson_plan(
  subject_uuid UUID,
  topic_uuid UUID
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  plan_id UUID;
BEGIN
  -- Try to find existing active master lesson plan
  SELECT id INTO plan_id
  FROM public.master_lesson_plans
  WHERE subject_id = subject_uuid 
    AND topic_id = topic_uuid 
    AND is_active = true
  ORDER BY version DESC
  LIMIT 1;
  
  -- Return existing plan ID if found
  IF plan_id IS NOT NULL THEN
    RETURN plan_id;
  END IF;
  
  -- If no plan exists, return NULL (will trigger creation)
  RETURN NULL;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_lesson_plans TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.master_lesson_plans TO service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_master_lesson_plan TO anon, authenticated, service_role;