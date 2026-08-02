import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { ProgressService } from '@/lib/services/progressService';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  logger.info('VALIDATE-COMPLETION', 'Starting completion validation', {}, requestId);
  
  try {
    const { sessionId } = await request.json();
    
    logger.info('VALIDATE-COMPLETION', 'Request received', {
      sessionId
    }, requestId);

    if (!sessionId) {
      logger.error('VALIDATE-COMPLETION', 'Missing session ID', {}, requestId);
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const progressService = new ProgressService(supabase);
    
    // Get current user
    logger.auth('Authenticating user', {}, requestId);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('VALIDATE-COMPLETION', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    logger.auth('User authenticated', { userId: user.id }, requestId);

    // Get session data
    logger.database('Fetching session data', { sessionId }, requestId);
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('VALIDATE-COMPLETION', 'Session not found', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    logger.database('Session found', {
      id: session.id,
      phase: session.current_phase,
      status: session.status,
      startedAt: session.created_at
    }, requestId);

    // Get lesson plan for validation criteria
    const lessonPlan = session.lesson_plan as any;
    if (!lessonPlan) {
      logger.error('VALIDATE-COMPLETION', 'No lesson plan found', {}, requestId);
      return NextResponse.json(
        { error: 'No lesson plan found for session' },
        { status: 400 }
      );
    }
    
    logger.info('VALIDATE-COMPLETION', 'Lesson plan found', {
      hasChunks: !!lessonPlan.lesson_chunks,
      chunksCount: lessonPlan.lesson_chunks?.length || 0,
      complexity: lessonPlan.complexity_level
    }, requestId);

    // Get progress summary
    logger.info('VALIDATE-COMPLETION', 'Fetching progress summary', {}, requestId);
    let progressSummary = {
      progressPercentage: 0,
      deliveredConcepts: 0,
      totalConcepts: 0,
      equationsCount: 0,
    };
    try {
      progressSummary = await progressService.getProgressSummary(sessionId);
      logger.info('VALIDATE-COMPLETION', 'Progress summary retrieved', {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        equationsCount: progressSummary.equationsCount
      }, requestId);
    } catch (progressError) {
      logger.warn(
        'VALIDATE-COMPLETION',
        'Progress summary unavailable; validating delivered sections instead',
        { progressError },
        requestId,
      );
    }

    // Get delivered chunks count
    logger.database('Fetching delivered chunks', {}, requestId);
    const { data: deliveredChunks, error: chunksError } = await supabase
      .from('lesson_chunks')
      .select('id, chunk_index, delivered_at')
      .eq('session_id', sessionId)
      .order('chunk_index');

    if (chunksError) {
      logger.error('VALIDATE-COMPLETION', 'Error fetching chunks', { chunksError }, requestId);
      return NextResponse.json(
        { error: 'Failed to fetch lesson chunks' },
        { status: 500 }
      );
    }
    
    logger.database('Chunks fetched', {
      deliveredCount: deliveredChunks?.length || 0,
      totalChunks: lessonPlan.lesson_chunks?.length || 0
    }, requestId);

    // Get resource sections utilized
    logger.database('Fetching resource utilization', {}, requestId);
    const { data: interactions, error: interactionsError } = await supabase
      .from('student_assessments')
      .select('resources_used')
      .eq('session_id', sessionId)
      .not('resources_used', 'is', null);

    if (interactionsError) {
      logger.warn('VALIDATE-COMPLETION', 'Error fetching interactions', { interactionsError }, requestId);
    }
    
    const uniqueResourcesUsed = new Set();
    interactions?.forEach((interaction: any) => {
      if (Array.isArray(interaction.resources_used)) {
        interaction.resources_used.forEach((resource: string) => uniqueResourcesUsed.add(resource));
      }
    });
    
    logger.database('Resource utilization calculated', {
      uniqueResourcesCount: uniqueResourcesUsed.size,
      totalInteractions: interactions?.length || 0
    }, requestId);

    // Completion is based on lesson delivery. Interaction counts, extracted
    // concepts, resources, and elapsed time are useful analytics, but they must
    // never block a student who has reached the end of every planned section.
    const sessionStartTime = new Date(session.created_at).getTime();
    const currentTime = Date.now();
    const sessionDurationMinutes = (currentTime - sessionStartTime) / (1000 * 60);

    const totalInteractions = interactions?.length || 0;
    const totalChunks = lessonPlan.lesson_chunks?.length || 0;
    const deliveredChunkIndexes = new Set(
      (deliveredChunks || []).map((chunk) => chunk.chunk_index),
    );
    const missingChunkIndexes = Array.from(
      { length: totalChunks },
      (_, index) => index,
    ).filter((index) => !deliveredChunkIndexes.has(index));
    const chunksDelivered = Math.max(0, totalChunks - missingChunkIndexes.length);
    const chunkCompletion = totalChunks > 0 ? chunksDelivered / totalChunks : 0;
    const isReadyForCompletion = totalChunks > 0 && missingChunkIndexes.length === 0;
    const resourceUtilization = uniqueResourcesUsed.size;
    const engagementScore = Math.min(
      chunkCompletion * 0.8 + Math.min(totalInteractions / 3, 1) * 0.2,
      1,
    );

    const validationResults = {
      chunkCompletion: {
        current: chunkCompletion,
        required: 1,
        met: isReadyForCompletion,
      },
    };

    const missingRequirements = [];
    const recommendations = [];
    const remainingChunks = missingChunkIndexes.length;
    if (!isReadyForCompletion) {
      missingRequirements.push(
        `Complete ${remainingChunks} more lesson section${remainingChunks === 1 ? '' : 's'}`,
      );
      recommendations.push('Continue through the remaining lesson sections');
    }

    const averageChunkTime = chunksDelivered > 0
      ? sessionDurationMinutes / chunksDelivered
      : 0;
    const estimatedTimeToCompletion = remainingChunks * averageChunkTime;

    // Update session status if ready for completion
    if (isReadyForCompletion) {
      logger.database('Updating session status to ready for completion', {}, requestId);
      const { error: updateError } = await supabase
        .from('lesson_sessions')
        .update({ 
          status: 'ready_for_completion',
          completion_validated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
        
      if (updateError) {
        logger.warn('VALIDATE-COMPLETION', 'Failed to update session status', { updateError }, requestId);
      } else {
        logger.database('Session status updated successfully', {}, requestId);
      }
    }

    const responseData = {
      sessionId,
      isReadyForCompletion,
      validationResults,
      missingRequirements,
      recommendations,
      progressSummary: {
        conceptsDelivered: chunksDelivered,
        totalConcepts: totalChunks,
        progressPercentage: Math.round(chunkCompletion * 100),
        equationsCount: progressSummary.equationsCount
      },
      sessionMetrics: {
        durationMinutes: Math.round(sessionDurationMinutes * 10) / 10,
        chunksDelivered,
        totalChunks,
        totalInteractions,
        resourceSectionsUsed: resourceUtilization,
        engagementScore: Math.round(engagementScore * 100) / 100
      },
      estimatedTimeToCompletion: Math.round(estimatedTimeToCompletion),
      criteria: { minimumChunksThreshold: 1 },
    };
    
    logger.info('VALIDATE-COMPLETION', 'Validation completed successfully', {
      isReadyForCompletion: responseData.isReadyForCompletion,
      missingRequirementsCount: responseData.missingRequirements.length,
      durationMinutes: responseData.sessionMetrics.durationMinutes,
      processingTime: Date.now() - startTime
    }, requestId);
    
    return NextResponse.json(responseData);

  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('VALIDATE-COMPLETION', 'Fatal error', errorDetails, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current validation status without updating
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('status, completion_validated_at')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId,
      status: session.status,
      isValidated: session.status === 'ready_for_completion',
      validatedAt: session.completion_validated_at
    });

  } catch (error) {
    logger.error('VALIDATE-COMPLETION-GET', 'Fatal error', {
      error: error instanceof Error ? error.message : String(error)
    }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
