import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuthRetry, withDatabaseRetry } from '@/utils/supabase/retry';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { convertTextToSpeech } from '@/lib/services/unrealSpeech';
import { progressService } from '@/lib/services/progressService';
import { equationExtractor } from '@/lib/services/equationExtractor';
import tutorVoiceSOP from '@/lib/tutor-voice-sop.json';
import { MasterLessonPlanService } from '@/lib/services/masterLessonPlanService';

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

    // Get or create master lesson plan
    logger.info('START-SESSION', 'Getting master lesson plan', {}, requestId);
    const masterLessonPlanService = new MasterLessonPlanService();
    const topicName = topic?.name || 'General Overview';
    const subjectName = subject.name;
    
    let masterPlan;
    try {
      masterPlan = await masterLessonPlanService.getOrCreateMasterPlan(
        subjectId,
        topicId,
        topicName,
        subjectName,
        resourceContext
      );
      
      logger.lesson('Master lesson plan retrieved', {
        planId: masterPlan.id,
        chunksCount: masterPlan.chunkStructure.length,
        conceptsCount: masterPlan.learningObjectives.length,
        estimatedDuration: masterPlan.estimatedDurationMinutes
      }, requestId);
    } catch (error) {
      logger.error('START-SESSION', 'Failed to get master lesson plan', { error }, requestId);
      return NextResponse.json(
        { error: 'Failed to create lesson plan' },
        { status: 500 }
      );
    }
    
    // Convert master lesson plan to enhanced lesson plan format with core fundamentals focus
    const lessonPlan = {
      lesson_overview: masterPlan.description,
      // Prioritize core concepts by importance and prerequisites
      key_concepts: masterPlan.coreConcepts
        .sort((a, b) => {
          // Sort by importance: core > supporting > enrichment
          const importanceOrder = { 'core': 0, 'supporting': 1, 'enrichment': 2 };
          return importanceOrder[a.importance] - importanceOrder[b.importance];
        })
        .map(concept => concept.name),
      // Enhanced lesson chunks with concept mapping and prerequisites
      lesson_chunks: masterPlan.chunkStructure.map(chunk => {
        const chunkConcepts = chunk.key_concepts || [];
        
        return {
          chunk_index: chunk.chunk_number,
          title: chunk.title,
          content_outline: chunk.content_outline,
          key_points: chunkConcepts,
          duration_minutes: chunk.estimated_duration_minutes,
          chunk_type: 'lesson',
          core_concepts: chunkConcepts,
          prerequisites: chunk.prerequisites || [],
          learning_objectives: chunk.learning_objectives || []
        };
      }),
      // Enhanced assessment with concept-specific questions - ensure minimum 2 questions
      assessment_questions: await (async () => {
        let assessmentCriteria = masterPlan.assessmentCriteria || [];
        
        // Ensure we have at least 2 assessment criteria
        if (assessmentCriteria.length < 2) {
          const additionalCriteria = [];
          
          // Add basic understanding questions based on core concepts
          const coreConcepts = masterPlan.coreConcepts.filter(c => c.importance === 'core').slice(0, 3);
          
          if (assessmentCriteria.length === 0) {
            // No existing criteria, create 2 basic questions
            additionalCriteria.push(
              `Understanding of fundamental concepts in ${subject.name}${topic ? ` related to ${topic.name}` : ''}`,
              `Application of key principles in ${subject.name}${topic ? ` for ${topic.name}` : ''}`
            );
          } else if (assessmentCriteria.length === 1) {
            // One existing criteria, add one more
            if (coreConcepts.length > 0) {
              additionalCriteria.push(`Understanding of ${coreConcepts[0].name} concepts`);
            } else {
              additionalCriteria.push(`Application of key principles in ${subject.name}${topic ? ` for ${topic.name}` : ''}`);
            }
          }
          
          assessmentCriteria = [...assessmentCriteria, ...additionalCriteria];
          logger.info('START-SESSION', `Enhanced assessment criteria to ensure minimum 2 questions. Total: ${assessmentCriteria.length}`, {}, requestId);
        }
        
        return await Promise.all(assessmentCriteria.map(async (criteria, index) => {
          // Convert assessment criteria statements to proper questions using OpenAI
          let questionText = criteria.question || criteria;
          
          // If the criteria is a statement (doesn't end with ?), convert it to a question
          if (typeof questionText === 'string' && !questionText.trim().endsWith('?')) {
            try {
              const openai = new (await import('openai')).default({
                apiKey: process.env.OPENAI_API_KEY,
              });
              
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                  {
                    role: 'system',
                    content: 'You are an expert educator. Convert assessment criteria statements into engaging assessment questions. Return only the question, nothing else.'
                  },
                  {
                    role: 'user',
                    content: `Convert this assessment criteria into a clear, engaging question for ${subject.name}${topic ? ` on ${topic.name}` : ''}:\n\n"${questionText}"\n\nMake it a question that tests understanding of this concept.`
                  }
                ],
                temperature: 0.7,
                max_tokens: 150
              });
              
              const generatedQuestion = completion.choices[0]?.message?.content?.trim();
              if (generatedQuestion) {
                questionText = generatedQuestion;
                logger.info('START-SESSION', `Converted assessment criteria to question: ${questionText}`, {}, requestId);
              }
            } catch (error) {
              logger.error('START-SESSION', 'Failed to convert assessment criteria to question', { error, criteria: questionText }, requestId);
              // Fallback: create a basic question format
              questionText = `Can you explain ${questionText.toLowerCase()}?`;
            }
          }
          
          return {
            id: `q${index + 1}`,
            question: questionText,
            type: 'understanding_check',
            concepts_tested: masterPlan.coreConcepts.slice(0, 3).map(c => c.name)
          };
        }));
      })(),
      estimated_duration: `${masterPlan.estimatedDurationMinutes} minutes`,
      // Additional metadata for better lesson delivery
      core_fundamentals: masterPlan.coreConcepts.filter(c => c.importance === 'core'),
      concept_hierarchy: masterPlan.conceptHierarchy || {},
      knowledge_checkpoints: masterPlan.knowledgeCheckpoints || [],
      practical_applications: masterPlan.practicalApplications || []
    };

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