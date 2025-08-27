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

    // Convert master plan to enhanced lesson plan format
    logger.lesson('Converting master plan to enhanced format', {}, requestId);
    const enhancedLessonPlan = {
      overview: {
        title: `${subjectName}: ${topicName}`,
        description: masterPlan.description,
        estimatedDuration: masterPlan.estimatedDurationMinutes,
        difficulty: masterPlan.difficultyLevel || 'intermediate'
      },
      coreFundamentals: masterPlan.coreConcepts || [],
      keyConcepts: masterPlan.learningObjectives || [],
      chunks: masterPlan.chunkStructure.map((chunk: any, index: number) => ({
        id: `chunk_${index + 1}`,
        title: chunk.title,
        content: chunk.content,
        duration: chunk.estimatedDurationMinutes || 5,
        type: chunk.type || 'concept',
        order: index + 1
      }))
    };

    // Generate and enhance assessment questions
    logger.lesson('Generating assessment questions', {}, requestId);
    let assessmentQuestions = masterPlan.assessmentCriteria || [];
    
    // Ensure we have at least 2 questions
    if (assessmentQuestions.length < 2) {
      logger.lesson('Insufficient assessment questions, generating more', {
        currentCount: assessmentQuestions.length
      }, requestId);
      
      const additionalQuestionsNeeded = 2 - assessmentQuestions.length;
      const prompt = `Generate ${additionalQuestionsNeeded} assessment questions for the topic "${topicName}" in ${subjectName}.

Context: ${resourceContext.substring(0, 1000)}

Return only the questions as a JSON array of strings. Each question should assess understanding of key concepts.`;
      
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });
        
        const additionalQuestions = JSON.parse(completion.choices[0].message.content || '[]');
        assessmentQuestions = [...assessmentQuestions, ...additionalQuestions];
        logger.lesson('Additional questions generated', {
          newCount: assessmentQuestions.length
        }, requestId);
      } catch (error) {
        logger.error('START-SESSION', 'Failed to generate additional questions', { error }, requestId);
        // Continue with existing questions
      }
    }

    // Convert criteria statements to engaging questions using AI
    logger.lesson('Converting criteria to engaging questions', {}, requestId);
    const enhancedQuestions = [];
    
    for (const question of assessmentQuestions) {
      if (typeof question === 'string' && !question.includes('?')) {
        // This looks like a criteria statement, convert to question
        try {
          const prompt = `Convert this learning criteria into an engaging assessment question:

"${question}"

Return only the question, make it conversational and engaging for a student.`;
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          });
          
          const enhancedQuestion = completion.choices[0].message.content?.trim() || question;
          enhancedQuestions.push(enhancedQuestion);
          logger.lesson('Question enhanced', {
            original: question.substring(0, 50),
            enhanced: enhancedQuestion.substring(0, 50)
          }, requestId);
        } catch (error) {
          logger.error('START-SESSION', 'Failed to enhance question', { error }, requestId);
          enhancedQuestions.push(question);
        }
      } else {
        enhancedQuestions.push(question);
      }
    }

    // Generate welcome message audio
    logger.unrealSpeech('Generating welcome message audio', {}, requestId);
    const welcomeMessage = `Welcome to your ${subjectName} lesson on ${topicName}! I'm excited to guide you through this learning journey. We'll start with a quick assessment to understand your current knowledge, then dive into the core concepts. Let's begin!`;
    
    let welcomeAudioUrl = null;
    try {
      const ttsResult = await convertTextToSpeech({
        text: welcomeMessage,
        voiceId: tutorVoiceSOP.voice_delivery_instructions.voice_parameters.unreal_speech_settings.voiceId,
        contentType: 'welcome',
        context: `welcome message for session ${requestId}`
      });
      
      if (!ttsResult.success) {
        throw new Error(ttsResult.error || 'TTS conversion failed');
      }
      
      const audioBuffer = ttsResult.audioBuffer;
      
      if (!audioBuffer) {
        throw new Error('No audio buffer received from TTS');
      }
      
      // Upload to Supabase Storage
      const fileName = `welcome_${requestId}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBuffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        logger.error('START-SESSION', 'Failed to upload welcome audio', { uploadError }, requestId);
      } else {
        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(fileName);
        welcomeAudioUrl = urlData.publicUrl;
        logger.storage('Welcome audio uploaded', { url: welcomeAudioUrl }, requestId);
      }
    } catch (error) {
      logger.error('START-SESSION', 'Failed to generate welcome audio', { error }, requestId);
    }

    // Generate audio for assessment questions
    logger.storage('Generating assessment question audio', {
      questionCount: enhancedQuestions.length
    }, requestId);
    
    const questionsWithAudio = [];
    for (let i = 0; i < enhancedQuestions.length; i++) {
      const question = enhancedQuestions[i];
      let audioUrl = null;
      
      try {
        const ttsResult = await convertTextToSpeech({
          text: question,
          voiceId: tutorVoiceSOP.voice_delivery_instructions.voice_parameters.unreal_speech_settings.voiceId,
          contentType: 'assessment',
          context: `assessment question ${i + 1} for session ${requestId}`
        });
        
        if (!ttsResult.success) {
          throw new Error(ttsResult.error || 'TTS conversion failed');
        }
        
        const audioBuffer = ttsResult.audioBuffer;
         
         if (!audioBuffer) {
           throw new Error('No audio buffer received from TTS');
         }
         
         const fileName = `question_${requestId}_${i}.mp3`;
         const { data: uploadData, error: uploadError } = await supabase.storage
           .from('audio')
           .upload(fileName, audioBuffer, {
             contentType: 'audio/mpeg',
             cacheControl: '3600'
           });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('audio')
            .getPublicUrl(fileName);
          audioUrl = urlData.publicUrl;
        }
      } catch (error) {
        logger.error('START-SESSION', 'Failed to generate question audio', {
          questionIndex: i,
          error
        }, requestId);
      }
      
      questionsWithAudio.push({
        id: `q_${i + 1}`,
        question,
        audioUrl,
        order: i + 1
      });
    }

    // Create lesson session with current_phase set to 'assessment'
    logger.database('Creating lesson session', {}, requestId);
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        topic_id: topicId || null,
        current_phase: 'assessment',
        status: 'active',
        lesson_plan: enhancedLessonPlan,
        assessment_questions: questionsWithAudio,
        student_responses: [],
        current_chunk_index: 0,
        welcome_audio_url: welcomeAudioUrl
      })
      .select('id, current_phase, status, created_at')
      .single();

    if (sessionError) {
      logger.error('START-SESSION', 'Failed to create session', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Failed to create lesson session' },
        { status: 500 }
      );
    }

    logger.database('Session created successfully', {
      sessionId: session.id,
      phase: session.current_phase
    }, requestId);

    // Initialize progress tracking by analyzing RAG content
    logger.lesson('Initializing progress tracking', {}, requestId);
    try {
      // First analyze the RAG content
      const ragAnalysis = await progressService.analyzeRAGContent(resourceContext, subjectName);
      
      // Then create lesson plan based on analysis
      const progressLessonPlan = await progressService.createLessonPlan(
        session.id,
        ragAnalysis
      );
      
      logger.lesson('Progress tracking initialized', {
        sessionId: session.id,
        conceptsCount: progressLessonPlan.plannedConcepts?.length || 0
      }, requestId);
    } catch (error) {
      logger.error('START-SESSION', 'Failed to initialize progress tracking', { error }, requestId);
      // Continue without progress tracking
    }

    // Return comprehensive session data
    logger.info('START-SESSION', 'Session created successfully', {
      sessionId: session.id,
      chunksCount: enhancedLessonPlan.chunks.length,
      questionsCount: questionsWithAudio.length,
      hasWelcomeAudio: !!welcomeAudioUrl
    }, requestId);

    return NextResponse.json({
      sessionId: session.id,
      subject: {
        id: subjectId,
        name: subjectName
      },
      topic: topic ? {
        id: topicId,
        name: topic.name
      } : null,
      currentPhase: session.current_phase,
      status: session.status,
      createdAt: session.created_at,
      lessonOverview: enhancedLessonPlan.overview,
      lessonChunks: enhancedLessonPlan.chunks,
      assessmentQuestions: questionsWithAudio,
      estimatedDuration: enhancedLessonPlan.overview.estimatedDuration,
      welcomeAudioUrl: welcomeAudioUrl
    });

  } catch (error) {
    logger.error('START-SESSION', 'Unexpected error', { error }, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
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