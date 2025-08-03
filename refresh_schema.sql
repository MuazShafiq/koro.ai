-- Minimal script to fix lesson_sessions table and refresh schema cache
-- Run this in Supabase SQL Editor

-- Drop the problematic table completely
DROP TABLE IF EXISTS public.lesson_sessions CASCADE;

-- Recreate lesson_sessions table with correct 'status' column
CREATE TABLE public.lesson_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  current_phase TEXT DEFAULT 'planning' CHECK (current_phase IN ('planning', 'assessment', 'delivery', 'interaction', 'completed')) NOT NULL,
  lesson_plan JSONB,
  student_responses JSONB DEFAULT '[]'::jsonb,
  current_chunk_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own lesson sessions."
  ON public.lesson_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lesson sessions."
  ON public.lesson_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lesson sessions."
  ON public.lesson_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lesson sessions."
  ON public.lesson_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative cache refresh (if NOTIFY doesn't work)
-- You can also restart your Supabase project or wait a few minutes for auto-refresh