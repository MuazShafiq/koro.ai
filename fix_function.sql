-- Complete Supabase Database Setup Script
-- This script can be run safely on existing databases

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_analytics(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_progress(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_weekly_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_resources_by_topic(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_lesson(UUID, UUID, UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_lesson_audio(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Create profiles table that extends the auth.users table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  age INTEGER,
  location TEXT,
  school TEXT,
  grade_level TEXT,
  subjects_of_interest TEXT[],
  learning_goals TEXT,
  bio TEXT,
  streak INTEGER DEFAULT 0 NOT NULL,
  total_sessions INTEGER DEFAULT 0 NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  gradient TEXT NOT NULL,
  total_topics INTEGER DEFAULT 0 NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL
);

-- Create topics table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL
);

-- Create study_sessions table for tracking user study activity
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('study', 'quiz', 'practice', 'review')),
  score INTEGER,
  max_score INTEGER,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT
);

-- Create quiz_attempts table for tracking quiz performance
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  questions_correct INTEGER NOT NULL,
  questions_total INTEGER NOT NULL
);

-- Create daily_progress table for tracking daily activity
CREATE TABLE IF NOT EXISTS public.daily_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  study_time_minutes INTEGER DEFAULT 0 NOT NULL,
  sessions_completed INTEGER DEFAULT 0 NOT NULL,
  quizzes_taken INTEGER DEFAULT 0 NOT NULL,
  xp_gained INTEGER DEFAULT 0 NOT NULL,
  streak_maintained BOOLEAN DEFAULT FALSE NOT NULL,
  UNIQUE(date, user_id)
);

-- Create learning_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS public.learning_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('time_spent', 'accuracy', 'completion_rate', 'streak', 'level_up')),
  metric_value DECIMAL NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE NOT NULL
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'light' NOT NULL,
  notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  study_reminders BOOLEAN DEFAULT TRUE NOT NULL,
  preferred_study_time TIME,
  daily_goal_minutes INTEGER DEFAULT 30 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create resources table for storing educational content
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create lessons table for storing generated lesson plans
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
  lesson_content TEXT NOT NULL,
  audio_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Drop AI tutor tables if they exist to ensure correct schema
DROP TABLE IF EXISTS public.student_assessments CASCADE;
DROP TABLE IF EXISTS public.lesson_chunks CASCADE;
DROP TABLE IF EXISTS public.lesson_sessions CASCADE;

-- Create lesson_sessions table for AI tutor sessions
CREATE TABLE IF NOT EXISTS public.lesson_sessions (
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

-- Create lesson_chunks table for storing lesson segments
CREATE TABLE IF NOT EXISTS public.lesson_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE NOT NULL,
  chunk_index INTEGER NOT NULL,
  script_content TEXT NOT NULL,
  audio_url TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  student_interaction JSONB DEFAULT '{}'::jsonb,
  chunk_type TEXT DEFAULT 'lesson' CHECK (chunk_type IN ('lesson', 'question', 'explanation', 'summary')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create student_assessments table for Q&A tracking
CREATE TABLE IF NOT EXISTS public.student_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  ai_evaluation JSONB,
  assessment_type TEXT DEFAULT 'understanding' CHECK (assessment_type IN ('understanding', 'knowledge', 'application', 'interaction')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

DROP POLICY IF EXISTS "Subjects are viewable by everyone." ON public.subjects;
DROP POLICY IF EXISTS "Users can insert their own subjects." ON public.subjects;
DROP POLICY IF EXISTS "Users can update their own subjects." ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their own subjects." ON public.subjects;

DROP POLICY IF EXISTS "Topics are viewable by everyone." ON public.topics;
DROP POLICY IF EXISTS "Users can insert topics for their subjects." ON public.topics;
DROP POLICY IF EXISTS "Users can update topics for their subjects." ON public.topics;
DROP POLICY IF EXISTS "Users can delete topics for their subjects." ON public.topics;

DROP POLICY IF EXISTS "Achievements are viewable by everyone." ON public.achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements." ON public.achievements;
DROP POLICY IF EXISTS "Users can update their own achievements." ON public.achievements;
DROP POLICY IF EXISTS "Users can delete their own achievements." ON public.achievements;

DROP POLICY IF EXISTS "Users can view their own study sessions." ON public.study_sessions;
DROP POLICY IF EXISTS "Users can insert their own study sessions." ON public.study_sessions;
DROP POLICY IF EXISTS "Users can update their own study sessions." ON public.study_sessions;
DROP POLICY IF EXISTS "Users can delete their own study sessions." ON public.study_sessions;

DROP POLICY IF EXISTS "Users can view their own quiz attempts." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can insert their own quiz attempts." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can update their own quiz attempts." ON public.quiz_attempts;
DROP POLICY IF EXISTS "Users can delete their own quiz attempts." ON public.quiz_attempts;

DROP POLICY IF EXISTS "Users can view their own daily progress." ON public.daily_progress;
DROP POLICY IF EXISTS "Users can insert their own daily progress." ON public.daily_progress;
DROP POLICY IF EXISTS "Users can update their own daily progress." ON public.daily_progress;
DROP POLICY IF EXISTS "Users can delete their own daily progress." ON public.daily_progress;

DROP POLICY IF EXISTS "Users can view their own learning analytics." ON public.learning_analytics;
DROP POLICY IF EXISTS "Users can insert their own learning analytics." ON public.learning_analytics;
DROP POLICY IF EXISTS "Users can update their own learning analytics." ON public.learning_analytics;
DROP POLICY IF EXISTS "Users can delete their own learning analytics." ON public.learning_analytics;

DROP POLICY IF EXISTS "Users can view their own preferences." ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences." ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences." ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences." ON public.user_preferences;

DROP POLICY IF EXISTS "Anyone can view resources." ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can insert resources." ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can update resources." ON public.resources;
DROP POLICY IF EXISTS "Authenticated users can delete resources." ON public.resources;

DROP POLICY IF EXISTS "Users can view their own lessons." ON public.lessons;
DROP POLICY IF EXISTS "Users can insert their own lessons." ON public.lessons;
DROP POLICY IF EXISTS "Users can update their own lessons." ON public.lessons;
DROP POLICY IF EXISTS "Users can delete their own lessons." ON public.lessons;

DROP POLICY IF EXISTS "Users can view their own lesson sessions." ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can insert their own lesson sessions." ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can update their own lesson sessions." ON public.lesson_sessions;
DROP POLICY IF EXISTS "Users can delete their own lesson sessions." ON public.lesson_sessions;

DROP POLICY IF EXISTS "Users can view chunks from their sessions." ON public.lesson_chunks;
DROP POLICY IF EXISTS "Users can insert chunks for their sessions." ON public.lesson_chunks;
DROP POLICY IF EXISTS "Users can update chunks from their sessions." ON public.lesson_chunks;
DROP POLICY IF EXISTS "Users can delete chunks from their sessions." ON public.lesson_chunks;

DROP POLICY IF EXISTS "Users can view their own assessments." ON public.student_assessments;
DROP POLICY IF EXISTS "Users can insert their own assessments." ON public.student_assessments;
DROP POLICY IF EXISTS "Users can update their own assessments." ON public.student_assessments;
DROP POLICY IF EXISTS "Users can delete their own assessments." ON public.student_assessments;

-- Create policies for profiles table
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for subjects table
CREATE POLICY "Subjects are viewable by everyone."
  ON public.subjects FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own subjects."
  ON public.subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects."
  ON public.subjects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects."
  ON public.subjects FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for topics table
CREATE POLICY "Topics are viewable by everyone."
  ON public.topics FOR SELECT
  USING (true);

CREATE POLICY "Users can insert topics for their subjects."
  ON public.topics FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.subjects WHERE id = subject_id
  ));

CREATE POLICY "Users can update topics for their subjects."
  ON public.topics FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.subjects WHERE id = subject_id
  ));

CREATE POLICY "Users can delete topics for their subjects."
  ON public.topics FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.subjects WHERE id = subject_id
  ));

-- Create policies for achievements table
CREATE POLICY "Achievements are viewable by everyone."
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own achievements."
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements."
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements."
  ON public.achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for study_sessions table
CREATE POLICY "Users can view their own study sessions."
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study sessions."
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions."
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions."
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for quiz_attempts table
CREATE POLICY "Users can view their own quiz attempts."
  ON public.quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts."
  ON public.quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz attempts."
  ON public.quiz_attempts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quiz attempts."
  ON public.quiz_attempts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for daily_progress table
CREATE POLICY "Users can view their own daily progress."
  ON public.daily_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily progress."
  ON public.daily_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily progress."
  ON public.daily_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily progress."
  ON public.daily_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for learning_analytics table
CREATE POLICY "Users can view their own learning analytics."
  ON public.learning_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning analytics."
  ON public.learning_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning analytics."
  ON public.learning_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning analytics."
  ON public.learning_analytics FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for user_preferences table
CREATE POLICY "Users can view their own preferences."
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences."
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences."
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences."
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for resources table
CREATE POLICY "Anyone can view resources."
  ON public.resources FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert resources."
  ON public.resources FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update resources."
  ON public.resources FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete resources."
  ON public.resources FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create policies for lessons table
CREATE POLICY "Users can view their own lessons."
  ON public.lessons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lessons."
  ON public.lessons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lessons."
  ON public.lessons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lessons."
  ON public.lessons FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for lesson_sessions table
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

-- Create policies for lesson_chunks table
CREATE POLICY "Users can view chunks from their sessions."
  ON public.lesson_chunks FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can insert chunks for their sessions."
  ON public.lesson_chunks FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can update chunks from their sessions."
  ON public.lesson_chunks FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can delete chunks from their sessions."
  ON public.lesson_chunks FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

-- Create policies for student_assessments table
CREATE POLICY "Users can view their own assessments."
  ON public.student_assessments FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can insert their own assessments."
  ON public.student_assessments FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can update their own assessments."
  ON public.student_assessments FOR UPDATE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

CREATE POLICY "Users can delete their own assessments."
  ON public.student_assessments FOR DELETE
  USING (auth.uid() IN (
    SELECT user_id FROM public.lesson_sessions WHERE id = session_id
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_subject_topic ON public.resources(subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_resources_content_type ON public.resources(content_type);
CREATE INDEX IF NOT EXISTS idx_lessons_user_subject ON public.lessons(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_user_subject ON public.lesson_sessions(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sessions_status ON public.lesson_sessions(status);
CREATE INDEX IF NOT EXISTS idx_lesson_chunks_session ON public.lesson_chunks(session_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_student_assessments_session ON public.student_assessments(session_id);

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, age, location, school, grade_level, subjects_of_interest, learning_goals)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'age')::INTEGER, NULL),
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'grade_level',
    CASE 
      WHEN NEW.raw_user_meta_data->>'subjects_of_interest' IS NOT NULL 
      THEN string_to_array(NEW.raw_user_meta_data->>'subjects_of_interest', ',')
      ELSE ARRAY[]::TEXT[]
    END,
    NEW.raw_user_meta_data->>'learning_goals'
  );
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Function to calculate user analytics
CREATE OR REPLACE FUNCTION public.get_user_analytics(user_uuid UUID)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_study_time', COALESCE(SUM(duration_minutes), 0),
    'total_sessions', COUNT(*),
    'average_session_time', COALESCE(AVG(duration_minutes), 0),
    'quiz_accuracy', COALESCE(AVG(CASE WHEN max_score > 0 THEN (score::DECIMAL / max_score::DECIMAL) * 100 ELSE 0 END), 0),
    'subjects_studied', COUNT(DISTINCT subject_id),
    'current_streak', (SELECT streak FROM public.profiles WHERE id = user_uuid),
    'total_xp', (SELECT xp FROM public.profiles WHERE id = user_uuid),
    'level', (SELECT level FROM public.profiles WHERE id = user_uuid)
  ) INTO result
  FROM public.study_sessions
  WHERE user_id = user_uuid;
  
  RETURN result;
END;
$$;

-- Function to update daily progress
CREATE OR REPLACE FUNCTION public.update_daily_progress(user_uuid UUID, study_minutes INTEGER, session_completed BOOLEAN, quiz_taken BOOLEAN, xp_gained INTEGER)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.daily_progress (date, user_id, study_time_minutes, sessions_completed, quizzes_taken, xp_gained)
  VALUES (
    CURRENT_DATE,
    user_uuid,
    study_minutes,
    CASE WHEN session_completed THEN 1 ELSE 0 END,
    CASE WHEN quiz_taken THEN 1 ELSE 0 END,
    xp_gained
  )
  ON CONFLICT (date, user_id)
  DO UPDATE SET
    study_time_minutes = daily_progress.study_time_minutes + EXCLUDED.study_time_minutes,
    sessions_completed = daily_progress.sessions_completed + EXCLUDED.sessions_completed,
    quizzes_taken = daily_progress.quizzes_taken + EXCLUDED.quizzes_taken,
    xp_gained = daily_progress.xp_gained + EXCLUDED.xp_gained;
END;
$$;

-- Function to get weekly progress data
CREATE OR REPLACE FUNCTION public.get_weekly_progress(user_uuid UUID)
RETURNS JSON
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'date', date,
      'study_time', study_time_minutes,
      'sessions', sessions_completed,
      'quizzes', quizzes_taken,
      'xp', xp_gained
    ) ORDER BY date
  ) INTO result
  FROM public.daily_progress
  WHERE user_id = user_uuid
    AND date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY date;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Function to get resources by subject and topic
CREATE OR REPLACE FUNCTION public.get_resources_by_topic(subject_uuid UUID, topic_uuid UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  file_url TEXT,
  content_type TEXT,
  content_text TEXT
)
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.title, r.description, r.file_url, r.content_type, r.content_text
  FROM public.resources r
  WHERE r.subject_id = subject_uuid AND r.topic_id = topic_uuid
  ORDER BY r.created_at DESC;
END;
$$;

-- Function to create a new lesson
CREATE OR REPLACE FUNCTION public.create_lesson(
  user_uuid UUID,
  subject_uuid UUID,
  topic_uuid UUID,
  lesson_text TEXT,
  audio_file_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  lesson_id UUID;
BEGIN
  INSERT INTO public.lessons (user_id, subject_id, topic_id, lesson_content, audio_url)
  VALUES (user_uuid, subject_uuid, topic_uuid, lesson_text, audio_file_url)
  RETURNING id INTO lesson_id;
  
  RETURN lesson_id;
END;
$$;

-- Function to update lesson with audio URL
CREATE OR REPLACE FUNCTION public.update_lesson_audio(lesson_uuid UUID, audio_file_url TEXT)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.lessons
  SET audio_url = audio_file_url, updated_at = timezone('utc'::text, now())
  WHERE id = lesson_uuid;
END;
$$;

-- Function to create updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Drop existing triggers before creating new ones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_lesson_sessions_updated_at ON public.lesson_sessions;
DROP TRIGGER IF EXISTS set_resources_updated_at ON public.resources;
DROP TRIGGER IF EXISTS set_lessons_updated_at ON public.lessons;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_lesson_sessions_updated_at
  BEFORE UPDATE ON public.lesson_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_resources_by_topic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_lesson(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lesson_audio(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_progress(UUID, INTEGER, BOOLEAN, BOOLEAN, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_progress(UUID) TO authenticated;