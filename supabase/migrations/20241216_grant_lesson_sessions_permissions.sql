-- Grant permissions for lesson_sessions table to anon and authenticated roles

-- Grant basic read access to anon role (for unauthenticated testing)
GRANT SELECT ON lesson_sessions TO anon;

-- Grant full access to authenticated role
GRANT ALL PRIVILEGES ON lesson_sessions TO authenticated;

-- Also grant insert permission to anon for testing purposes
GRANT INSERT ON lesson_sessions TO anon;
GRANT UPDATE ON lesson_sessions TO anon;

-- Check current permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'lesson_sessions'
AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;