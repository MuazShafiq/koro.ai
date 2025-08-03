import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, answers } = await request.json();

    if (!sessionId || !answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Session ID and answers array are required' },
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
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get resources for context
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: session.subject_id,
        topic_uuid: session.topic_id
      });

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }

    // Store student assessments
    const assessmentPromises = answers.map(async (answer: any, index: number) => {
      return supabase
        .from('student_assessments')
        .insert({
          session_id: sessionId,
          question: answer.question,
          student_answer: answer.answer,
          assessment_type: 'understanding'
        });
    });

    await Promise.all(assessmentPromises);

    // Prepare context for AI evaluation
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const answersContext = answers
      .map((a: any) => `Q: ${a.question}\nA: ${a.answer}`)
      .join('\n\n');

    // Evaluate student responses and refine lesson plan
    const evaluationPrompt = `You are an AI tutor evaluating student responses to refine a lesson plan.

Original Lesson Plan:
${JSON.stringify(session.lesson_plan, null, 2)}

Available Educational Resources:
${resourceContext}

Student Assessment Responses:
${answersContext}

Based on the student's responses, evaluate their understanding and refine the lesson plan.
Use ONLY the provided educational resources for content.

Return a JSON object with:
{
  "student_evaluation": {
    "understanding_level": "beginner|intermediate|advanced",
    "strengths": ["area1", "area2"],
    "areas_for_focus": ["area1", "area2"],
    "learning_style_indicators": "Brief assessment of how they learn best"
  },
  "refined_lesson_plan": {
    "lesson_overview": "Updated overview based on student level",
    "key_concepts": ["prioritized concepts based on student needs"],
    "lesson_chunks": [
      {
        "chunk_index": 1,
        "topic": "Chunk topic",
        "content_outline": "What will be covered",
        "duration_minutes": 2
      }
    ],
    "interaction_points": ["Points where student can ask questions"]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI tutor. Always respond with valid JSON only. Adapt lessons based on student understanding while using only provided educational resources.'
        },
        {
          role: 'user',
          content: evaluationPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    // Helper function to extract JSON from markdown code blocks
    const extractJsonFromMarkdown = (content: string): string => {
      // Remove markdown code block formatting
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return jsonMatch[1].trim();
      }
      // If no code blocks found, return original content
      return content.trim();
    };

    let evaluation;
    try {
      const rawContent = completion.choices[0].message.content || '{}';
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      evaluation = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse evaluation JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to evaluate responses' },
        { status: 500 }
      );
    }

    // Update session with refined lesson plan and move to delivery phase
    const updatedResponses = [...(session.student_responses || []), ...answers];
    
    const { error: updateError } = await supabase
      .from('lesson_sessions')
      .update({
        current_phase: 'delivery',
        lesson_plan: evaluation.refined_lesson_plan,
        student_responses: updatedResponses
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // Store AI evaluation in assessments
    const evaluationPromises = answers.map(async (answer: any, index: number) => {
      return supabase
        .from('student_assessments')
        .update({
          ai_evaluation: {
            understanding_level: evaluation.student_evaluation.understanding_level,
            feedback: `Based on this response, the student shows ${evaluation.student_evaluation.understanding_level} understanding.`
          }
        })
        .eq('session_id', sessionId)
        .eq('question', answer.question);
    });

    await Promise.all(evaluationPromises);

    return NextResponse.json({
      sessionId,
      evaluation: evaluation.student_evaluation,
      refinedLessonPlan: evaluation.refined_lesson_plan,
      nextPhase: 'delivery',
      message: 'Assessment completed. Ready to begin lesson delivery.'
    });

  } catch (error) {
    console.error('Error in assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}