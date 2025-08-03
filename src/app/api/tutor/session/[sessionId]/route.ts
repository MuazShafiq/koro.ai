import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Get session data
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
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Parse lesson plan if it exists
    let lessonPlan = null;
    let assessmentQuestions = [];
    
    if (session.lesson_plan) {
      try {
        lessonPlan = JSON.parse(session.lesson_plan);
        assessmentQuestions = lessonPlan.assessment_questions || [];
      } catch (error) {
        console.error('Error parsing lesson plan:', error);
      }
    }

    // Get lesson chunks for this session
    const { data: chunks, error: chunksError } = await supabase
      .from('lesson_chunks')
      .select('*')
      .eq('session_id', sessionId)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
    }

    // Get student assessments
    const { data: assessments, error: assessmentsError } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
    }

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Error fetching session:', error);
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { status, currentPhase, currentChunkIndex } = body;

    // Update session
    const updateData: any = {};
    if (status) updateData.status = status;
    if (currentPhase) updateData.current_phase = currentPhase;
    if (currentChunkIndex !== undefined) updateData.current_chunk_index = currentChunkIndex;

    const { data: session, error: updateError } = await supabase
      .from('lesson_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !session) {
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 400 }
      );
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Error updating session:', error);
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Delete session (this will cascade delete chunks and assessments due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('lesson_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}