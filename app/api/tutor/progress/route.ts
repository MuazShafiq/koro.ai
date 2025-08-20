import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/utils/supabase/server';
import { logger } from '../../../../src/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  logger.info('PROGRESS-API', 'Progress tracking request', { sessionId }, requestId);
  
  try {
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
      logger.error('PROGRESS-API', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get comprehensive progress summary
    const { data: progressSummary, error: summaryError } = await supabase
      .rpc('get_session_progress_summary', {
        session_uuid: sessionId
      });

    if (summaryError) {
      logger.error('PROGRESS-API', 'Failed to get progress summary', { summaryError }, requestId);
      return NextResponse.json(
        { error: 'Failed to retrieve progress data' },
        { status: 500 }
      );
    }

    // Get detailed progress records
    const { data: progressDetails, error: detailsError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (detailsError) {
      logger.error('PROGRESS-API', 'Failed to get progress details', { detailsError }, requestId);
      return NextResponse.json(
        { error: 'Failed to retrieve detailed progress' },
        { status: 500 }
      );
    }

    // Get session data for context
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('PROGRESS-API', 'Session not found', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Calculate additional metrics
    const conceptsDelivered = progressDetails?.filter(p => 
      p.delivery_status === 'delivered' || p.delivery_status === 'understood'
    ).length || 0;
    
    const conceptsPending = progressDetails?.filter(p => 
      p.delivery_status === 'pending'
    ).length || 0;
    
    const conceptsNeedingReview = progressDetails?.filter(p => 
      p.delivery_status === 'needs_review'
    ).length || 0;

    // Extract equations from progress records
    const equationsTracked = progressDetails?.reduce((acc, progress) => {
      if (progress.equation_references && Array.isArray(progress.equation_references)) {
        return acc.concat(progress.equation_references);
      }
      return acc;
    }, []) || [];

    // Calculate resource coverage
    const resourceSections = new Set(
      progressDetails?.map(p => p.resource_section).filter(Boolean) || []
    );

    const progressData = {
      sessionId,
      summary: progressSummary?.[0] || {
        progress_percentage: 0,
        total_concepts: 0,
        delivered_concepts: 0,
        pending_concepts: 0,
        equations_count: 0,
        resource_sections_covered: 0,
        avg_engagement_score: 0
      },
      detailed_metrics: {
        concepts_delivered: conceptsDelivered,
        concepts_pending: conceptsPending,
        concepts_needing_review: conceptsNeedingReview,
        equations_tracked: equationsTracked.length,
        unique_equations: [...new Set(equationsTracked)].length,
        resource_sections_covered: resourceSections.size,
        avg_engagement_score: progressDetails?.reduce((sum, p) => 
          sum + (p.student_engagement_score || 0), 0
        ) / (progressDetails?.length || 1)
      },
      progress_timeline: progressDetails?.map(p => ({
        id: p.id,
        concept_name: p.concept_name,
        delivery_status: p.delivery_status,
        delivery_timestamp: p.delivery_timestamp,
        engagement_score: p.student_engagement_score,
        resource_section: p.resource_section,
        equation_references: p.equation_references,
        understanding_verified: p.understanding_verified
      })) || [],
      session_context: {
        subject_id: session.subject_id,
        topic_id: session.topic_id,
        current_phase: session.current_phase,
        status: session.status,
        concepts_covered: session.concepts_covered || [],
        equations_covered: session.equations_covered || [],
        resource_coverage: session.resource_coverage || {},
        last_content_position: session.last_content_position
      },
      completion_readiness: {
        min_concepts_threshold: 0.8, // 80% of concepts should be delivered
        current_completion: (conceptsDelivered / Math.max(progressDetails?.length || 1, 1)),
        equations_covered: equationsTracked.length > 0,
        resource_utilization: resourceSections.size > 0,
        ready_for_completion: false
      }
    };

    // Determine if session is ready for completion
    progressData.completion_readiness.ready_for_completion = 
      progressData.completion_readiness.current_completion >= progressData.completion_readiness.min_concepts_threshold &&
      progressData.completion_readiness.equations_covered &&
      progressData.completion_readiness.resource_utilization;

    logger.info('PROGRESS-API', 'Progress data compiled successfully', {
      totalConcepts: progressData.summary.total_concepts,
      deliveredConcepts: progressData.detailed_metrics.concepts_delivered,
      progressPercentage: progressData.summary.progress_percentage,
      readyForCompletion: progressData.completion_readiness.ready_for_completion
    }, requestId);

    return NextResponse.json(progressData);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('PROGRESS-API', 'Unexpected error', { error: errorMessage }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  logger.info('PROGRESS-API', 'Progress update request', {}, requestId);
  
  try {
    const { sessionId, conceptName, resourceSection, equationReferences, engagementScore } = await request.json();
    
    if (!sessionId || !conceptName) {
      return NextResponse.json(
        { error: 'Session ID and concept name are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('PROGRESS-API', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('PROGRESS-API', 'Session not found or unauthorized', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Add concept progress
    const { data: progressId, error: addError } = await supabase
      .rpc('add_concept_progress', {
        session_uuid: sessionId,
        concept_text: conceptName,
        resource_section_text: resourceSection || null,
        equation_refs: equationReferences || []
      });

    if (addError) {
      logger.error('PROGRESS-API', 'Failed to add concept progress', { addError }, requestId);
      return NextResponse.json(
        { error: 'Failed to add progress' },
        { status: 500 }
      );
    }

    // Mark as delivered if engagement score provided
    if (engagementScore !== undefined && progressId) {
      const { error: markError } = await supabase
        .rpc('mark_concept_delivered', {
          progress_uuid: progressId,
          engagement_score: engagementScore
        });

      if (markError) {
        logger.error('PROGRESS-API', 'Failed to mark concept as delivered', { markError }, requestId);
      }
    }

    logger.info('PROGRESS-API', 'Progress updated successfully', {
      progressId,
      conceptName,
      hasEngagementScore: engagementScore !== undefined
    }, requestId);

    return NextResponse.json({
      success: true,
      progressId,
      message: 'Progress updated successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('PROGRESS-API', 'Unexpected error in POST', { error: errorMessage }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}