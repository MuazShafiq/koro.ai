import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { hostedAI as openai, hostedAIModel } from '@/lib/services/hostedAI';
import { logger } from '@/lib/logger';

export const maxDuration = 60;

type AssessmentAnswer = {
  question: string;
  answer: string;
};

type StudentEvaluation = {
  understanding_level: 'beginner' | 'intermediate' | 'advanced';
  strengths: string[];
  areas_for_focus: string[];
  learning_style_indicators: string;
};

function createFallbackEvaluation(answers: AssessmentAnswer[]): StudentEvaluation {
  const averageWords = answers.reduce(
    (total, item) => total + item.answer.trim().split(/\s+/).filter(Boolean).length,
    0,
  ) / Math.max(1, answers.length);

  const understandingLevel = averageWords >= 35
    ? 'advanced'
    : averageWords >= 14
      ? 'intermediate'
      : 'beginner';

  return {
    understanding_level: understandingLevel,
    strengths: ['Engaged with the initial knowledge check'],
    areas_for_focus: ['Build confidence through clear examples and guided practice'],
    learning_style_indicators: 'Use concise explanations followed by worked examples.',
  };
}

function normalizeLessonPlan(plan: any, evaluation: StudentEvaluation) {
  const sourceChunks = Array.isArray(plan?.lesson_chunks)
    ? plan.lesson_chunks
    : Array.isArray(plan?.chunks)
      ? plan.chunks
      : [];

  const lessonChunks = sourceChunks.map((chunk: any, index: number) => ({
    ...chunk,
    chunk_index: Number.isFinite(chunk?.chunk_index) ? chunk.chunk_index : index,
    topic: chunk?.topic || chunk?.title || `Lesson section ${index + 1}`,
    title: chunk?.title || chunk?.topic || `Lesson section ${index + 1}`,
    content_outline: chunk?.content_outline || chunk?.content || '',
    content: chunk?.content || chunk?.content_outline || '',
    duration_minutes: chunk?.duration_minutes || chunk?.duration || 2,
  }));

  if (lessonChunks.length === 0) {
    const overview = typeof plan?.overview === 'string'
      ? plan.overview
      : plan?.overview?.description || 'A guided introduction to the selected subject.';
    lessonChunks.push({
      chunk_index: 0,
      topic: 'Core concepts',
      title: 'Core concepts',
      content_outline: overview,
      content: overview,
      duration_minutes: 2,
    });
  }

  return {
    ...plan,
    lesson_overview: plan?.lesson_overview || plan?.overview?.description || plan?.overview || '',
    key_concepts: plan?.key_concepts || plan?.keyConcepts || [],
    lesson_chunks: lessonChunks,
    interaction_points: Array.isArray(plan?.interaction_points) ? plan.interaction_points : [],
    student_evaluation: evaluation,
  };
}

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

    if (
      !sessionId ||
      !Array.isArray(answers) ||
      answers.length === 0 ||
      answers.some(answer => (
        !answer ||
        typeof answer.question !== 'string' ||
        typeof answer.answer !== 'string'
      ))
    ) {
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

    // Topic selection is optional. Match the startup path and only query the
    // topic-scoped RPC when a topic actually exists.
    let resources: Array<{ title: string; content_text: string | null }> = [];
    if (session.topic_id) {
      logger.database('Fetching resources', {
        subjectId: session.subject_id,
        topicId: session.topic_id
      }, requestId);
      const { data: resourceRows, error: resourcesError } = await supabase
        .rpc('get_resources_by_topic', {
          subject_uuid: session.subject_id,
          topic_uuid: session.topic_id,
        });

      if (resourcesError) {
        logger.warn('ASSESSMENT', 'Continuing without educational resources', {
          resourcesError,
        }, requestId);
      } else {
        resources = resourceRows || [];
      }
    }
    logger.database('Resources fetched', {
      count: resources.length,
      titles: resources.map((resource) => resource.title)
    }, requestId);

    // Store student assessments
    logger.database('Storing student assessments', {
      assessmentCount: answers.length
    }, requestId);
    const { error: assessmentInsertError } = await supabase
      .from('student_assessments')
      .insert((answers as AssessmentAnswer[]).map(answer => ({
        session_id: sessionId,
        user_id: user.id,
        question: answer.question,
        student_answer: answer.answer,
        assessment_type: 'understanding',
      })));

    if (assessmentInsertError) {
      // Assessment persistence should not strand the learner before a lesson.
      // The session itself still stores the submitted responses below.
      logger.warn('ASSESSMENT', 'Continuing after assessment storage failed', {
        assessmentInsertError,
      }, requestId);
    }

    // Prepare context for AI evaluation
    logger.info('ASSESSMENT', 'Preparing evaluation context', {}, requestId);
    const resourceContext = resources
      .map((resource) => `Title: ${resource.title}\nContent: ${resource.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No external resources are attached. Use accurate general knowledge.';
    const groundingRule = resources.length
      ? 'Use only the provided educational resources for content.'
      : 'Use accurate, age-appropriate general knowledge because no external resources are attached.';

    const answersContext = (answers as AssessmentAnswer[])
      .map(answer => `Q: ${answer.question}\nA: ${answer.answer}`)
      .join('\n\n');
      
    logger.info('ASSESSMENT', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      answersContextLength: answersContext.length,
      answersCount: answers.length
    }, requestId);

    // Evaluate student responses and refine lesson plan
    logger.ai('Preparing evaluation', {}, requestId);
    const evaluationPrompt = `You are an AI tutor evaluating a short student knowledge check.

Available Educational Resources:
${resourceContext}

Student Assessment Responses:
${answersContext}

Based on the student's responses, evaluate their current understanding.
${groundingRule}

Return only this compact JSON object:
{
  "understanding_level": "beginner|intermediate|advanced",
  "strengths": ["area1", "area2"],
  "areas_for_focus": ["area1", "area2"],
  "learning_style_indicators": "Brief assessment of how they learn best"
}`;
    
    logger.ai('Calling AI provider for evaluation', {
      promptLength: evaluationPrompt.length
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

    let studentEvaluation = createFallbackEvaluation(answers as AssessmentAnswer[]);
    try {
      const completion = await openai.chat.completions.create({
        model: hostedAIModel(),
        messages: [
          {
            role: 'system',
            content: `You are an expert AI tutor. Always respond with valid JSON only. ${groundingRule}`
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 450,
        response_format: { type: 'json_object' },
      }, {
        timeout: 20_000,
        maxRetries: 0,
      });

      const rawContent = completion.choices[0].message.content || '{}';
      logger.info('ASSESSMENT', 'Parsing evaluation results', {
        length: rawContent.length,
        preview: rawContent.substring(0, 200) + '...'
      }, requestId);
      
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      logger.info('ASSESSMENT', 'Content cleaned', {
        cleanedLength: cleanedContent.length
      }, requestId);
      
      const parsedEvaluation = JSON.parse(cleanedContent);
      const candidate = parsedEvaluation.student_evaluation || parsedEvaluation;
      const level = candidate.understanding_level;
      if (level === 'beginner' || level === 'intermediate' || level === 'advanced') {
        studentEvaluation = {
          understanding_level: level,
          strengths: Array.isArray(candidate.strengths) ? candidate.strengths : studentEvaluation.strengths,
          areas_for_focus: Array.isArray(candidate.areas_for_focus) ? candidate.areas_for_focus : studentEvaluation.areas_for_focus,
          learning_style_indicators: typeof candidate.learning_style_indicators === 'string'
            ? candidate.learning_style_indicators
            : studentEvaluation.learning_style_indicators,
        };
      }
      logger.info('ASSESSMENT', 'Evaluation parsed successfully', {
        understandingLevel: studentEvaluation.understanding_level,
      }, requestId);
    } catch (evaluationError) {
      logger.warn('ASSESSMENT', 'Using deterministic evaluation fallback', {
        error: evaluationError instanceof Error ? evaluationError.message : String(evaluationError),
        fallbackLevel: studentEvaluation.understanding_level,
      }, requestId);
    }

    const refinedLessonPlan = normalizeLessonPlan(session.lesson_plan, studentEvaluation);

    // Update session with refined lesson plan and move to delivery phase
    logger.database('Updating session with refined lesson plan', {}, requestId);
    const existingResponses = Array.isArray(session.student_responses)
      ? session.student_responses
      : [];
    const updatedResponses = [...existingResponses, ...answers];
    
    const sessionUpdateData = {
      current_phase: 'delivery',
      lesson_plan: refinedLessonPlan,
      student_responses: updatedResponses
    };
    
    logger.database('Session update data prepared', {
      newPhase: sessionUpdateData.current_phase,
      hasRefinedPlan: !!sessionUpdateData.lesson_plan,
      responsesCount: sessionUpdateData.student_responses.length,
      chunksCount: refinedLessonPlan.lesson_chunks.length,
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
    const evaluationPromises = (answers as AssessmentAnswer[]).map(async (answer, index) => {
      logger.database(`Updating evaluation for question ${index + 1}`, {}, requestId);
      return supabase
        .from('student_assessments')
        .update({
          ai_evaluation: {
            understanding_level: studentEvaluation.understanding_level,
            feedback: `Based on this response, the student shows ${studentEvaluation.understanding_level} understanding.`
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
      evaluation: studentEvaluation,
      refinedLessonPlan,
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
