-- Migration: Fix missing concept_hierarchy column in master_lesson_plans table
-- Date: 2024-12-17
-- Purpose: Add missing concept_hierarchy column that wasn't properly created

-- Add the missing concept_hierarchy column
ALTER TABLE public.master_lesson_plans 
ADD COLUMN IF NOT EXISTS concept_hierarchy JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.master_lesson_plans.concept_hierarchy IS 'JSON structure showing relationships between concepts';

-- Update any existing records to have empty concept hierarchy if null
UPDATE public.master_lesson_plans 
SET concept_hierarchy = '{}'::jsonb 
WHERE concept_hierarchy IS NULL;