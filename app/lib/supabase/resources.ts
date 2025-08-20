import { createClient } from '@supabase/supabase-js';
import { Database } from '../../utils/supabase/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Resource {
  id: string;
  subject_id: string;
  topic_id: string;
  title: string;
  description?: string;
  file_url: string;
  content_type: string;
  content_text?: string;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string;
  lesson_content: string;
  audio_url?: string;
  duration_minutes: number;
  status: 'generated' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

/**
 * Fetch resources by subject and topic for RAG pipeline
 */
export async function getResourcesByTopic(
  subjectId: string,
  topicId: string
): Promise<Resource[]> {
  try {
    const { data, error } = await supabase.rpc('get_resources_by_topic', {
      subject_uuid: subjectId,
      topic_uuid: topicId
    });

    if (error) {
      console.error('Error fetching resources:', error);
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getResourcesByTopic:', error);
    throw error;
  }
}

/**
 * Create a new lesson record
 */
export async function createLesson(
  userId: string,
  subjectId: string,
  topicId: string,
  lessonContent: string,
  audioUrl?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_lesson', {
      user_uuid: userId,
      subject_uuid: subjectId,
      topic_uuid: topicId,
      lesson_text: lessonContent,
      audio_file_url: audioUrl
    });

    if (error) {
      console.error('Error creating lesson:', error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createLesson:', error);
    throw error;
  }
}

/**
 * Update lesson with audio URL
 */
export async function updateLessonAudio(
  lessonId: string,
  audioUrl: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_lesson_audio', {
      lesson_uuid: lessonId,
      audio_file_url: audioUrl
    });

    if (error) {
      console.error('Error updating lesson audio:', error);
      throw new Error(`Failed to update lesson audio: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in updateLessonAudio:', error);
    throw error;
  }
}

/**
 * Get user's lessons by subject
 */
export async function getUserLessons(
  userId: string,
  subjectId?: string
): Promise<Lesson[]> {
  try {
    let query = supabase
      .from('lessons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user lessons:', error);
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserLessons:', error);
    throw error;
  }
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudioFile(
  audioBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  try {
    const filePath = `lessons/${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('audio-lessons')
      .upload(filePath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (error) {
      console.error('Error uploading audio file:', error);
      throw new Error(`Failed to upload audio: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('audio-lessons')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadAudioFile:', error);
    throw error;
  }
}

/**
 * Get lesson by ID
 */
export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows returned
      }
      console.error('Error fetching lesson:', error);
      throw new Error(`Failed to fetch lesson: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getLessonById:', error);
    throw error;
  }
}

/**
 * Mark lesson as completed
 */
export async function markLessonCompleted(lessonId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('lessons')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId);

    if (error) {
      console.error('Error marking lesson as completed:', error);
      throw new Error(`Failed to mark lesson as completed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in markLessonCompleted:', error);
    throw error;
  }
}