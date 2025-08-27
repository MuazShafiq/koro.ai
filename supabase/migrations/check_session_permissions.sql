-- Check if the session exists
SELECT id, user_id, subject_id, status, current_phase, created_at 
FROM lesson_sessions 
WHERE id = '415a47a2-a580-4a7b-8355-990e9bd9fbc7';

-- Check RLS policies on lesson_sessions
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'lesson_sessions';

-- Grant permissions to anon and authenticated roles for lesson_sessions
GRANT SELECT ON lesson_sessions TO anon;
GRANT ALL PRIVILEGES ON lesson_sessions TO authenticated;

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'lesson_sessions' 
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;