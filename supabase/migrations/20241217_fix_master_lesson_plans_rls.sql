-- Fix RLS policies for master_lesson_plans table
-- Date: 2024-12-17
-- Purpose: Add INSERT policy for authenticated users to create master lesson plans

-- Add policy for authenticated users to insert master lesson plans
CREATE POLICY "Authenticated users can create master lesson plans" ON public.master_lesson_plans
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Add policy for authenticated users to update their own master lesson plans
CREATE POLICY "Authenticated users can update master lesson plans" ON public.master_lesson_plans
  FOR UPDATE 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure service role has full access (this should already exist but adding for completeness)
DROP POLICY IF EXISTS "Service role can manage master lesson plans" ON public.master_lesson_plans;
CREATE POLICY "Service role can manage master lesson plans" ON public.master_lesson_plans
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');