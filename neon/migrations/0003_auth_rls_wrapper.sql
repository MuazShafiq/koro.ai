create or replace function public.current_user_id()
returns text
language sql
stable
security definer
set search_path = auth, pg_catalog
as $$
  select auth.user_id();
$$;

revoke execute on function public.current_user_id() from public, anonymous;
grant execute on function public.current_user_id() to authenticated;

alter policy profiles_select_own on public.profiles
  using (id = public.current_user_id());
alter policy profiles_insert_own on public.profiles
  with check (id = public.current_user_id());
alter policy profiles_update_own on public.profiles
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

alter policy subjects_select_own on public.subjects
  using (user_id = public.current_user_id());
alter policy subjects_insert_own on public.subjects
  with check (user_id = public.current_user_id());
alter policy subjects_update_own on public.subjects
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy subjects_delete_own on public.subjects
  using (user_id = public.current_user_id());

alter policy achievements_own on public.achievements
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy study_sessions_own on public.study_sessions
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy quiz_attempts_own on public.quiz_attempts
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy daily_progress_own on public.daily_progress
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy learning_analytics_own on public.learning_analytics
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy user_preferences_own on public.user_preferences
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy lessons_own on public.lessons
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());
alter policy lesson_sessions_own on public.lesson_sessions
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

alter function public.initialize_user_profile(jsonb) security definer;
alter function public.create_lesson(text, uuid, uuid, text, text) security definer;
alter function public.update_lesson_audio(uuid, text) security definer;
alter function public.get_user_analytics(text) security definer;
alter function public.update_daily_progress(text, integer, boolean, boolean, integer)
  security definer;
alter function public.get_weekly_progress(text) security definer;
