-- Fix chapter_title NOT NULL constraint violation
-- The masterLessonPlanService doesn't provide chapter_title field
-- Making it nullable to prevent constraint violations

ALTER TABLE public.master_lesson_plans 
ALTER COLUMN chapter_title DROP NOT NULL;

-- Add comment to explain the change
COMMENT ON COLUMN public.master_lesson_plans.chapter_title IS 'Optional chapter title - can be null if not provided by service';