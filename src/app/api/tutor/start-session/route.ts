import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subjectId, topicId } = await request.json();

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subject and topic information
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('name, description')
      .eq('id', subjectId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    let topic = null;
    if (topicId) {
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('name')
        .eq('id', topicId)
        .single();
      
      if (!topicError && topicData) {
        topic = topicData;
      }
    }

    // Get relevant resources using RAG
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: subjectId,
        topic_uuid: topicId
      });

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }

    // Prepare context for AI lesson planning
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const topicContext = topic ? `Topic: ${topic.name}` : 'General subject overview';

    // Generate initial lesson plan using OpenAI
    const lessonPlanPrompt = `You are an AI tutor creating a personalized lesson plan.

Subject: ${subject.name}
${topicContext}
Subject Description: ${subject.description || 'No description available'}

Available Educational Resources:
${resourceContext}

Create a high-level lesson plan that:
1. Uses ONLY the provided educational resources
2. Is structured for interactive learning
3. Includes 2-3 assessment questions to gauge student understanding
4. Can be broken into 2-3 minute chunks for delivery
5. Focuses on key concepts from the resources

Return a JSON object with:
{
  "lesson_overview": "Brief overview of what will be covered",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "assessment_questions": [
    {
      "question": "Question text",
      "purpose": "What this question assesses"
    }
  ],
  "estimated_duration": "Duration in minutes"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI tutor. Always respond with valid JSON only. Use only the provided educational resources for content.'
        },
        {
          role: 'user',
          content: lessonPlanPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    let lessonPlan;
    try {
      lessonPlan = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (parseError) {
      console.error('Failed to parse lesson plan JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate lesson plan' },
        { status: 500 }
      );
    }

    // Create lesson session in database
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: topicId,
        current_phase: 'assessment',
        lesson_plan: lessonPlan,
        session_status: 'active'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create lesson session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      subject: subject.name,
      topic: topic?.name || 'General',
      lessonOverview: lessonPlan.lesson_overview,
      assessmentQuestions: lessonPlan.assessment_questions,
      estimatedDuration: lessonPlan.estimated_duration
    });

  } catch (error) {
    console.error('Error in start-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
