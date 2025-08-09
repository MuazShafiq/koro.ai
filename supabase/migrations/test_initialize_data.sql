-- Test if we can manually trigger data initialization
-- First, let's see current user IDs
SELECT 'Current Users:' as info;
SELECT id, email FROM auth.users LIMIT 3;

-- Clear existing data for testing (if any)
DELETE FROM public.topics;
DELETE FROM public.subjects;

-- Check if data is cleared
SELECT 'After clearing - Subjects count:' as info, count(*) as count FROM public.subjects;
SELECT 'After clearing - Topics count:' as info, count(*) as count FROM public.topics;

-- Now let's manually insert test data to see if it works
INSERT INTO public.subjects (name, icon, gradient, total_topics, user_id) 
VALUES 
('Physics', '⚛️', 'from-red-500 to-orange-500', 5, (SELECT id FROM auth.users LIMIT 1));

-- Get the subject ID we just created
SELECT 'Inserted Physics Subject:' as info;
SELECT id, name, user_id FROM public.subjects WHERE name = 'Physics';

-- Insert Kinematics topic
INSERT INTO public.topics (name, subject_id, completed, progress)
VALUES 
('Kinematics', (SELECT id FROM public.subjects WHERE name = 'Physics' LIMIT 1), false, 0);

-- Verify the data
SELECT 'Final verification - Physics with Kinematics:' as info;
SELECT 
    s.name as subject_name,
    t.name as topic_name,
    s.id as subject_id,
    t.id as topic_id
FROM public.subjects s
JOIN public.topics t ON s.id = t.subject_id
WHERE s.name = 'Physics' AND t.name = 'Kinematics';