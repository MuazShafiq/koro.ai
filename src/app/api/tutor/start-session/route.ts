import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuthRetry, withDatabaseRetry } from '@/utils/supabase/retry';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { convertTextToSpeech } from '@/lib/services/unrealSpeech';
import { progressService } from '@/lib/services/progressService';
import { equationExtractor } from '@/lib/services/equationExtractor';
import tutorVoiceSOP from '@/lib/tutor-voice-sop.json';

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
    const topicName = topic?.name || 'General Overview';
     const subjectName = subject.name;
     
     const prompt = `You are an expert AI tutor creating a personalized lesson plan. Generate a comprehensive lesson plan for the topic "${topicName}" in ${subjectName}.

**Available Educational Resources:**
${resourceContext || 'No specific resources provided - use your general knowledge.'}

**Requirements:**
- Use ONLY the provided educational resources above as your knowledge base
- Structure the lesson for interactive, conversational learning
- Include 2-3 assessment questions to gauge understanding
- Break the lesson into 2-3 detailed chunks, each 2-3 minutes long
- Focus on practical understanding and real-world applications
- Ensure content is engaging and age-appropriate
- Include mathematical equations and formulas from the resources when applicable

**Response Format (JSON only):**
{
  "lesson_overview": "Brief overview of what will be covered",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "lesson_chunks": [
    {
      "chunk_index": 1,
      "title": "Introduction to [Topic]",
      "content_outline": "Detailed outline of what this chunk covers",
      "key_points": ["point1", "point2", "point3"],
      "duration_minutes": 2,
      "chunk_type": "lesson"
    },
    {
      "chunk_index": 2,
      "title": "Core Concepts and Examples",
      "content_outline": "Detailed outline including equations and examples",
      "key_points": ["point1", "point2", "point3"],
      "duration_minutes": 3,
      "chunk_type": "lesson"
    },
    {
      "chunk_index": 3,
      "title": "Practice and Application",
      "content_outline": "Detailed outline of practice problems and applications",
      "key_points": ["point1", "point2", "point3"],
      "duration_minutes": 2,
      "chunk_type": "lesson"
    }
  ],
  "assessment_questions": [
    {
      "question": "Question text",
      "type": "multiple_choice" | "open_ended" | "true_false",
      "options": ["option1", "option2", "option3", "option4"] // only for multiple_choice
    }
  ],
  "estimated_duration": "15-20 minutes"
}`;
    
    logger.openai('Lesson plan prompt prepared', { promptLength: prompt.length }, requestId);

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
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
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
        chunksCount: lessonPlan.lesson_chunks?.length || 0,
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

    // Generate welcome message audio
    logger.info('START-SESSION', 'Generating welcome message audio', {}, requestId);
    let welcomeAudioUrl = null;
    try {
      const welcomeScript = `Hi there! Welcome to your personalized ${subject.name} lesson${topic ? ` on ${topic.name}` : ''}. I'm excited to help you learn today! Let's start with a quick assessment to understand your current knowledge level.`;
      
      const voiceSettings = tutorVoiceSOP.voice_delivery_instructions.voice_parameters.unreal_speech_settings;
      const ttsResponse = await convertTextToSpeech({
        text: welcomeScript,
        voiceId: voiceSettings.voiceId,
        bitrate: voiceSettings.bitrate,
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        codec: voiceSettings.codec,
        contentType: 'welcome',
        context: `welcome message for ${subject.name}${topic ? ` lesson on ${topic.name}` : ''}`
      });
      
      if (ttsResponse.success && ttsResponse.audioBuffer) {
        // Upload welcome audio to Supabase Storage
        const fileName = `session-audio/welcome-${requestId}-${Date.now()}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(fileName, ttsResponse.audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600'
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('lessons')
            .getPublicUrl(uploadData.path);
          welcomeAudioUrl = urlData.publicUrl;
          logger.info('START-SESSION', 'Welcome audio generated successfully', { fileName }, requestId);
        }
      }
    } catch (error) {
      logger.error('START-SESSION', 'Failed to generate welcome audio', { error }, requestId);
    }

    // Generate audio for assessment questions
    logger.info('START-SESSION', 'Generating assessment question audio', {}, requestId);
    const assessmentQuestions = lessonPlan.assessment_questions || [];
    for (let i = 0; i < assessmentQuestions.length; i++) {
      try {
        const question = assessmentQuestions[i];
        const voiceSettings = tutorVoiceSOP.voice_delivery_instructions.voice_parameters.unreal_speech_settings;
        const ttsResponse = await convertTextToSpeech({
          text: question.question,
          voiceId: voiceSettings.voiceId,
          bitrate: voiceSettings.bitrate,
          speed: voiceSettings.speed,
          pitch: voiceSettings.pitch,
          codec: voiceSettings.codec,
          contentType: 'assessment',
          context: `assessment question ${i + 1} for ${subject.name}${topic ? ` lesson on ${topic.name}` : ''}`
        });
        
        if (ttsResponse.success && ttsResponse.audioBuffer) {
          const fileName = `session-audio/assessment-${requestId}-q${i + 1}-${Date.now()}.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lessons')
            .upload(fileName, ttsResponse.audioBuffer, {
              contentType: 'audio/mpeg',
              cacheControl: '3600'
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('lessons')
              .getPublicUrl(uploadData.path);
            question.audioUrl = urlData.publicUrl;
            logger.info('START-SESSION', `Assessment question ${i + 1} audio generated`, { fileName }, requestId);
          }
        }
      } catch (error) {
        logger.error('START-SESSION', `Failed to generate audio for question ${i + 1}`, { error }, requestId);
      }
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

    // Initialize comprehensive progress tracking
    logger.info('START-SESSION', 'Initializing progress tracking', { sessionId: session.id }, requestId);
    try {
      // Create lesson plan from resources and lesson plan
      const resourcesText = resources.map((r: any) => r.content_text || '').join('\n\n');
      const lessonPlanText = JSON.stringify(lessonPlan);
      const combinedContent = `${resourcesText}\n\n${lessonPlanText}`;
      
      // Extract equations from resources and lesson plan
      const extractedEquations = await equationExtractor.extractEquations(combinedContent);
      logger.info('START-SESSION', 'Equations extracted', {
        equationsCount: extractedEquations.equations.length,
        totalFound: extractedEquations.totalFound
      }, requestId);
      
      // Analyze RAG content for progress tracking
      const ragAnalysis = await progressService.analyzeRAGContent(combinedContent, subject.name);
      
      // Create comprehensive lesson plan with progress tracking
      const progressLessonPlan = await progressService.createLessonPlan(
        session.id,
        ragAnalysis
      );
      
      logger.info('START-SESSION', 'Progress lesson plan created', {
        conceptsCount: progressLessonPlan.plannedConcepts.length,
        equationsCount: progressLessonPlan.plannedEquations.length,
        resourceSections: progressLessonPlan.plannedResourceSections.length
      }, requestId);
      
      // Initialize progress records for all planned concepts
      for (const conceptName of progressLessonPlan.plannedConcepts) {
        try {
          await progressService.addConceptProgress(
            session.id,
            conceptName
          );
        } catch (conceptError) {
          logger.warn('START-SESSION', 'Failed to add concept progress', {
            conceptName,
            error: conceptError
          }, requestId);
        }
      }
      
      // Update session with initial progress summary
      const initialProgress = await progressService.getProgressSummary(session.id);
      await supabase
        .from('lesson_sessions')
        .update({
          concepts_covered: 0,
          total_concepts: initialProgress.totalConcepts,
          equations_covered: 0,
          resource_coverage: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);
      
      logger.info('START-SESSION', 'Progress tracking initialized successfully', {
        sessionId: session.id,
        totalConcepts: initialProgress.totalConcepts,
        totalEquations: extractedEquations.equations.length
      }, requestId);
      
    } catch (progressError) {
      logger.error('START-SESSION', 'Failed to initialize progress tracking', {
        sessionId: session.id,
        error: progressError
      }, requestId);
      // Continue without failing the session creation
    }

    // Get initial progress summary for response
    let progressSummary = null;
    try {
      progressSummary = await progressService.getProgressSummary(session.id);
    } catch (progressError) {
      logger.warn('START-SESSION', 'Failed to get initial progress summary', { progressError }, requestId);
    }
    
    const responseData = {
      sessionId: session.id,
      subject: subject.name,
      topic: topic?.name || 'General',
      lessonOverview: lessonPlan.lesson_overview,
      lessonChunks: lessonPlan.lesson_chunks,
      assessmentQuestions: lessonPlan.assessment_questions,
      estimatedDuration: lessonPlan.estimated_duration,
      welcomeAudioUrl,
      progressTracking: {
        initialized: !!progressSummary,
        totalConcepts: progressSummary?.totalConcepts || 0,
        totalEquations: progressSummary?.equationsCount || 0,
        resourceSections: progressSummary?.resourceSectionsCovered || 0
      }
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