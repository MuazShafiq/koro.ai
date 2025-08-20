import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../src/utils/supabase/server';
import { logger } from '../../../../../src/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const timestamp = new Date().toISOString();
    const { sessionId } = await params;
    
    logger.info('SESSION-GET', 'Fetching session data', {
      sessionId
    });
    
    const supabase = await createClient();

    // Get current user
    logger.info('SESSION-GET', 'Authenticating user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('SESSION-GET', 'Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('SESSION-GET', 'User authenticated', {
      userId: user.id,
      email: user.email
    });

    // Get session data
    logger.database('Fetching session with related data');
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select(`
        *,
        subjects(id, name, description, icon, gradient),
        topics(id, name)
      `)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('SESSION-GET', 'Session not found', {
        sessionId,
        userId: user.id,
        error: sessionError
      });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    logger.database('Session found', {
      sessionId: session.id,
      subjectName: session.subjects?.name,
      topicName: session.topics?.name,
      currentPhase: session.current_phase,
      status: session.status,
      hasLessonPlan: !!session.lesson_plan
    });

    // Parse lesson plan if it exists
    logger.info('SESSION-GET', 'Parsing lesson plan');
    let lessonPlan = null;
    let assessmentQuestions = [];
    
    if (session.lesson_plan) {
      try {
        lessonPlan = JSON.parse(session.lesson_plan);
        assessmentQuestions = lessonPlan.assessment_questions || [];
        logger.info('SESSION-GET', 'Lesson plan parsed', {
          hasOverview: !!lessonPlan.lesson_overview,
          keyConcepts: lessonPlan.key_concepts?.length || 0,
          chunksCount: lessonPlan.lesson_chunks?.length || 0,
          assessmentQuestionsCount: assessmentQuestions.length
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('SESSION-GET', 'Error parsing lesson plan', {
          error: errorMessage,
          lessonPlanType: typeof session.lesson_plan
        });
      }
    } else {
      logger.warn('SESSION-GET', 'No lesson plan found');
    }

    // Get lesson chunks for this session
    logger.database('Fetching lesson chunks');
    const { data: chunks, error: chunksError } = await supabase
      .from('lesson_chunks')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      logger.error('SESSION-GET', 'Error fetching chunks', { error: chunksError });
    } else {
      logger.database('Chunks fetched', {
        chunksCount: chunks?.length || 0,
        chunkIndexes: chunks?.map(c => c.chunk_index) || []
      });
    }

    // Get student assessments
    logger.database('Fetching student assessments');
    const { data: assessments, error: assessmentsError } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (assessmentsError) {
      logger.error('SESSION-GET', 'Error fetching assessments', { error: assessmentsError });
    } else {
      logger.database('Assessments fetched', {
        assessmentsCount: assessments?.length || 0,
        assessmentTypes: assessments?.map(a => a.assessment_type) || []
      });
    }

    const responseData = {
      session: {
        id: session.id,
        subjectId: session.subject_id,
        topicId: session.topic_id,
        currentPhase: session.current_phase,
        currentChunkIndex: session.current_chunk_index,
        status: session.status,
        createdAt: session.created_at,
        updatedAt: session.updated_at
      },
      subject: session.subjects,
      topic: session.topics,
      lessonPlan,
      assessmentQuestions,
      chunks: chunks || [],
      assessments: assessments || []
    };
    
    logger.info('SESSION-GET', 'Success! Returning session data', {
      sessionId: responseData.session.id,
      currentPhase: responseData.session.currentPhase,
      currentChunkIndex: responseData.session.currentChunkIndex,
      status: responseData.session.status,
      chunksCount: responseData.chunks.length,
      assessmentsCount: responseData.assessments.length,
      hasLessonPlan: !!responseData.lessonPlan
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('SESSION-GET', 'Fatal error', errorDetails);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const timestamp = new Date().toISOString();
    const { sessionId } = await params;
    const body = await request.json();
    const { status, currentPhase, currentChunkIndex } = body;
    
    logger.info('SESSION-PATCH', 'Updating session', {
      sessionId,
      status,
      currentPhase,
      currentChunkIndex
    });
    
    const supabase = await createClient();

    // Get current user
    logger.info('SESSION-PATCH', 'Authenticating user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('SESSION-PATCH', 'Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('SESSION-PATCH', 'User authenticated', {
      userId: user.id,
      email: user.email
    });

    // Update session
    logger.info('SESSION-PATCH', 'Preparing update data');
    const updateData: any = {};
    if (status) updateData.status = status;
    if (currentPhase) updateData.current_phase = currentPhase;
    if (currentChunkIndex !== undefined) updateData.current_chunk_index = currentChunkIndex;
    
    logger.database('Update data prepared', updateData);

    const { data: session, error: updateError } = await supabase
      .from('lesson_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !session) {
      logger.error('SESSION-PATCH', 'Update failed', {
        sessionId,
        userId: user.id,
        updateData,
        error: updateError
      });
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 400 }
      );
    }
    
    logger.database('Session updated successfully', {
      sessionId: session.id,
      newStatus: session.status,
      newPhase: session.current_phase,
      newChunkIndex: session.current_chunk_index
    });

    const responseData = { session };
    
    logger.info('SESSION-PATCH', 'Success! Returning updated session', {
      sessionId: responseData.session.id,
      status: responseData.session.status,
      currentPhase: responseData.session.current_phase,
      currentChunkIndex: responseData.session.current_chunk_index
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('SESSION-PATCH', 'Fatal error', errorDetails);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const timestamp = new Date().toISOString();
    const { sessionId } = await params;
    
    logger.info('SESSION-DELETE', 'Deleting session', {
      sessionId
    });
    
    const supabase = await createClient();

    // Get current user
    logger.info('SESSION-DELETE', 'Authenticating user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('SESSION-DELETE', 'Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('SESSION-DELETE', 'User authenticated', {
      userId: user.id,
      email: user.email
    });

    // Delete session (this will cascade delete chunks and assessments due to foreign key constraints)
    logger.database('Deleting session and related data');
    const { error: deleteError } = await supabase
      .from('lesson_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('SESSION-DELETE', 'Delete failed', {
        sessionId,
        userId: user.id,
        error: deleteError
      });
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 400 }
      );
    }
    
    logger.database('Session deleted successfully', {
      sessionId,
      userId: user.id
    });

    const responseData = { success: true };
    
    logger.info('SESSION-DELETE', 'Success! Session and related data deleted', {
      sessionId,
      success: responseData.success
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('SESSION-DELETE', 'Fatal error', errorDetails);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}