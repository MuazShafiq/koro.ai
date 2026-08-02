import { after, NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuthRetry, withDatabaseRetry } from '@/utils/supabase/retry';
import { logger } from '@/lib/logger';
import { ProgressService } from '@/lib/services/progressService';
import { MasterLessonPlanService } from '@/lib/services/masterLessonPlanService';
import { isLocalMode } from '@/lib/local-mode';

export const maxDuration = 60;
import { createLocalTutorSession } from '@/lib/local-tutor';
import type { Json } from '@/utils/supabase/database.types';
import { formatAssessmentQuestion } from '@/lib/tutor-text';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('START-SESSION', 'Starting new lesson session', {}, requestId);
  
  try {
    const { subjectId, topicId } = await request.json();
    logger.info('START-SESSION', 'Request data', { subjectId, topicId }, requestId);

    if (!subjectId) {
      logger.error('START-SESSION', 'Missing subject ID', {}, requestId);
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    if (isLocalMode()) {
      const session = await createLocalTutorSession(subjectId, topicId);
      return session
        ? NextResponse.json(session)
        : NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const supabase = await createClient();
    
    // Get current user with retry logic for network issues
    logger.info('START-SESSION', 'Authenticating user', {}, requestId);
    
    const authResult = await withAuthRetry(
      supabase,
      async (client) => await client.auth.getUser(),
      { requestId, operation: 'user authentication' }
    );
    
    const { user } = authResult.data;
    const authError = authResult.error;
    
    if (authError || !user) {
      logger.error('START-SESSION', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 401 }
      );
    }
    
    logger.info('START-SESSION', 'User authenticated', { userId: user.id }, requestId);

    // Get subject and topic information with retry logic
    logger.database('Fetching subject data', { subjectId }, requestId);
    
    const subjectResult = await withDatabaseRetry(
      supabase,
      async (client) => await client
        .from('subjects')
        .select('name, description')
        .eq('id', subjectId)
        .single(),
      { requestId, operation: 'fetch subject data' }
    );
    
    const subject = subjectResult.data;
    const subjectError = subjectResult.error;

    if (subjectError || !subject) {
      logger.error('START-SESSION', 'Subject not found', { subjectError }, requestId);
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }
    logger.database('Subject found', { name: subject.name, hasDescription: !!subject.description }, requestId);

    let topic = null;
    if (topicId) {
      logger.database('Fetching topic data', { topicId }, requestId);
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('name')
        .eq('id', topicId)
        .single();
      
      if (!topicError && topicData) {
        topic = topicData;
        logger.database('Topic found', { topicName: topic.name }, requestId);
      } else {
        logger.warn('START-SESSION', 'Topic not found or error', { topicError }, requestId);
      }
    } else {
      logger.info('START-SESSION', 'No topic specified, using general subject', {}, requestId);
    }

    // Get relevant resources using RAG (only if topic is specified)
    let resources: Array<{ title: string; content_text: string | null }> = [];
    if (topicId) {
      logger.database('Fetching resources', { subjectId, topicId }, requestId);
      const { data: resourcesData, error: resourcesError } = await supabase
        .rpc('get_resources_by_topic', {
          subject_uuid: subjectId,
          topic_uuid: topicId
        });

      if (resourcesError) {
        logger.error('START-SESSION', 'Error fetching resources', { resourcesError }, requestId);
        return NextResponse.json(
          { error: 'Failed to fetch educational resources' },
          { status: 500 }
        );
      }
      resources = resourcesData || [];
      logger.database('Resources fetched', {
        count: resources.length,
        titles: resources.map((r: any) => r.title)
      }, requestId);
    } else {
      logger.database('No topic specified, skipping resource fetch', {}, requestId);
    }

    // Prepare context for AI lesson planning
    logger.info('START-SESSION', 'Preparing lesson planning context', {}, requestId);
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No external resources are attached. Use accurate general knowledge.';

    const topicContext = topic ? `Topic: ${topic.name}` : 'General subject overview';
    
    logger.info('START-SESSION', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      topicContext: topicContext
    }, requestId);

    // Get or create master lesson plan
    logger.info('START-SESSION', 'Getting master lesson plan', {}, requestId);
    const masterLessonPlanService = new MasterLessonPlanService(supabase);
    const progressService = new ProgressService(supabase);
    const topicName = topic?.name || 'General Overview';
    const subjectName = subject.name;
    
    let masterPlan;
    try {
      masterPlan = await masterLessonPlanService.getOrCreateMasterPlan(
        subjectId,
        topicId,
        subjectName,
        topicName,
        resourceContext
      );
      
      logger.lesson('Master lesson plan retrieved', {
        planId: masterPlan.id,
        chunksCount: masterPlan.chunkStructure.length,
        conceptsCount: masterPlan.learningObjectives.length,
        estimatedDuration: masterPlan.estimatedDurationMinutes
      }, requestId);
    } catch (error) {
       logger.error('START-SESSION', 'Failed to get master lesson plan', { error }, requestId);
       return NextResponse.json(
         { error: 'Failed to create lesson plan' },
         { status: 500 }
       );
     }

    // Convert master plan to enhanced lesson plan format
    logger.lesson('Converting master plan to enhanced format', {}, requestId);
    const enhancedLessonPlan = {
      overview: {
        title: `${subjectName}: ${topicName}`,
        description: masterPlan.description,
        estimatedDuration: masterPlan.estimatedDurationMinutes,
        difficulty: masterPlan.difficultyLevel || 'intermediate'
      },
      coreFundamentals: masterPlan.coreConcepts || [],
      keyConcepts: masterPlan.learningObjectives || [],
      chunks: masterPlan.chunkStructure.map((chunk: any, index: number) => ({
        id: `chunk_${index + 1}`,
        title: chunk.title,
        content: chunk.content,
        duration: chunk.estimatedDurationMinutes || 5,
        type: chunk.type || 'concept',
        order: index + 1
      }))
    };

    // Keep the startup path to one AI operation. Rewriting every criterion with a
    // separate request added latency without materially improving the questions.
    const assessmentCriteria = (masterPlan.assessmentCriteria || [])
      .filter((criterion): criterion is string => (
        typeof criterion === 'string' && criterion.trim().length > 0
      ));
    const questionCandidates = [
      ...assessmentCriteria,
      `What do you already know about ${topicName}?`,
      `Which part of ${topicName} feels least clear to you?`,
    ];
    const enhancedQuestions = Array.from(new Set(
      questionCandidates
        .map(formatAssessmentQuestion)
        .filter(Boolean),
    )).slice(0, Math.max(2, Math.min(3, assessmentCriteria.length || 2)));
    const questionsWithAudio = enhancedQuestions.map((question, index) => ({
      id: `q_${index + 1}`,
      question,
      audioUrl: null,
      order: index + 1,
    }));
    const welcomeAudioUrl = null;

    // Create lesson session with current_phase set to 'assessment'
    logger.database('Creating lesson session', {}, requestId);
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: topicId || null,
        current_phase: 'assessment',
        status: 'active',
        lesson_plan: enhancedLessonPlan as unknown as Json,
        assessment_questions: questionsWithAudio as unknown as Json,
        student_responses: [],
        current_chunk_index: 0,
        welcome_audio_url: welcomeAudioUrl
      })
      .select('id, current_phase, status, created_at')
      .single();

    if (sessionError) {
      logger.error('START-SESSION', 'Failed to create session', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Failed to create lesson session' },
        { status: 500 }
      );
    }

    logger.database('Session created successfully', {
      sessionId: session.id,
      phase: session.current_phase
    }, requestId);

    // Progress analysis is useful, but it must not hold the interface hostage.
    // Next.js keeps this work alive after the response on Vercel.
    after(async () => {
      logger.lesson('Initializing progress tracking', {}, requestId);
      try {
        const ragAnalysis = await progressService.analyzeRAGContent(
          resourceContext,
          subjectName,
        );
        const progressLessonPlan = await progressService.createLessonPlan(
          session.id,
          ragAnalysis,
        );

        logger.lesson('Progress tracking initialized', {
          sessionId: session.id,
          conceptsCount: progressLessonPlan.plannedConcepts?.length || 0,
        }, requestId);
      } catch (error) {
        logger.error(
          'START-SESSION',
          'Failed to initialize progress tracking',
          { error },
          requestId,
        );
      }
    });

    // Return comprehensive session data
    logger.info('START-SESSION', 'Session created successfully', {
      sessionId: session.id,
      chunksCount: enhancedLessonPlan.chunks.length,
      questionsCount: questionsWithAudio.length,
      hasWelcomeAudio: !!welcomeAudioUrl
    }, requestId);

    return NextResponse.json({
      sessionId: session.id,
      subject: {
        id: subjectId,
        name: subjectName
      },
      topic: topic ? {
        id: topicId,
        name: topic.name
      } : null,
      currentPhase: session.current_phase,
      status: session.status,
      createdAt: session.created_at,
      lessonOverview: enhancedLessonPlan.overview,
      lessonChunks: enhancedLessonPlan.chunks,
      assessmentQuestions: questionsWithAudio,
      estimatedDuration: enhancedLessonPlan.overview.estimatedDuration,
      welcomeAudioUrl: welcomeAudioUrl
    });

  } catch (error) {
    logger.error('START-SESSION', 'Unexpected error', { error }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
