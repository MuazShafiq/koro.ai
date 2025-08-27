-- Insert test data for testing the start-session endpoint

-- Insert a test subject for user with test UUID
INSERT INTO public.subjects (id, name, icon, gradient, user_id, description, total_topics)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Mathematics',
  'calculator',
  'from-blue-500 to-purple-600',
  '550e8400-e29b-41d4-a716-446655440000',
  'A test subject for mathematics',
  5
) ON CONFLICT (id) DO NOTHING;

-- Insert a test topic for the test subject
INSERT INTO public.topics (id, name, subject_id, description, order_index)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Test Algebra',
  '550e8400-e29b-41d4-a716-446655440001',
  'A test topic for algebra',
  1
) ON CONFLICT (id) DO NOTHING;