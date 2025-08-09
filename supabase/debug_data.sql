-- Debug query to check current data in subjects and topics tables

-- Check all subjects
SELECT 
  id,
  name,
  icon,
  gradient,
  total_topics,
  user_id,
  description,
  created_at
FROM subjects
ORDER BY created_at DESC;

-- Check all topics
SELECT 
  t.id,
  t.name as topic_name,
  t.subject_id,
  s.name as subject_name,
  t.completed,
  t.progress,
  t.created_at
FROM topics t
LEFT JOIN subjects s ON t.subject_id = s.id
ORDER BY s.name, t.created_at;

-- Check if there are any Physics subjects
SELECT 
  id,
  name,
  user_id,
  created_at
FROM subjects 
WHERE LOWER(name) LIKE '%physics%'
ORDER BY created_at DESC;

-- Check if there are any Kinematics topics
SELECT 
  t.id,
  t.name as topic_name,
  s.name as subject_name,
  t.created_at
FROM topics t
LEFT JOIN subjects s ON t.subject_id = s.id
WHERE LOWER(t.name) LIKE '%kinematics%'
ORDER BY t.created_at DESC;

-- Check user profiles to see if there are any users
SELECT 
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check RLS policies for subjects table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('subjects', 'topics');