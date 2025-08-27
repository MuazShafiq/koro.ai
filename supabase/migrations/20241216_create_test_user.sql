-- Create test user in auth.users first
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  crypt('testpassword', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Create test user in profiles table to match the testUserId used in API
INSERT INTO public.profiles (id, username, full_name, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'testuser',
  'Test User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create test subject
INSERT INTO public.subjects (id, name, description, icon, gradient, user_id, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test Subject',
  'A test subject for development',
  'BookOpen',
  'from-blue-500 to-purple-600',
  '550e8400-e29b-41d4-a716-446655440000',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;