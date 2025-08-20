import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { sessionId } = await params;
  
  logger.info('PROGRESS-API', 'Fetching session progress', { sessionId }, requestId);
  
  try {
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
    
    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('id, user_id')
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
    
    // Get progress summary using the database function
    const { data: progressData, error: progressError } = await supabase
      .rpc('get_session_progress_summary', {
        session_uuid: sessionId
      })
      .single() as {
        data: {
          progress_percentage: number;
          total_concepts: number;
          delivered_concepts: number;
        } | null;
        error: any;
      };
      
    if (progressError) {
      logger.error('PROGRESS-API', 'Failed to fetch progress summary', { progressError }, requestId);
      return NextResponse.json(
        { error: 'Failed to fetch progress data' },
        { status: 500 }
      );
    }
    
    logger.info('PROGRESS-API', 'Progress data retrieved successfully', {
      progressPercentage: progressData?.progress_percentage,
      totalConcepts: progressData?.total_concepts,
      deliveredConcepts: progressData?.delivered_concepts
    }, requestId);
    
    return NextResponse.json(progressData);
    
  } catch (error) {
    logger.error('PROGRESS-API', 'Unexpected error', { error }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}