-- Function to get resources by subject and topic
CREATE OR REPLACE FUNCTION public.get_resources_by_topic(subject_uuid UUID, topic_uuid UUID)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  file_url TEXT,
  content_type TEXT,
  content_text TEXT
)
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.title, r.description, r.file_url, r.content_type, r.content_text
  FROM public.resources r
  WHERE r.subject_id = subject_uuid AND r.topic_id = topic_uuid
  ORDER BY r.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_resources_by_topic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resources_by_topic(UUID, UUID) TO anon;