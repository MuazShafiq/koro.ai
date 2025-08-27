-- Debug script to check kinematics resources

-- Check all subjects
SELECT 'All subjects:' as info;
SELECT id, name, user_id FROM public.subjects;

-- Check all topics
SELECT 'All topics:' as info;
SELECT t.id, t.name, s.name as subject_name FROM public.topics t
JOIN public.subjects s ON t.subject_id = s.id;

-- Check all resources
SELECT 'All resources:' as info;
SELECT r.id, r.title, r.file_url, s.name as subject_name, t.name as topic_name
FROM public.resources r
LEFT JOIN public.subjects s ON r.subject_id = s.id
LEFT JOIN public.topics t ON r.topic_id = t.id;

-- Test function with actual IDs
SELECT 'Function test with first Physics subject and Kinematics topic:' as info;
WITH physics_subject AS (
  SELECT id FROM public.subjects WHERE name = 'Physics' LIMIT 1
),
kinematics_topic AS (
  SELECT t.id FROM public.topics t 
  JOIN physics_subject ps ON t.subject_id = ps.id 
  WHERE t.name = 'Kinematics' LIMIT 1
)
SELECT * FROM public.get_resources_by_topic(
  (SELECT id FROM physics_subject),
  (SELECT id FROM kinematics_topic)
);