import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const assessmentQuestions = Array.isArray(sessionData.assessment_questions)
      ? sessionData.assessment_questions
      : [];
    const storedPlan = sessionData.lesson_plan
      && typeof sessionData.lesson_plan === 'object'
      && !Array.isArray(sessionData.lesson_plan)
      ? sessionData.lesson_plan as Record<string, unknown>
      : {};
    const rawChunks = Array.isArray(storedPlan.chunks)
      ? storedPlan.chunks
      : Array.isArray(storedPlan.lesson_chunks)
        ? storedPlan.lesson_chunks
        : [];
    const lessonChunks = rawChunks.map((chunkValue, index: number) => {
      const chunk = chunkValue
        && typeof chunkValue === 'object'
        && !Array.isArray(chunkValue)
        ? chunkValue as Record<string, unknown>
        : {};

      return {
        id: typeof chunk.id === 'string' ? chunk.id : `session-${sessionId}-chunk-${index}`,
        title: typeof chunk.title === 'string' ? chunk.title : `Section ${index + 1}`,
        content: [chunk.content, chunk.script, chunk.script_content]
          .find((value): value is string => typeof value === 'string') ?? '',
        order: typeof chunk.order === 'number'
          ? chunk.order
          : typeof chunk.chunk_index === 'number'
            ? chunk.chunk_index
            : index,
      };
    });
    const { data: deliveredChunks } = await supabase
      .from('lesson_chunks')
      .select('chunk_index')
      .eq('session_id', sessionId)
      .not('delivered_at', 'is', null);
    const deliveredChunkIndexes = (deliveredChunks || []).map(chunk => chunk.chunk_index);

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
      // The client generates this with the same Cloudflare voice used everywhere
      // else. A JSON API URL is not itself a playable audio file.
      welcomeAudioUrl: null,
      assessmentQuestions,
      lessonChunks,
      deliveredChunkIndexes,
      currentChunkIndex: sessionData.current_chunk_index || 0,
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
