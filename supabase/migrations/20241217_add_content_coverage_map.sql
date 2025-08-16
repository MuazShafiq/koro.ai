-- Migration: Add missing content_coverage_map column to master_lesson_plans
-- Date: 2024-12-17
-- Purpose: Add the content_coverage_map column that the master lesson plan service expects

-- Add the missing content_coverage_map column
ALTER TABLE public.master_lesson_plans 
ADD COLUMN IF NOT EXISTS content_coverage_map JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.master_lesson_plans.content_coverage_map IS 'Maps lesson content to specific resource sections';

-- Add other missing columns that the service expects
ALTER TABLE public.master_lesson_plans 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS prerequisite_concepts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS core_concepts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS content_sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS key_equations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS practical_applications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommended_chunk_count INTEGER DEFAULT 3 CHECK (recommended_chunk_count >= 2 AND recommended_chunk_count <= 8),
ADD COLUMN IF NOT EXISTS knowledge_checkpoints JSONB DEFAULT '[]'::jsonb;

-- Add comments for the new columns
COMMENT ON COLUMN public.master_lesson_plans.title IS 'Title of the lesson plan';
COMMENT ON COLUMN public.master_lesson_plans.description IS 'Description of the lesson plan';
COMMENT ON COLUMN public.master_lesson_plans.prerequisite_concepts IS 'Required prior knowledge concepts';
COMMENT ON COLUMN public.master_lesson_plans.core_concepts IS 'Main concepts to be taught';
COMMENT ON COLUMN public.master_lesson_plans.content_sections IS 'Detailed content breakdown';
COMMENT ON COLUMN public.master_lesson_plans.key_equations IS 'Mathematical formulas and equations';
COMMENT ON COLUMN public.master_lesson_plans.practical_applications IS 'Real-world examples and applications';
COMMENT ON COLUMN public.master_lesson_plans.recommended_chunk_count IS 'Dynamic chunk count (2-8) based on content complexity';
COMMENT ON COLUMN public.master_lesson_plans.knowledge_checkpoints IS 'Key validation points for understanding';