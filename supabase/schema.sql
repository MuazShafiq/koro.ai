-- Create profiles table that extends the auth.users table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
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
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

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

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();