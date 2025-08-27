-- Grant permissions for lesson_progress table

-- Grant SELECT to anon role (for reading progress data)
GRANT SELECT ON lesson_progress TO anon;

-- Grant full privileges to authenticated role (for creating and updating progress)
GRANT ALL PRIVILEGES ON lesson_progress TO authenticated;

-- Also grant INSERT and UPDATE to anon for testing purposes
GRANT INSERT, UPDATE ON lesson_progress TO anon;

-- Verify permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'lesson_progress' 
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;