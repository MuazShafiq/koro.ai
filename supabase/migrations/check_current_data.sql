-- Check current subjects and topics in the database
SELECT 'SUBJECTS' as table_name, count(*) as count FROM public.subjects
UNION ALL
SELECT 'TOPICS' as table_name, count(*) as count FROM public.topics;

-- Show all subjects
SELECT 'All Subjects:' as info;
SELECT id, name, icon, user_id, created_at FROM public.subjects ORDER BY created_at;

-- Show all topics with their subjects
SELECT 'All Topics with Subjects:' as info;
SELECT 
    t.id as topic_id,
    t.name as topic_name,
    s.name as subject_name,
    s.id as subject_id,
    t.created_at
FROM public.topics t
JOIN public.subjects s ON t.subject_id = s.id
ORDER BY s.name, t.name;

-- Check specifically for Physics and Kinematics
SELECT 'Physics Subject Check:' as info;
SELECT * FROM public.subjects WHERE name = 'Physics';

SELECT 'Kinematics Topic Check:' as info;
SELECT t.*, s.name as subject_name 
FROM public.topics t 
JOIN public.subjects s ON t.subject_id = s.id 
WHERE t.name = 'Kinematics';

-- Check user profiles
SELECT 'User Profiles:' as info;
SELECT id, email, created_at FROM auth.users LIMIT 5;