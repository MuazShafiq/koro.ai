import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/utils/supabase/server';
import OpenAI from 'openai';
import { logger } from '../../../../src/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  try {
    const { sessionId, answers } = await request.json();
    logger.info('ASSESSMENT', 'Request received', {
      sessionId,
      answersCount: answers?.length || 0,
      isArray: Array.isArray(answers)
    }, requestId);

    if (!sessionId || !answers || !Array.isArray(answers)) {
      logger.error('ASSESSMENT', 'Missing required parameters', {
        hasSessionId: !!sessionId,
        hasAnswers: !!answers,
        isAnswersArray: Array.isArray(answers)
      }, requestId);
      return NextResponse.json(
        { error: 'Session ID and answers array are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    logger.info('ASSESSMENT', 'Authenticating user', {}, requestId);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('ASSESSMENT', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    logger.info('ASSESSMENT', 'User authenticated', { userId: user.id }, requestId);

    // Get session data
    logger.database('Fetching session data', { sessionId }, requestId);
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('ASSESSMENT', 'Session not found', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    logger.database('Session found', {
      id: session.id,
      phase: session.current_phase,
      hasLessonPlan: !!session.lesson_plan
    }, requestId);

    // Get resources for context
    logger.database('Fetching resources', {
      subjectId: session.subject_id,
      topicId: session.topic_id
    }, requestId);
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: session.subject_id,
        topic_uuid: session.topic_id
      });

    if (resourcesError) {
      logger.error('ASSESSMENT', 'Error fetching resources', { resourcesError }, requestId);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }
    logger.database('Resources fetched', {
      count: resources?.length || 0,
      titles: resources?.map((r: any) => r.title) || []
    }, requestId);

    // Store student assessments
    logger.database('Storing student assessments', {
      assessmentCount: answers.length
    }, requestId);
    const assessmentPromises = answers.map(async (answer: any, index: number) => {
      logger.database(`Storing assessment ${index + 1}`, {
        questionPreview: answer.question?.substring(0, 50) + '...',
        answerLength: answer.answer?.length || 0
      }, requestId);
      return supabase
        .from('student_assessments')
        .insert({
          session_id: sessionId,
          question: answer.question,
          student_answer: answer.answer,
          assessment_type: 'understanding'
        });
    });

    const assessmentResults = await Promise.all(assessmentPromises);
    logger.database('All assessments stored', {}, requestId);
    
    // Check for any errors in storing assessments
    const assessmentErrors = assessmentResults.filter(result => result.error);
    if (assessmentErrors.length > 0) {
      logger.error('ASSESSMENT', 'Some assessment storage errors', {
        errorCount: assessmentErrors.length,
        errors: assessmentErrors
      }, requestId);
    }

    // Prepare context for AI evaluation
    logger.info('ASSESSMENT', 'Preparing evaluation context', {}, requestId);
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const answersContext = answers
      .map((a: any) => `Q: ${a.question}\nA: ${a.answer}`)
      .join('\n\n');
      
    logger.info('ASSESSMENT', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      answersContextLength: answersContext.length,
      answersCount: answers.length
    }, requestId);

    // Evaluate student responses and refine lesson plan
    logger.openai('Preparing evaluation', {}, requestId);
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
    
    logger.openai('Calling API for evaluation', {
      promptLength: evaluationPrompt.length
    }, requestId);
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
    
    logger.openai('Response received', {
      model: completion.model,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason
    }, requestId);

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
      logger.info('ASSESSMENT', 'Parsing evaluation results', {
        length: rawContent.length,
        preview: rawContent.substring(0, 200) + '...'
      }, requestId);
      
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      logger.info('ASSESSMENT', 'Content cleaned', {
        cleanedLength: cleanedContent.length
      }, requestId);
      
      evaluation = JSON.parse(cleanedContent);
      logger.info('ASSESSMENT', 'Evaluation parsed successfully', {
        hasStudentEvaluation: !!evaluation.student_evaluation,
        understandingLevel: evaluation.student_evaluation?.understanding_level,
        hasRefinedPlan: !!evaluation.refined_lesson_plan,
        chunksCount: evaluation.refined_lesson_plan?.lesson_chunks?.length || 0
      }, requestId);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      logger.error('ASSESSMENT', 'Failed to parse evaluation JSON', {
        error: errorMessage,
        rawContent: completion.choices[0].message.content
      }, requestId);
      return NextResponse.json(
        { error: 'Failed to evaluate responses' },
        { status: 500 }
      );
    }

    // Update session with refined lesson plan and move to delivery phase
    logger.database('Updating session with refined lesson plan', {}, requestId);
    const updatedResponses = [...(session.student_responses || []), ...answers];
    
    const sessionUpdateData = {
      current_phase: 'delivery',
      lesson_plan: evaluation.refined_lesson_plan,
      student_responses: updatedResponses
    };
    
    logger.database('Session update data prepared', {
      newPhase: sessionUpdateData.current_phase,
      hasRefinedPlan: !!sessionUpdateData.lesson_plan,
      responsesCount: sessionUpdateData.student_responses.length
    }, requestId);
    
    const { error: updateError } = await supabase
      .from('lesson_sessions')
      .update(sessionUpdateData)
      .eq('id', sessionId);

    if (updateError) {
      logger.error('ASSESSMENT', 'Error updating session', { updateError }, requestId);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }
    
    logger.database('Session updated successfully', {}, requestId);

    // Store AI evaluation in assessments
    logger.database('Storing AI evaluations', {}, requestId);
    const evaluationPromises = answers.map(async (answer: any, index: number) => {
      logger.database(`Updating evaluation for question ${index + 1}`, {}, requestId);
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

    const evaluationUpdateResults = await Promise.all(evaluationPromises);
    logger.database('All evaluations updated successfully', {}, requestId);
    
    // Check for any errors in updating evaluations
    const evaluationUpdateErrors = evaluationUpdateResults.filter(result => result.error);
    if (evaluationUpdateErrors.length > 0) {
      logger.error('ASSESSMENT', 'Some evaluation update errors', {
        errorCount: evaluationUpdateErrors.length,
        errors: evaluationUpdateErrors
      }, requestId);
    }

    const responseData = {
      sessionId,
      evaluation: evaluation.student_evaluation,
      refinedLessonPlan: evaluation.refined_lesson_plan,
      nextPhase: 'delivery',
      message: 'Assessment completed. Ready to begin lesson delivery.'
    };
    
    logger.info('ASSESSMENT', 'Assessment completed successfully', {
      sessionId: responseData.sessionId,
      understandingLevel: responseData.evaluation?.understanding_level,
      hasRefinedPlan: !!responseData.refinedLessonPlan,
      chunksCount: responseData.refinedLessonPlan?.lesson_chunks?.length || 0,
      nextPhase: responseData.nextPhase,
      processingTime: Date.now() - startTime
    }, requestId);
    
    return NextResponse.json(responseData);

  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('ASSESSMENT', 'Fatal error', {
      error: errorDetails,
      processingTime: Date.now() - startTime
    }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}