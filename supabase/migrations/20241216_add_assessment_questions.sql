-- Migration: Add assessment_questions column to lesson_sessions table
-- Date: 2024-12-16
-- Purpose: Add missing assessment_questions column to fix database schema error

-- Add assessment_questions column to lesson_sessions table
ALTER TABLE public.lesson_sessions 
ADD COLUMN assessment_questions JSONB DEFAULT '[]'::jsonb;

-- Add index for assessment_questions for better query performance
CREATE INDEX idx_lesson_sessions_assessment_questions ON public.lesson_sessions USING GIN(assessment_questions);