-- Create profiles table that extends the auth.users table
CREATE TABLE public.profiles (
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
CREATE TABLE public.subjects (
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
CREATE TABLE public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL
);

-- Create study_sessions table for tracking user study activity
CREATE TABLE public.study_sessions (
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
CREATE TABLE public.quiz_attempts (
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
CREATE TABLE public.daily_progress (
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
CREATE TABLE public.learning_analytics (
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
CREATE TABLE public.user_preferences (
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

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();