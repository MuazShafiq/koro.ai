-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_resources_by_topic(UUID, UUID);
DROP FUNCTION IF EXISTS get_resources_by_topic(UUID);
DROP FUNCTION IF EXISTS get_resources_by_topic;

-- Create the get_resources_by_topic function with correct signature
CREATE OR REPLACE FUNCTION get_resources_by_topic(
  subject_uuid UUID,
  topic_uuid UUID
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  content_text TEXT,
  file_url TEXT,
  content_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.content_text,
    r.file_url,
    r.content_type,
    r.created_at
  FROM resources r
  WHERE r.subject_id = subject_uuid
    AND (topic_uuid IS NULL OR r.topic_id = topic_uuid)
  ORDER BY r.created_at DESC;
END;
$$;

-- Add missing assessment_type column to student_assessments table
ALTER TABLE student_assessments 
ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'quiz' 
CHECK (assessment_type IN ('quiz', 'assignment', 'discussion', 'practice'));

-- Grant permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_resources_by_topic(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_resources_by_topic(UUID, UUID) TO authenticated;

-- Grant table permissions
GRANT SELECT ON resources TO anon;
GRANT SELECT ON resources TO authenticated;
GRANT ALL PRIVILEGES ON student_assessments TO authenticated;
GRANT SELECT ON student_assessments TO anon;

-- Ensure RLS policies allow access
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for resources
DROP POLICY IF EXISTS "Users can view all resources" ON resources;
CREATE POLICY "Users can view all resources" ON resources
  FOR SELECT USING (true);

-- Create RLS policies for student_assessments
DROP POLICY IF EXISTS "Users can manage their assessments" ON student_assessments;
CREATE POLICY "Users can manage their assessments" ON student_assessments
  FOR ALL USING (true);

COMMIT;