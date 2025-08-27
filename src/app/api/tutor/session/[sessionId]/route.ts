import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    console.log('Session endpoint called with sessionId:', sessionId);

    if (!sessionId) {
      console.log('No sessionId provided');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session data with subject and topic information
    console.log('Querying database for session:', sessionId);
    const { data: sessionData, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select(`
        *,
        subjects(name, description),
        topics(name)
      `)
      .eq('id', sessionId)
      .single();

    console.log('Database query result:', { sessionData, sessionError });

    if (sessionError || !sessionData) {
      console.log('Session not found or error:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Generate assessment questions based on the topic
    const assessmentQuestions = [
      {
        id: 1,
        question: `What do you already know about ${sessionData.topics?.name || 'this topic'}?`,
        type: 'open_ended',
        audioUrl: '/api/tts/generate?text=' + encodeURIComponent(`What do you already know about ${sessionData.topics?.name || 'this topic'}?`)
      },
      {
        id: 2,
        question: `On a scale of 1-10, how confident do you feel about ${sessionData.topics?.name || 'this topic'}?`,
        type: 'scale',
        options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        audioUrl: '/api/tts/generate?text=' + encodeURIComponent(`On a scale of 1 to 10, how confident do you feel about ${sessionData.topics?.name || 'this topic'}?`)
      },
      {
        id: 3,
        question: `What specific aspects of ${sessionData.topics?.name || 'this topic'} would you like to focus on today?`,
        type: 'open_ended',
        audioUrl: '/api/tts/generate?text=' + encodeURIComponent(`What specific aspects of ${sessionData.topics?.name || 'this topic'} would you like to focus on today?`)
      }
    ];

    // Create welcome message
    const welcomeMessage = `Welcome to your ${sessionData.subjects?.name || 'study'} session! Today we'll be exploring ${sessionData.topics?.name || 'an interesting topic'}. Let's start with a quick assessment to understand your current knowledge level.`;

    const responseData = {
      id: sessionData.id,
      subjectId: sessionData.subject_id,
      topicId: sessionData.topic_id,
      userId: sessionData.user_id,
      status: sessionData.status,
      currentPhase: sessionData.current_phase,
      progressPercentage: sessionData.progress_percentage,
      createdAt: sessionData.created_at,
      updatedAt: sessionData.updated_at,
      subject: sessionData.subjects,
      topic: sessionData.topics,
      welcomeMessage,
      welcomeAudioUrl: '/api/tts/generate?text=' + encodeURIComponent(welcomeMessage),
      assessmentQuestions,
      estimatedDuration: 30, // 30 minutes
      lessonOverview: `In this session, you'll learn about ${sessionData.topics?.name || 'the selected topic'}. We'll start with an assessment, then move through interactive lessons tailored to your knowledge level.`
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching session data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}