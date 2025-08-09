import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuthRetry, withDatabaseRetry } from '@/utils/supabase/retry';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('START-SESSION', 'Starting new lesson session', {}, requestId);
  
  try {
    const { subjectId, topicId } = await request.json();
    logger.info('START-SESSION', 'Request data', { subjectId, topicId }, requestId);

    if (!subjectId) {
      logger.error('START-SESSION', 'Missing subject ID', {}, requestId);
      return NextResponse.json(
        { error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user with retry logic for network issues
    logger.info('START-SESSION', 'Authenticating user', {}, requestId);
    
    const authResult = await withAuthRetry(
      supabase,
      async (client) => await client.auth.getUser(),
      { requestId, operation: 'user authentication' }
    );
    
    const { user } = authResult.data;
    const authError = authResult.error;
    
    if (authError || !user) {
      logger.error('START-SESSION', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 401 }
      );
    }
    
    logger.info('START-SESSION', 'User authenticated', { userId: user.id }, requestId);

    // Get subject and topic information with retry logic
    logger.database('Fetching subject data', { subjectId }, requestId);
    
    const subjectResult = await withDatabaseRetry(
      supabase,
      async (client) => await client
        .from('subjects')
        .select('name, description')
        .eq('id', subjectId)
        .single(),
      { requestId, operation: 'fetch subject data' }
    );
    
    const subject = subjectResult.data;
    const subjectError = subjectResult.error;

    if (subjectError || !subject) {
      logger.error('START-SESSION', 'Subject not found', { subjectError }, requestId);
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }
    logger.database('Subject found', { name: subject.name, hasDescription: !!subject.description }, requestId);

    let topic = null;
    if (topicId) {
      logger.database('Fetching topic data', { topicId }, requestId);
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('name')
        .eq('id', topicId)
        .single();
      
      if (!topicError && topicData) {
        topic = topicData;
        logger.database('Topic found', { topicName: topic.name }, requestId);
      } else {
        logger.warn('START-SESSION', 'Topic not found or error', { topicError }, requestId);
      }
    } else {
      logger.info('START-SESSION', 'No topic specified, using general subject', {}, requestId);
    }

    // Get relevant resources using RAG (only if topic is specified)
    let resources = [];
    if (topicId) {
      logger.database('Fetching resources', { subjectId, topicId }, requestId);
      const { data: resourcesData, error: resourcesError } = await supabase
        .rpc('get_resources_by_topic', {
          subject_uuid: subjectId,
          topic_uuid: topicId
        });

      if (resourcesError) {
        logger.error('START-SESSION', 'Error fetching resources', { resourcesError }, requestId);
        return NextResponse.json(
          { error: 'Failed to fetch educational resources' },
          { status: 500 }
        );
      }
      resources = resourcesData || [];
      logger.database('Resources fetched', {
        count: resources.length,
        titles: resources.map((r: any) => r.title)
      }, requestId);
    } else {
      logger.database('No topic specified, skipping resource fetch', {}, requestId);
    }

    // Prepare context for AI lesson planning
    logger.info('START-SESSION', 'Preparing lesson planning context', {}, requestId);
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const topicContext = topic ? `Topic: ${topic.name}` : 'General subject overview';
    
    logger.info('START-SESSION', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      topicContext: topicContext
    }, requestId);

    // Generate initial lesson plan using OpenAI
    logger.openai('Preparing lesson planning', {}, requestId);
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
    
    logger.openai('Lesson plan prompt prepared', { promptLength: lessonPlanPrompt.length }, requestId);

    logger.openai('Calling OpenAI for lesson planning', {}, requestId);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
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
    
    logger.openai('OpenAI response received', {
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

    let lessonPlan;
    try {
      const rawContent = completion.choices[0].message.content || '{}';
      logger.openai('Raw OpenAI response', {
        length: rawContent.length,
        preview: rawContent.substring(0, 200) + '...'
      }, requestId);
      
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      logger.openai('Cleaned content', { length: cleanedContent.length }, requestId);
      
      lessonPlan = JSON.parse(cleanedContent);
      logger.lesson('Lesson plan parsed successfully', {
        hasOverview: !!lessonPlan.lesson_overview,
        conceptsCount: lessonPlan.key_concepts?.length || 0,
        questionsCount: lessonPlan.assessment_questions?.length || 0,
        estimatedDuration: lessonPlan.estimated_duration
      }, requestId);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      logger.error('START-SESSION', 'Failed to parse lesson plan JSON', {
        error: errorMessage,
        rawContent: completion.choices[0].message.content
      }, requestId);
      return NextResponse.json(
        { error: 'Failed to generate lesson plan' },
        { status: 500 }
      );
    }

    // Create lesson session in database with retry logic
    logger.database('Creating lesson session in database', {}, requestId);
    const sessionData = {
      user_id: user.id,
      subject_id: subjectId,
      topic_id: topicId,
      current_phase: 'assessment',
      lesson_plan: lessonPlan,
      status: 'active'
    };
    
    logger.database('Session data to insert', {
      user_id: sessionData.user_id,
      subject_id: sessionData.subject_id,
      topic_id: sessionData.topic_id,
      current_phase: sessionData.current_phase,
      hasLessonPlan: !!sessionData.lesson_plan,
      status: sessionData.status
    }, requestId);
    
    const sessionResult = await withDatabaseRetry(
      supabase,
      async (client) => await client
        .from('lesson_sessions')
        .insert(sessionData)
        .select()
        .single(),
      { requestId, operation: 'create lesson session' }
    );
    
    const session = sessionResult.data;
    const sessionError = sessionResult.error;

    if (sessionError) {
      logger.error('START-SESSION', 'Error creating session', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Failed to create lesson session. Please try again.' },
        { status: 500 }
      );
    }
    
    logger.database('Session created successfully', { sessionId: session.id }, requestId);

    const responseData = {
      sessionId: session.id,
      subject: subject.name,
      topic: topic?.name || 'General',
      lessonOverview: lessonPlan.lesson_overview,
      assessmentQuestions: lessonPlan.assessment_questions,
      estimatedDuration: lessonPlan.estimated_duration
    };
    
    logger.info('START-SESSION', 'Success! Returning response', {
      sessionId: responseData.sessionId,
      subject: responseData.subject,
      topic: responseData.topic,
      hasOverview: !!responseData.lessonOverview,
      questionsCount: responseData.assessmentQuestions?.length || 0,
      estimatedDuration: responseData.estimatedDuration
    }, requestId);
    
    return NextResponse.json(responseData);

  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('START-SESSION', 'Fatal error', { errorDetails }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}