import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { progressService } from '@/lib/services/progressService';

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
    const lessonPlan = session.lesson_plan;
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
    let progressSummary;
    try {
      progressSummary = await progressService.getProgressSummary(sessionId);
      logger.info('VALIDATE-COMPLETION', 'Progress summary retrieved', {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        equationsCount: progressSummary.equationsCount
      }, requestId);
    } catch (progressError) {
      logger.error('VALIDATE-COMPLETION', 'Failed to get progress summary', { progressError }, requestId);
      return NextResponse.json(
        { error: 'Failed to retrieve progress data' },
        { status: 500 }
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

    // Calculate engagement score based on interactions and time spent
    logger.info('VALIDATE-COMPLETION', 'Calculating engagement score', {}, requestId);
    const sessionStartTime = new Date(session.created_at).getTime();
    const currentTime = Date.now();
    const sessionDurationMinutes = (currentTime - sessionStartTime) / (1000 * 60);
    
    const totalInteractions = interactions?.length || 0;
    const chunksDelivered = deliveredChunks?.length || 0;
    const totalChunks = lessonPlan.lesson_chunks?.length || 1;
    
    // Engagement score calculation (0-1 scale)
    let engagementScore = 0;
    
    // Base score from chunk completion
    engagementScore += (chunksDelivered / totalChunks) * 0.4;
    
    // Score from interactions (questions asked)
    const interactionScore = Math.min(totalInteractions / 3, 1) * 0.3; // Max score at 3+ interactions
    engagementScore += interactionScore;
    
    // Score from time spent (optimal range: 10-30 minutes)
    let timeScore = 0;
    if (sessionDurationMinutes >= 5) {
      timeScore = Math.min(sessionDurationMinutes / 20, 1) * 0.3; // Max score at 20+ minutes
    }
    engagementScore += timeScore;
    
    engagementScore = Math.min(engagementScore, 1); // Cap at 1.0
    
    logger.info('VALIDATE-COMPLETION', 'Engagement score calculated', {
      engagementScore,
      sessionDurationMinutes,
      totalInteractions,
      chunksDelivered,
      totalChunks
    }, requestId);

    // Define completion criteria based on lesson complexity
    const complexity = lessonPlan.complexity_level || 'intermediate';
    let criteria = {
      conceptCoverageThreshold: 0.7,
      equationCoverageThreshold: 0.6,
      resourceSectionsThreshold: 2,
      engagementThreshold: 0.5,
      minimumChunksThreshold: 0.6
    };
    
    // Adjust thresholds based on complexity
    if (complexity === 'beginner') {
      criteria = {
        conceptCoverageThreshold: 0.6,
        equationCoverageThreshold: 0.5,
        resourceSectionsThreshold: 1,
        engagementThreshold: 0.4,
        minimumChunksThreshold: 0.5
      };
    } else if (complexity === 'advanced') {
      criteria = {
        conceptCoverageThreshold: 0.8,
        equationCoverageThreshold: 0.7,
        resourceSectionsThreshold: 3,
        engagementThreshold: 0.6,
        minimumChunksThreshold: 0.7
      };
    }
    
    logger.info('VALIDATE-COMPLETION', 'Completion criteria set', {
      complexity,
      criteria
    }, requestId);

    // Calculate validation results
    logger.info('VALIDATE-COMPLETION', 'Calculating validation results', {}, requestId);
    const conceptCoverage = progressSummary.progressPercentage / 100;
    const equationCoverage = progressSummary.equationsCount > 0 ? 
      Math.min(progressSummary.deliveredConcepts / progressSummary.equationsCount, 1) : 1;
    const chunkCompletion = chunksDelivered / totalChunks;
    const resourceUtilization = uniqueResourcesUsed.size;
    
    const validationResults = {
      conceptCoverage: {
        current: conceptCoverage,
        required: criteria.conceptCoverageThreshold,
        met: conceptCoverage >= criteria.conceptCoverageThreshold
      },
      equationCoverage: {
        current: equationCoverage,
        required: criteria.equationCoverageThreshold,
        met: equationCoverage >= criteria.equationCoverageThreshold
      },
      chunkCompletion: {
        current: chunkCompletion,
        required: criteria.minimumChunksThreshold,
        met: chunkCompletion >= criteria.minimumChunksThreshold
      },
      resourceSections: {
        current: resourceUtilization,
        required: criteria.resourceSectionsThreshold,
        met: resourceUtilization >= criteria.resourceSectionsThreshold
      },
      engagementScore: {
        current: engagementScore,
        required: criteria.engagementThreshold,
        met: engagementScore >= criteria.engagementThreshold
      }
    };
    
    logger.info('VALIDATE-COMPLETION', 'Validation results calculated', validationResults, requestId);

    // Determine overall completion status
    const allCriteriaMet = Object.values(validationResults).every(result => result.met);
    
    // Calculate missing requirements and recommendations
    const missingRequirements = [];
    const recommendations = [];
    
    if (!validationResults.conceptCoverage.met) {
      const missingPercentage = Math.round((criteria.conceptCoverageThreshold - conceptCoverage) * 100);
      missingRequirements.push(`Cover ${missingPercentage}% more concepts`);
      recommendations.push('Continue with the next lesson chunks to cover more concepts');
    }
    
    if (!validationResults.equationCoverage.met) {
      missingRequirements.push('Practice more mathematical equations');
      recommendations.push('Ask questions about equations or request examples');
    }
    
    if (!validationResults.chunkCompletion.met) {
      const missingChunks = Math.ceil((criteria.minimumChunksThreshold * totalChunks) - chunksDelivered);
      missingRequirements.push(`Complete ${missingChunks} more lesson chunks`);
      recommendations.push('Continue with the lesson to complete more sections');
    }
    
    if (!validationResults.resourceSections.met) {
      const missingResources = criteria.resourceSectionsThreshold - resourceUtilization;
      missingRequirements.push(`Engage with ${missingResources} more resource sections`);
      recommendations.push('Ask questions to explore different aspects of the topic');
    }
    
    if (!validationResults.engagementScore.met) {
      missingRequirements.push('Increase engagement with the lesson');
      if (totalInteractions < 2) {
        recommendations.push('Ask more questions about the lesson content');
      }
      if (sessionDurationMinutes < 10) {
        recommendations.push('Spend more time reviewing the lesson material');
      }
    }
    
    logger.info('VALIDATE-COMPLETION', 'Missing requirements calculated', {
      missingCount: missingRequirements.length,
      recommendationsCount: recommendations.length
    }, requestId);

    // Check minimum lesson duration (at least 5 minutes)
    const minimumDurationMet = sessionDurationMinutes >= 5;
    if (!minimumDurationMet) {
      missingRequirements.push('Spend at least 5 minutes in the lesson');
      recommendations.push('Take more time to absorb the lesson content');
    }
    
    // Calculate estimated time to completion
    let estimatedTimeToCompletion = 0;
    if (!allCriteriaMet) {
      const remainingChunks = Math.max(0, Math.ceil((criteria.minimumChunksThreshold * totalChunks) - chunksDelivered));
      const averageChunkTime = chunksDelivered > 0 ? sessionDurationMinutes / chunksDelivered : 3;
      estimatedTimeToCompletion = remainingChunks * averageChunkTime;
      
      // Add time for engagement if needed
      if (!validationResults.engagementScore.met) {
        estimatedTimeToCompletion += 5; // Additional 5 minutes for engagement
      }
    }
    
    logger.info('VALIDATE-COMPLETION', 'Time estimation calculated', {
      estimatedTimeToCompletion,
      minimumDurationMet
    }, requestId);

    // Update session status if ready for completion
    if (allCriteriaMet && minimumDurationMet) {
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
      isReadyForCompletion: allCriteriaMet && minimumDurationMet,
      validationResults,
      missingRequirements,
      recommendations,
      progressSummary: {
        conceptsDelivered: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        progressPercentage: progressSummary.progressPercentage,
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
      criteria
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