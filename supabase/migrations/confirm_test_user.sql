-- Confirm the test user's email to enable authentication testing
-- This is for testing purposes only
-- Note: confirmed_at is a generated column and will be updated automatically

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'test@koro.ai' 
  AND email_confirmed_at IS NULL;

-- Verify the update
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'test@koro.ai';