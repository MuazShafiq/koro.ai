import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../src/utils/supabase/server';
import { logger } from '../../../src/lib/logger';
import { getResourcesByTopic, createLesson, uploadAudioFile, updateLessonAudio } from '../../../src/lib/supabase/resources';
import { generateLessonContent } from '../../../src/lib/services/openai';
import { convertTextToSpeech, cleanTextForTTS } from '../../../src/lib/services/unrealSpeech';

export interface LessonRequest {
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicName: string;
  userLevel?: string;
  duration?: number;
  generateAudio?: boolean;
}

export interface LessonResponse {
  success: boolean;
  lessonId?: string;
  lesson?: {
    id: string;
    title: string;
    content: string;
    objectives: string[];
    keyPoints: string[];
    audioUrl?: string;
    estimatedDuration: number;
  };
  error?: string;
}

/**
 * POST /api/lesson - Generate a new AI lesson
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: LessonRequest = await request.json();
    const {
      subjectId,
      topicId,
      subjectName,
      topicName,
      userLevel = 'intermediate',
      duration = 30,
      generateAudio = true
    } = body;

    // Validate required fields
    if (!subjectId || !topicId || !subjectName || !topicName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: subjectId, topicId, subjectName, topicName' 
        },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`Generating lesson for user ${user.id}: ${subjectName} - ${topicName}`);

    // Step 1: Fetch relevant resources for RAG
    let resources;
    try {
      resources = await getResourcesByTopic(subjectId, topicId);
      console.log(`Found ${resources.length} resources for topic`);
    } catch (error) {
      console.error('Error fetching resources:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'No resources found for this topic. Please ensure educational content is available.' 
        },
        { status: 404 }
      );
    }

    // Step 2: Generate lesson content using OpenAI
    let generatedLesson;
    try {
      generatedLesson = await generateLessonContent({
        subjectName,
        topicName,
        resources,
        userLevel,
        duration
      });
      console.log('Lesson content generated successfully');
    } catch (error) {
      console.error('Error generating lesson content:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to generate lesson content. AI service may be unavailable.' 
        },
        { status: 500 }
      );
    }

    // Step 3: Create lesson record in database
    let lessonId;
    try {
      lessonId = await createLesson(
        user.id,
        subjectId,
        topicId,
        generatedLesson.content
      );
      console.log(`Lesson created with ID: ${lessonId}`);
    } catch (error) {
      console.error('Error creating lesson record:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save lesson to database' 
        },
        { status: 500 }
      );
    }

    // Step 4: Generate audio if requested
    let audioUrl;
    if (generateAudio) {
      try {
        console.log('Converting lesson to audio...');
        
        // Clean and prepare text for TTS
        const cleanedText = cleanTextForTTS(generatedLesson.content);
        
        // Convert to speech
        const ttsResult = await convertTextToSpeech({
          text: cleanedText,
          voiceId: 'Scarlett', // Default voice
          contentType: 'lesson',
          context: `lesson content for ${subjectName} - ${topicName}`
        });

        if (!ttsResult.success || !ttsResult.audioBuffer) {
          console.error('TTS conversion failed:', ttsResult.error);
          // Continue without audio - don't fail the entire request
          console.log('Continuing without audio due to TTS failure');
        } else {
          // Upload audio to Supabase Storage
          const audioFileName = `lesson_${lessonId}_${Date.now()}.mp3`;
          audioUrl = await uploadAudioFile(
            ttsResult.audioBuffer,
            audioFileName,
            user.id
          );

          // Update lesson record with audio URL
          await updateLessonAudio(lessonId, audioUrl);
          console.log('Audio generated and uploaded successfully');
        }
      } catch (error) {
        console.error('Error generating audio:', error);
        // Continue without audio - don't fail the entire request
        console.log('Continuing without audio due to error:', error);
      }
    }

    // Step 5: Return successful response
    const response: LessonResponse = {
      success: true,
      lessonId,
      lesson: {
        id: lessonId,
        title: generatedLesson.title,
        content: generatedLesson.content,
        objectives: generatedLesson.objectives,
        keyPoints: generatedLesson.keyPoints,
        audioUrl,
        estimatedDuration: generatedLesson.estimatedDuration
      }
    };

    console.log('Lesson generation completed successfully');
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in lesson generation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred while generating the lesson' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lesson?lessonId=xxx - Retrieve an existing lesson
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'lessonId parameter is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch lesson from database
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .eq('user_id', user.id) // Ensure user can only access their own lessons
      .single();

    if (error || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: `${lesson.subject_id} - ${lesson.topic_id}`, // You might want to join with subjects/topics tables
        content: lesson.lesson_content,
        audioUrl: lesson.audio_url,
        status: lesson.status,
        createdAt: lesson.created_at,
        estimatedDuration: lesson.duration_minutes
      }
    });

  } catch (error) {
    console.error('Error retrieving lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve lesson' },
      { status: 500 }
    );
  }
}