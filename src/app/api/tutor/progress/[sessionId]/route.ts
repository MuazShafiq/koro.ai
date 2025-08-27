import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // TEMPORARILY COMMENTED OUT FOR DEMO - Progress functionality disabled
  /*
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // For testing purposes, allow unauthenticated requests with a test user ID
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = user?.id || testUserId;

    if (authError) {
      console.log('Auth error (continuing with test user):', authError);
    }

    // Get the lesson session and verify ownership
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select(`
        id,
        user_id,
        subject_id,
        topic_id,
        current_phase,
        status,
        lesson_plan,
        student_responses,
        current_chunk_index,
        created_at,
        updated_at,
        subjects(id, name),
        topics(id, name)
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Get progress data from lesson_progress table
    const { data: progressData, error: progressError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (progressError) {
      console.error('Error fetching progress data:', progressError);
    }

    // Calculate progress metrics
    const totalChunks = session.lesson_plan?.chunks?.length || 0;
    const currentChunkIndex = session.current_chunk_index || 0;
    const progressPercentage = totalChunks > 0 ? Math.round((currentChunkIndex / totalChunks) * 100) : 0;

    // Extract concepts covered from progress data
    const conceptsCovered = progressData?.map(p => p.concept_id).filter(Boolean) || [];
    const uniqueConceptsCovered = [...new Set(conceptsCovered)];

    // Calculate assessment scores if available
    const assessmentScores = progressData?.filter(p => p.assessment_score !== null)
      .map(p => p.assessment_score) || [];
    const averageScore = assessmentScores.length > 0 
      ? assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length 
      : null;

    // Return comprehensive progress data
    return NextResponse.json({
      sessionId: session.id,
      userId: session.user_id,
      subject: session.subjects,
      topic: session.topics,
      currentPhase: session.current_phase,
      status: session.status,
      progress: {
        currentChunkIndex,
        totalChunks,
        progressPercentage,
        conceptsCovered: uniqueConceptsCovered,
        totalConceptsCovered: uniqueConceptsCovered.length,
        averageAssessmentScore: averageScore,
        totalAssessments: assessmentScores.length
      },
      lessonPlan: session.lesson_plan,
      studentResponses: session.student_responses,
      progressHistory: progressData || [],
      timestamps: {
        createdAt: session.created_at,
        updatedAt: session.updated_at
      }
    });

  } catch (error) {
    console.error('Error in progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
  */

  // Return mock progress data for demo
  const { sessionId } = await params;
  return NextResponse.json({
    sessionId,
    progress: {
      progressPercentage: 25,
      totalConcepts: 10,
      deliveredConcepts: 3,
      pendingConcepts: 7,
      equationsCount: 2,
      resourceSectionsCovered: 1,
      avgEngagementScore: 85
    },
    status: 'active'
  });
}

// Handle unsupported methods
export async function POST() {
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