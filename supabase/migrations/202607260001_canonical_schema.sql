-- Koro canonical Supabase baseline.
-- This migration intentionally replaces the conflicted 2024 development history.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  age integer check (age is null or age >= 0),
  location text,
  school text,
  grade_level text,
  subjects_of_interest text[] not null default '{}',
  learning_goals text,
  bio text,
  streak integer not null default 0 check (streak >= 0),
  total_sessions integer not null default 0 check (total_sessions >= 0),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  icon text not null default '📚',
  gradient text not null default 'from-blue-500 to-cyan-500',
  total_topics integer not null default 0 check (total_topics >= 0),
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (user_id, name)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  description text,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  completed boolean not null default false,
  progress integer not null default 0 check (progress between 0 and 100),
  order_index integer not null default 0,
  unique (subject_id, name)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text not null,
  icon text not null,
  unlocked boolean not null default false,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique (name, user_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  session_type text not null default 'study'
    check (session_type in ('study', 'quiz', 'practice', 'review', 'ai_tutor')),
  score integer,
  max_score integer,
  completed boolean not null default false,
  notes text
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  score integer not null,
  max_score integer not null check (max_score >= 0),
  time_taken_seconds integer not null default 0 check (time_taken_seconds >= 0),
  questions_correct integer not null default 0 check (questions_correct >= 0),
  questions_total integer not null default 0 check (questions_total >= 0)
);

create table public.daily_progress (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  user_id uuid not null references public.profiles(id) on delete cascade,
  study_time_minutes integer not null default 0 check (study_time_minutes >= 0),
  sessions_completed integer not null default 0 check (sessions_completed >= 0),
  quizzes_taken integer not null default 0 check (quizzes_taken >= 0),
  xp_gained integer not null default 0,
  streak_maintained boolean not null default false,
  unique (date, user_id)
);

create table public.learning_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_type text not null
    check (metric_type in ('time_spent', 'accuracy', 'completion_rate', 'streak', 'level_up')),
  metric_value numeric not null,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  date date not null default current_date
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  theme text not null default 'dark',
  notifications_enabled boolean not null default true,
  study_reminders boolean not null default true,
  preferred_study_time time,
  daily_goal_minutes integer not null default 30 check (daily_goal_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  content_type text not null,
  content_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  lesson_content text not null,
  audio_url text,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  status text not null default 'generated'
    check (status in ('generated', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  current_phase text not null default 'assessment'
    check (current_phase in ('planning', 'assessment', 'delivery', 'interaction', 'completed')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'ready_for_completion', 'completed', 'cancelled')),
  lesson_plan jsonb,
  assessment_questions jsonb not null default '[]'::jsonb,
  student_responses jsonb not null default '[]'::jsonb,
  current_chunk_index integer not null default 0 check (current_chunk_index >= 0),
  welcome_audio_url text,
  concepts_covered jsonb not null default '[]'::jsonb,
  content_delivered jsonb not null default '{}'::jsonb,
  equations_covered jsonb not null default '[]'::jsonb,
  progress_percentage numeric(5,2) not null default 0
    check (progress_percentage between 0 and 100),
  resource_coverage jsonb not null default '{}'::jsonb,
  last_content_position jsonb not null default '{}'::jsonb,
  completion_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  script_content text not null,
  audio_url text,
  delivered_at timestamptz,
  student_interaction jsonb not null default '{}'::jsonb,
  chunk_type text not null default 'lesson'
    check (chunk_type in ('lesson', 'question', 'explanation', 'summary')),
  interactions_count integer not null default 0 check (interactions_count >= 0),
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, chunk_index)
);

create table public.student_assessments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  student_answer text,
  ai_evaluation jsonb,
  ai_response text,
  resources_used jsonb not null default '[]'::jsonb,
  lesson_adaptation text,
  assessment_type text not null default 'understanding'
    check (assessment_type in ('understanding', 'knowledge', 'application', 'interaction')),
  interaction_type text,
  audio_url text,
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  concept_id text,
  concept_name text not null,
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'delivered', 'understood', 'needs_review')),
  resource_section text,
  equation_references jsonb not null default '[]'::jsonb,
  student_engagement_score numeric(4,3)
    check (student_engagement_score is null or student_engagement_score between 0 and 1),
  assessment_score numeric,
  delivery_timestamp timestamptz,
  understanding_verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.master_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  chapter_title text,
  title text not null,
  description text,
  difficulty_level text not null default 'intermediate'
    check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  estimated_duration_minutes integer not null default 30 check (estimated_duration_minutes > 0),
  learning_objectives jsonb not null default '[]'::jsonb,
  prerequisite_concepts jsonb not null default '[]'::jsonb,
  core_concepts jsonb not null default '[]'::jsonb,
  concept_hierarchy jsonb not null default '{}'::jsonb,
  content_sections jsonb not null default '[]'::jsonb,
  key_equations jsonb not null default '[]'::jsonb,
  practical_applications jsonb not null default '[]'::jsonb,
  recommended_chunk_count integer not null default 3
    check (recommended_chunk_count between 2 and 8),
  chunk_structure jsonb not null default '[]'::jsonb,
  assessment_criteria jsonb not null default '[]'::jsonb,
  knowledge_checkpoints jsonb not null default '[]'::jsonb,
  resource_references jsonb not null default '[]'::jsonb,
  content_coverage_map jsonb not null default '{}'::jsonb,
  comprehensive_plan jsonb not null default '{}'::jsonb,
  chunks jsonb not null default '[]'::jsonb,
  key_concepts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  version integer not null default 1 check (version >= 1),
  is_active boolean not null default true,
  unique (subject_id, topic_id, version)
);

create index subjects_user_id_idx on public.subjects(user_id);
create index topics_subject_id_idx on public.topics(subject_id);
create index study_sessions_user_created_idx on public.study_sessions(user_id, created_at desc);
create index quiz_attempts_user_created_idx on public.quiz_attempts(user_id, created_at desc);
create index daily_progress_user_date_idx on public.daily_progress(user_id, date desc);
create index resources_subject_topic_idx on public.resources(subject_id, topic_id);
create index lessons_user_subject_idx on public.lessons(user_id, subject_id);
create index lesson_sessions_user_created_idx on public.lesson_sessions(user_id, created_at desc);
create index lesson_sessions_status_idx on public.lesson_sessions(status);
create index lesson_chunks_session_idx on public.lesson_chunks(session_id, chunk_index);
create index student_assessments_session_idx on public.student_assessments(session_id, created_at);
create index lesson_progress_session_idx on public.lesson_progress(session_id, created_at);
create index lesson_progress_status_idx on public.lesson_progress(delivery_status);
create index master_lesson_plans_lookup_idx
  on public.master_lesson_plans(subject_id, topic_id, is_active, version desc);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger subjects_touch_updated_at
  before update on public.subjects
  for each row execute function public.touch_updated_at();
create trigger topics_touch_updated_at
  before update on public.topics
  for each row execute function public.touch_updated_at();
create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();
create trigger resources_touch_updated_at
  before update on public.resources
  for each row execute function public.touch_updated_at();
create trigger lessons_touch_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();
create trigger lesson_sessions_touch_updated_at
  before update on public.lesson_sessions
  for each row execute function public.touch_updated_at();
create trigger lesson_progress_touch_updated_at
  before update on public.lesson_progress
  for each row execute function public.touch_updated_at();
create trigger master_lesson_plans_touch_updated_at
  before update on public.master_lesson_plans
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    subjects_of_interest,
    learning_goals
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    case
      when new.raw_user_meta_data ->> 'subjects_of_interest' is null then '{}'::text[]
      else string_to_array(new.raw_user_meta_data ->> 'subjects_of_interest', ',')
    end,
    new.raw_user_meta_data ->> 'learning_goals'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles when the project already has users before this migration.
insert into public.profiles (id, full_name, avatar_url)
select
  id,
  raw_user_meta_data ->> 'full_name',
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_subject_owner(subject_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.subjects
    where id = subject_uuid
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_session_owner(session_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.lesson_sessions
    where id = session_uuid
      and user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.achievements enable row level security;
alter table public.study_sessions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.daily_progress enable row level security;
alter table public.learning_analytics enable row level security;
alter table public.user_preferences enable row level security;
alter table public.resources enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.lesson_chunks enable row level security;
alter table public.student_assessments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.master_lesson_plans enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy subjects_select_own on public.subjects
  for select to authenticated using (user_id = auth.uid());
create policy subjects_insert_own on public.subjects
  for insert to authenticated with check (user_id = auth.uid());
create policy subjects_update_own on public.subjects
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy subjects_delete_own on public.subjects
  for delete to authenticated using (user_id = auth.uid());

create policy topics_select_own on public.topics
  for select to authenticated using (public.is_subject_owner(subject_id));
create policy topics_insert_own on public.topics
  for insert to authenticated with check (public.is_subject_owner(subject_id));
create policy topics_update_own on public.topics
  for update to authenticated using (public.is_subject_owner(subject_id))
  with check (public.is_subject_owner(subject_id));
create policy topics_delete_own on public.topics
  for delete to authenticated using (public.is_subject_owner(subject_id));

create policy achievements_own on public.achievements
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_sessions_own on public.study_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy quiz_attempts_own on public.quiz_attempts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy daily_progress_own on public.daily_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy learning_analytics_own on public.learning_analytics
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_preferences_own on public.user_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy resources_select_own on public.resources
  for select to authenticated using (public.is_subject_owner(subject_id));
create policy resources_insert_own on public.resources
  for insert to authenticated with check (public.is_subject_owner(subject_id));
create policy resources_update_own on public.resources
  for update to authenticated using (public.is_subject_owner(subject_id))
  with check (public.is_subject_owner(subject_id));
create policy resources_delete_own on public.resources
  for delete to authenticated using (public.is_subject_owner(subject_id));

create policy lessons_own on public.lessons
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_sessions_own on public.lesson_sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_chunks_own on public.lesson_chunks
  for all to authenticated using (public.is_session_owner(session_id))
  with check (public.is_session_owner(session_id));
create policy student_assessments_own on public.student_assessments
  for all to authenticated using (public.is_session_owner(session_id))
  with check (public.is_session_owner(session_id));
create policy lesson_progress_own on public.lesson_progress
  for all to authenticated using (public.is_session_owner(session_id))
  with check (public.is_session_owner(session_id));
create policy master_lesson_plans_select_own on public.master_lesson_plans
  for select to authenticated using (public.is_subject_owner(subject_id));
create policy master_lesson_plans_insert_own on public.master_lesson_plans
  for insert to authenticated with check (public.is_subject_owner(subject_id));
create policy master_lesson_plans_update_own on public.master_lesson_plans
  for update to authenticated using (public.is_subject_owner(subject_id))
  with check (public.is_subject_owner(subject_id));

create or replace function public.get_resources_by_topic(
  subject_uuid uuid,
  topic_uuid uuid
)
returns table (
  id uuid,
  title text,
  description text,
  file_url text,
  content_type text,
  content_text text
)
language sql
stable
security invoker
set search_path = public
as $$
  select r.id, r.title, r.description, r.file_url, r.content_type, r.content_text
  from public.resources r
  where r.subject_id = subject_uuid
    and r.topic_id is not distinct from topic_uuid
  order by r.created_at desc;
$$;

create or replace function public.create_lesson(
  user_uuid uuid,
  subject_uuid uuid,
  topic_uuid uuid,
  lesson_text text,
  audio_file_url text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  lesson_id uuid;
begin
  if user_uuid <> auth.uid() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  insert into public.lessons (
    user_id, subject_id, topic_id, lesson_content, audio_url
  )
  values (
    user_uuid, subject_uuid, topic_uuid, lesson_text, audio_file_url
  )
  returning id into lesson_id;

  return lesson_id;
end;
$$;

create or replace function public.update_lesson_audio(
  lesson_uuid uuid,
  audio_file_url text
)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  update public.lessons
  set audio_url = audio_file_url
  where id = lesson_uuid
    and user_id = auth.uid();

  if not found then
    raise exception 'Lesson not found or access denied' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_or_create_master_lesson_plan(
  subject_uuid uuid,
  topic_uuid uuid
)
returns uuid
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  plan_id uuid;
begin
  if not public.is_subject_owner(subject_uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select id into plan_id
  from public.master_lesson_plans
  where subject_id = subject_uuid
    and topic_id is not distinct from topic_uuid
    and is_active
  order by version desc
  limit 1;

  return plan_id;
end;
$$;

create or replace function public.get_user_analytics(user_uuid uuid)
returns json
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
declare
  result json;
begin
  if user_uuid <> auth.uid() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select json_build_object(
    'total_study_time', coalesce(sum(duration_minutes), 0),
    'total_sessions', count(*),
    'average_session_time', coalesce(avg(duration_minutes), 0),
    'quiz_accuracy', (
      select coalesce(avg(
        case when max_score > 0 then (score::numeric / max_score::numeric) * 100 else 0 end
      ), 0)
      from public.quiz_attempts
      where user_id = user_uuid
    ),
    'subjects_studied', count(distinct subject_id),
    'current_streak', (select streak from public.profiles where id = user_uuid),
    'total_xp', (select xp from public.profiles where id = user_uuid),
    'level', (select level from public.profiles where id = user_uuid)
  )
  into result
  from public.study_sessions
  where user_id = user_uuid;

  return result;
end;
$$;

create or replace function public.update_daily_progress(
  user_uuid uuid,
  study_minutes integer,
  session_completed boolean,
  quiz_taken boolean,
  xp_gained integer
)
returns void
language plpgsql
security invoker
set search_path = public, auth
as $$
begin
  if user_uuid <> auth.uid() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  insert into public.daily_progress (
    date,
    user_id,
    study_time_minutes,
    sessions_completed,
    quizzes_taken,
    xp_gained
  )
  values (
    current_date,
    user_uuid,
    greatest(study_minutes, 0),
    case when session_completed then 1 else 0 end,
    case when quiz_taken then 1 else 0 end,
    xp_gained
  )
  on conflict (date, user_id) do update
  set
    study_time_minutes = public.daily_progress.study_time_minutes + excluded.study_time_minutes,
    sessions_completed = public.daily_progress.sessions_completed + excluded.sessions_completed,
    quizzes_taken = public.daily_progress.quizzes_taken + excluded.quizzes_taken,
    xp_gained = public.daily_progress.xp_gained + excluded.xp_gained;
end;
$$;

create or replace function public.get_weekly_progress(user_uuid uuid)
returns json
language plpgsql
stable
security invoker
set search_path = public, auth
as $$
declare
  result json;
begin
  if user_uuid <> auth.uid() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select coalesce(
    json_agg(
      json_build_object(
        'date', date,
        'study_time', study_time_minutes,
        'sessions', sessions_completed,
        'quizzes', quizzes_taken,
        'xp', xp_gained
      )
      order by date
    ),
    '[]'::json
  )
  into result
  from public.daily_progress
  where user_id = user_uuid
    and date >= current_date - 6;

  return result;
end;
$$;

create or replace function public.update_session_progress(session_uuid uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  total_count integer;
  delivered_count integer;
  progress_value numeric(5,2);
  concepts_value jsonb;
  equations_value jsonb;
  resource_value jsonb;
  engagement_value numeric;
begin
  if not public.is_session_owner(session_uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  select
    count(*)::integer,
    count(*) filter (where delivery_status in ('delivered', 'understood'))::integer,
    coalesce(
      jsonb_agg(to_jsonb(concept_name) order by created_at)
        filter (where concept_name is not null),
      '[]'::jsonb
    ),
    coalesce(avg(student_engagement_score), 0)
  into total_count, delivered_count, concepts_value, engagement_value
  from public.lesson_progress
  where session_id = session_uuid;

  progress_value := case
    when total_count = 0 then 0
    else round((delivered_count::numeric / total_count::numeric) * 100, 2)
  end;

  select coalesce(jsonb_agg(to_jsonb(equation_text)), '[]'::jsonb)
  into equations_value
  from (
    select distinct equation_text
    from public.lesson_progress lp
    cross join lateral jsonb_array_elements_text(
      lp.equation_references
    ) as equation_items(equation_text)
    where lp.session_id = session_uuid
  ) equations;

  select coalesce(
    jsonb_object_agg(
      resource_section,
      jsonb_build_object(
        'concepts_count', concepts_count,
        'delivered_count', delivered_count
      )
    ),
    '{}'::jsonb
  )
  into resource_value
  from (
    select
      resource_section,
      count(*)::integer as concepts_count,
      count(*) filter (
        where delivery_status in ('delivered', 'understood')
      )::integer as delivered_count
    from public.lesson_progress
    where session_id = session_uuid
      and resource_section is not null
    group by resource_section
  ) resource_counts;

  update public.lesson_sessions
  set
    progress_percentage = progress_value,
    concepts_covered = concepts_value,
    equations_covered = equations_value,
    resource_coverage = resource_value,
    last_content_position = jsonb_build_object(
      'total_concepts', total_count,
      'delivered_concepts', delivered_count,
      'avg_engagement', engagement_value,
      'last_updated', now()
    )
  where id = session_uuid;
end;
$$;

create or replace function public.get_session_progress_summary(session_uuid uuid)
returns table (
  progress_percentage numeric,
  total_concepts integer,
  delivered_concepts integer,
  pending_concepts integer,
  equations_count integer,
  resource_sections_covered integer,
  avg_engagement_score numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.is_session_owner(session_uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select
    case
      when count(lp.id) = 0 then 0::numeric
      else round(
        (
          count(lp.id) filter (
            where lp.delivery_status in ('delivered', 'understood')
          )
        )::numeric / count(lp.id)::numeric * 100,
        2
      )
    end,
    count(lp.id)::integer,
    count(lp.id) filter (
      where lp.delivery_status in ('delivered', 'understood')
    )::integer,
    count(lp.id) filter (where lp.delivery_status = 'pending')::integer,
    (
      select count(distinct equation_text)::integer
      from public.lesson_progress equation_progress
      cross join lateral jsonb_array_elements_text(
        equation_progress.equation_references
      ) as equation_items(equation_text)
      where equation_progress.session_id = session_uuid
    ),
    count(distinct lp.resource_section) filter (
      where lp.resource_section is not null
    )::integer,
    coalesce(avg(lp.student_engagement_score), 0)::numeric
  from public.lesson_progress lp
  where lp.session_id = session_uuid;
end;
$$;

create or replace function public.add_concept_progress(
  session_uuid uuid,
  concept_text text,
  resource_section_text text default null,
  equation_refs jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  progress_id uuid;
begin
  if not public.is_session_owner(session_uuid) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  insert into public.lesson_progress (
    session_id,
    concept_name,
    resource_section,
    equation_references
  )
  values (
    session_uuid,
    concept_text,
    resource_section_text,
    coalesce(equation_refs, '[]'::jsonb)
  )
  returning id into progress_id;

  perform public.update_session_progress(session_uuid);
  return progress_id;
end;
$$;

create or replace function public.mark_concept_delivered(
  progress_uuid uuid,
  engagement_score numeric default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  session_uuid uuid;
begin
  select session_id into session_uuid
  from public.lesson_progress
  where id = progress_uuid;

  if session_uuid is null or not public.is_session_owner(session_uuid) then
    raise exception 'Progress not found or access denied' using errcode = '42501';
  end if;

  update public.lesson_progress
  set
    delivery_status = 'delivered',
    delivery_timestamp = now(),
    student_engagement_score = case
      when engagement_score is null then null
      else least(greatest(engagement_score, 0), 1)
    end,
    understanding_verified = coalesce(engagement_score, 0) >= 0.7
  where id = progress_uuid;

  perform public.update_session_progress(session_uuid);
end;
$$;

create or replace function public.check_session_completion_readiness(
  session_uuid uuid,
  min_concepts_threshold numeric default 0.8,
  min_equations_threshold integer default 1,
  min_resource_sections integer default 1
)
returns table (
  ready_for_completion boolean,
  completion_percentage numeric,
  concepts_threshold_met boolean,
  equations_threshold_met boolean,
  resource_threshold_met boolean,
  missing_requirements text[]
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  summary record;
  missing text[] := '{}'::text[];
  concept_ratio numeric;
begin
  select * into summary
  from public.get_session_progress_summary(session_uuid)
  limit 1;

  concept_ratio := summary.delivered_concepts::numeric
    / greatest(summary.total_concepts, 1)::numeric;

  if concept_ratio < min_concepts_threshold then
    missing := array_append(missing, 'Insufficient concepts delivered');
  end if;
  if summary.equations_count < min_equations_threshold then
    missing := array_append(missing, 'Insufficient equations covered');
  end if;
  if summary.resource_sections_covered < min_resource_sections then
    missing := array_append(missing, 'Insufficient resource sections utilized');
  end if;

  return query select
    cardinality(missing) = 0,
    summary.progress_percentage,
    concept_ratio >= min_concepts_threshold,
    summary.equations_count >= min_equations_threshold,
    summary.resource_sections_covered >= min_resource_sections,
    missing;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_subject_owner(uuid) to authenticated;
grant execute on function public.is_session_owner(uuid) to authenticated;
grant execute on function public.get_resources_by_topic(uuid, uuid) to authenticated;
grant execute on function public.create_lesson(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.update_lesson_audio(uuid, text) to authenticated;
grant execute on function public.get_or_create_master_lesson_plan(uuid, uuid) to authenticated;
grant execute on function public.get_user_analytics(uuid) to authenticated;
grant execute on function public.update_daily_progress(uuid, integer, boolean, boolean, integer)
  to authenticated;
grant execute on function public.get_weekly_progress(uuid) to authenticated;
grant execute on function public.update_session_progress(uuid) to authenticated;
grant execute on function public.get_session_progress_summary(uuid) to authenticated;
grant execute on function public.add_concept_progress(uuid, text, text, jsonb) to authenticated;
grant execute on function public.mark_concept_delivered(uuid, numeric) to authenticated;
grant execute on function public.check_session_completion_readiness(uuid, numeric, integer, integer)
  to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('resources', 'resources', true, 52428800),
  ('lessons', 'lessons', true, 10485760),
  ('audio', 'audio', true, 10485760)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

create policy storage_public_read_koro
  on storage.objects for select
  to public
  using (bucket_id in ('resources', 'lessons', 'audio'));

create policy storage_authenticated_insert_koro
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('resources', 'lessons', 'audio'));

create policy storage_owner_update_koro
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('resources', 'lessons', 'audio')
    and owner_id = auth.uid()::text
  )
  with check (
    bucket_id in ('resources', 'lessons', 'audio')
    and owner_id = auth.uid()::text
  );

create policy storage_owner_delete_koro
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('resources', 'lessons', 'audio')
    and owner_id = auth.uid()::text
  );
