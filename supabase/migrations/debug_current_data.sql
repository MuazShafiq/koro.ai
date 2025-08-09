-- Debug query to check current data in subjects and topics tables

-- Check all subjects
SELECT 'SUBJECTS' as table_name, id, name, user_id, icon, gradient, total_topics, description, created_at
FROM subjects
ORDER BY created_at DESC;

-- Check all topics
SELECT 'TOPICS' as table_name, id, name, subject_id, completed, progress, created_at
FROM topics
ORDER BY created_at DESC;

-- Check subjects with their topics count
SELECT 
    s.name as subject_name,
    s.id as subject_id,
    s.user_id,
    COUNT(t.id) as actual_topics_count,
    s.total_topics as recorded_topics_count
FROM subjects s
LEFT JOIN topics t ON s.id = t.subject_id
GROUP BY s.id, s.name, s.user_id, s.total_topics
ORDER BY s.created_at DESC;

-- Check if there are any topics without subjects
SELECT 
    t.id,
    t.name,
    t.subject_id,
    s.name as subject_name
FROM topics t
LEFT JOIN subjects s ON t.subject_id = s.id
WHERE s.id IS NULL;