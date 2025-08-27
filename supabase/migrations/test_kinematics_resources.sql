-- Test script to check if kinematics resources are accessible

-- First, check if Physics subject and Kinematics topic exist
SELECT 'Physics subject:' as info;
SELECT id, name FROM public.subjects WHERE name = 'Physics';

SELECT 'Kinematics topic:' as info;
SELECT t.id, t.name, s.name as subject_name 
FROM public.topics t 
JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Kinematics' AND s.name = 'Physics';

-- Check if resources exist for kinematics
SELECT 'Resources for Kinematics:' as info;
SELECT r.id, r.title, r.file_url, s.name as subject_name, t.name as topic_name
FROM public.resources r
JOIN public.subjects s ON r.subject_id = s.id
JOIN public.topics t ON r.topic_id = t.id
WHERE s.name = 'Physics' AND t.name = 'Kinematics';

-- Test the get_resources_by_topic function
SELECT 'Testing get_resources_by_topic function:' as info;
SELECT * FROM public.get_resources_by_topic(
  (SELECT id FROM public.subjects WHERE name = 'Physics' LIMIT 1),
  (SELECT id FROM public.topics WHERE name = 'Kinematics' AND subject_id = (SELECT id FROM public.subjects WHERE name = 'Physics' LIMIT 1) LIMIT 1)
);

-- Check permissions on resources table
SELECT 'Checking permissions:' as info;
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND table_name = 'resources' AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;