-- Migration: Create audio storage bucket and policies

-- Create the audio bucket for storing welcome audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload audio files
CREATE POLICY "Allow authenticated users to upload audio" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio');

-- Create policy to allow public read access to audio files
CREATE POLICY "Allow public read access to audio" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'audio');

-- Create policy to allow authenticated users to update their own audio files
CREATE POLICY "Allow authenticated users to update audio" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow authenticated users to delete their own audio files
CREATE POLICY "Allow authenticated users to delete audio" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);