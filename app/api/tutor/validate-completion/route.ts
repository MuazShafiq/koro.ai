import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/utils/supabase/server';
import { logger } from '../../../../src/lib/logger';
import { progressService } from '../../../../src/lib/services/progressService';

export interface CompletionValidationResult {
  canComplete: boolean;
  validationPassed: boolean;
  progressSummary: {
    progressPercentage: number;
    deliveredConcepts: number;
    totalConcepts: number;
    equationsCount: number;
    resourceSectionsCovered: number;
    avgEngagementScore: number;
  };
  thresholds: {
    minConceptsCoverage: number;
    minEquationsCoverage: number;
    minResourceSections: number;
    minEngagementScore: number;
  };
  validationResults: {
    conceptsThresholdMet: boolean;
    equationsThresholdMet: boolean;
    resourceThresholdMet: boolean;
    engagementThresholdMet: boolean;
  };
  missingRequirements: string[];
  recommendations: string[];
  estimatedTimeToCompletion?: number;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  
  logger.info('VALIDATE-COMPLETION', 'Session completion validation request', {}, requestId);
  
  try {
    const { sessionId, customThresholds } = await request.json();
    
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
      logger.error('VALIDATE-COMPLETION', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session ownership
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('VALIDATE-COMPLETION', 'Session not found or unauthorized', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get lesson plan for context
    const lessonPlan = session.lesson_plan;
    const complexity = lessonPlan?.student_evaluation?.understanding_level || 'intermediate';
    
    // Define thresholds based on complexity and custom overrides
    const defaultThresholds = {
      basic: {
        minConceptsCoverage: 0.8,
        minEquationsCoverage: 2,
        minResourceSections: 2,
        minEngagementScore: 0.6
      },
      intermediate: {
        minConceptsCoverage: 0.75,
        minEquationsCoverage: 3,
        minResourceSections: 3,
        minEngagementScore: 0.7
      },
      advanced: {
        minConceptsCoverage: 0.7,
        minEquationsCoverage: 5,
        minResourceSections: 4,
        minEngagementScore: 0.75
      }
    };
    
    const thresholds = {
      ...defaultThresholds[complexity as keyof typeof defaultThresholds],
      ...customThresholds
    };
    
    logger.info('VALIDATE-COMPLETION', 'Validation thresholds set', {
      complexity,
      thresholds
    }, requestId);

    // Get comprehensive progress summary
    const progressSummary = await progressService.getProgressSummary(sessionId);
    
    // Get completion readiness check
    const completionReadiness = await progressService.checkCompletionReadiness(
      sessionId,
      {
        minConceptsThreshold: thresholds.minConceptsCoverage,
        minEquationsThreshold: thresholds.minEquationsCoverage,
        minResourceSections: thresholds.minResourceSections
      }
    );
    
    // Additional validation checks
    const conceptsCoverageRatio = progressSummary.totalConcepts > 0 
      ? progressSummary.deliveredConcepts / progressSummary.totalConcepts 
      : 0;
    
    const validationResults = {
      conceptsThresholdMet: conceptsCoverageRatio >= thresholds.minConceptsCoverage,
      equationsThresholdMet: progressSummary.equationsCount >= thresholds.minEquationsCoverage,
      resourceThresholdMet: progressSummary.resourceSectionsCovered >= thresholds.minResourceSections,
      engagementThresholdMet: progressSummary.avgEngagementScore >= thresholds.minEngagementScore
    };
    
    // Collect missing requirements and recommendations
    const missingRequirements: string[] = [];
    const recommendations: string[] = [];
    
    if (!validationResults.conceptsThresholdMet) {
      const missing = Math.ceil((thresholds.minConceptsCoverage * progressSummary.totalConcepts) - progressSummary.deliveredConcepts);
      missingRequirements.push(`Need to deliver ${missing} more concepts (${Math.round(thresholds.minConceptsCoverage * 100)}% coverage required)`);
      recommendations.push('Continue with lesson delivery to cover more key concepts');
    }
    
    if (!validationResults.equationsThresholdMet) {
      const missing = thresholds.minEquationsCoverage - progressSummary.equationsCount;
      missingRequirements.push(`Need to cover ${missing} more equations (minimum ${thresholds.minEquationsCoverage} required)`);
      recommendations.push('Focus on mathematical content and equation-heavy sections');
    }
    
    if (!validationResults.resourceThresholdMet) {
      const missing = thresholds.minResourceSections - progressSummary.resourceSectionsCovered;
      missingRequirements.push(`Need to utilize ${missing} more resource sections (minimum ${thresholds.minResourceSections} required)`);
      recommendations.push('Explore additional resource sections to broaden coverage');
    }
    
    if (!validationResults.engagementThresholdMet) {
      const currentScore = Math.round(progressSummary.avgEngagementScore * 100);
      const requiredScore = Math.round(thresholds.minEngagementScore * 100);
      missingRequirements.push(`Need to improve engagement score from ${currentScore}% to ${requiredScore}%`);
      recommendations.push('Review difficult concepts and ensure student understanding');
    }
    
    // Check for minimum lesson duration (optional)
    const minLessonDuration = 10; // minutes
    const { data: chunks, error: chunksError } = await supabase
      .from('lesson_chunks')
      .select('delivered_at')
      .eq('session_id', sessionId)
      .order('delivered_at', { ascending: true });
    
    let lessonDuration = 0;
    if (!chunksError && chunks && chunks.length > 1) {
      const startTime = new Date(chunks[0].delivered_at).getTime();
      const endTime = new Date(chunks[chunks.length - 1].delivered_at).getTime();
      lessonDuration = (endTime - startTime) / (1000 * 60); // minutes
      
      if (lessonDuration < minLessonDuration) {
        missingRequirements.push(`Lesson duration too short: ${Math.round(lessonDuration)} minutes (minimum ${minLessonDuration} minutes)`);
        recommendations.push('Spend more time on each concept to ensure thorough understanding');
      }
    }
    
    // Calculate estimated time to completion
    let estimatedTimeToCompletion: number | undefined;
    if (missingRequirements.length > 0) {
      const remainingConcepts = Math.max(0, (thresholds.minConceptsCoverage * progressSummary.totalConcepts) - progressSummary.deliveredConcepts);
      const avgTimePerConcept = 3; // minutes
      estimatedTimeToCompletion = Math.ceil(remainingConcepts * avgTimePerConcept);
    }
    
    // Determine if session can be completed
    const allThresholdsMet = Object.values(validationResults).every(result => result);
    const canComplete = allThresholdsMet && lessonDuration >= minLessonDuration;
    
    const validationResult: CompletionValidationResult = {
      canComplete,
      validationPassed: allThresholdsMet,
      progressSummary: {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        equationsCount: progressSummary.equationsCount,
        resourceSectionsCovered: progressSummary.resourceSectionsCovered,
        avgEngagementScore: progressSummary.avgEngagementScore
      },
      thresholds,
      validationResults,
      missingRequirements,
      recommendations,
      estimatedTimeToCompletion
    };
    
    // Log validation results
    logger.info('VALIDATE-COMPLETION', 'Validation completed', {
      sessionId,
      canComplete,
      validationPassed: allThresholdsMet,
      missingRequirements: missingRequirements.length,
      progressPercentage: progressSummary.progressPercentage,
      lessonDuration: Math.round(lessonDuration)
    }, requestId);
    
    // If validation passes, optionally update session status
    if (canComplete) {
      try {
        await supabase
          .from('lesson_sessions')
          .update({
            status: 'ready_for_completion',
            completion_validated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
          
        logger.info('VALIDATE-COMPLETION', 'Session marked as ready for completion', { sessionId }, requestId);
      } catch (updateError) {
        logger.warn('VALIDATE-COMPLETION', 'Failed to update session status', { updateError }, requestId);
      }
    }
    
    return NextResponse.json(validationResult);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('VALIDATE-COMPLETION', 'Unexpected error', { error: errorMessage }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current validation status without updating
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  
  logger.info('VALIDATE-COMPLETION', 'Validation status check', { sessionId }, requestId);
  
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get basic completion readiness
    const completionReadiness = await progressService.checkCompletionReadiness(sessionId);
    const progressSummary = await progressService.getProgressSummary(sessionId);
    
    return NextResponse.json({
      sessionId,
      readyForCompletion: completionReadiness.readyForCompletion,
      completionPercentage: completionReadiness.completionPercentage,
      progressSummary: {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        equationsCount: progressSummary.equationsCount
      },
      missingRequirements: completionReadiness.missingRequirements
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('VALIDATE-COMPLETION', 'Unexpected error in GET', { error: errorMessage }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}