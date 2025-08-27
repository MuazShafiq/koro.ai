-- Fix kinematics resource access for all users
-- The issue is that resources are linked to specific user's subjects/topics
-- We need to create kinematics resources for all users who have Physics subjects

-- First, let's see what we have
SELECT 'Current Physics subjects by user:' as info;
SELECT s.id, s.name, s.user_id, u.email 
FROM public.subjects s
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE s.name = 'Physics';

SELECT 'Current Kinematics topics by user:' as info;
SELECT t.id, t.name, t.subject_id, s.user_id, u.email
FROM public.topics t
JOIN public.subjects s ON t.subject_id = s.id
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE t.name = 'Kinematics' AND s.name = 'Physics';

SELECT 'Current kinematics resources:' as info;
SELECT r.id, r.title, s.user_id, u.email
FROM public.resources r
JOIN public.subjects s ON r.subject_id = s.id
JOIN public.topics t ON r.topic_id = t.id
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE r.title = 'Kinematics Fundamentals';

-- Insert kinematics resources for ALL users who have Physics subjects and Kinematics topics
-- but don't already have this resource
INSERT INTO public.resources (
  subject_id,
  topic_id,
  title,
  description,
  file_url,
  content_type,
  content_text
)
SELECT DISTINCT
  s.id as subject_id,
  t.id as topic_id,
  'Kinematics Fundamentals' as title,
  'Comprehensive guide to kinematics concepts including motion, velocity, and acceleration' as description,
  'resources/physics/kinematics/Kinematics.pdf' as file_url,
  'pdf' as content_type,
  'This PDF covers fundamental concepts of kinematics including position, velocity, acceleration, and motion equations.' as content_text
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
WHERE s.name = 'Physics' 
  AND t.name = 'Kinematics'
  AND NOT EXISTS (
    SELECT 1 FROM public.resources r 
    WHERE r.subject_id = s.id 
      AND r.topic_id = t.id 
      AND r.title = 'Kinematics Fundamentals'
  );

-- Verify all users now have kinematics resources
SELECT 'Final verification - Kinematics resources by user:' as info;
SELECT r.id, r.title, s.user_id, u.email, s.name as subject_name, t.name as topic_name
FROM public.resources r
JOIN public.subjects s ON r.subject_id = s.id
JOIN public.topics t ON r.topic_id = t.id
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE r.title = 'Kinematics Fundamentals'
ORDER BY s.user_id;