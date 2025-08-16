-- Migration: Fix RLS policies for master_lesson_plans
-- Date: 2024-12-17
-- Purpose: Allow unrestricted access for service operations

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Anyone can create master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Anyone can update master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Service role can manage master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Authenticated users can create master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Authenticated users can update master lesson plans" ON public.master_lesson_plans;
DROP POLICY IF EXISTS "Service role full access to master lesson plans" ON public.master_lesson_plans;

-- Create permissive policies for all operations
CREATE POLICY "Allow all select on master lesson plans" ON public.master_lesson_plans
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert on master lesson plans" ON public.master_lesson_plans
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update on master lesson plans" ON public.master_lesson_plans
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete on master lesson plans" ON public.master_lesson_plans
  FOR DELETE USING (true);

-- Ensure proper permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.master_lesson_plans TO anon, authenticated;
GRANT ALL PRIVILEGES ON public.master_lesson_plans TO service_role;