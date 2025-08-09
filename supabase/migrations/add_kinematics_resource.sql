-- Get Physics subject and Kinematics topic UUIDs and insert Kinematics resource

-- First, let's check what subjects and topics exist
SELECT 'Current subjects:' as info;
SELECT id, name FROM public.subjects;

SELECT 'Current topics:' as info;
SELECT id, name, subject_id FROM public.topics;

-- Insert the Kinematics resource
-- We'll use the Physics subject and Kinematics topic
INSERT INTO public.resources (
  subject_id,
  topic_id,
  title,
  description,
  file_url,
  content_type,
  content_text
)
SELECT 
  s.id as subject_id,
  t.id as topic_id,
  'Kinematics Fundamentals' as title,
  'Comprehensive guide to kinematics concepts including motion, velocity, and acceleration' as description,
  'resources/physics/kinematics/Kinematics.pdf' as file_url,
  'pdf' as content_type,
  'This PDF covers fundamental concepts of kinematics including position, velocity, acceleration, and motion equations.' as content_text
FROM public.subjects s
JOIN public.topics t ON t.subject_id = s.id
WHERE s.name = 'Physics' AND t.name = 'Kinematics';

-- Verify the resource was inserted
SELECT 'Inserted resource:' as info;
SELECT r.id, r.title, s.name as subject_name, t.name as topic_name, r.file_url
FROM public.resources r
JOIN public.subjects s ON r.subject_id = s.id
JOIN public.topics t ON r.topic_id = t.id
WHERE r.title = 'Kinematics Fundamentals';

-- Grant permissions to anon and authenticated roles for the resources table
GRANT SELECT ON public.resources TO anon;
GRANT ALL PRIVILEGES ON public.resources TO authenticated;