import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { uploadAudio } from '@/lib/storage/audio';
import { hostedAI as openai, hostedAIModel } from '@/lib/services/hostedAI';
import { logger } from '@/lib/logger';
import { convertTextToSpeech } from '@/lib/services/cloudflareSpeech';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  logger.info('HANDLE-INTERACTION', 'Starting interaction handling', {}, requestId);
  
  try {
    const { sessionId, question, chunkId } = await request.json();
    
    logger.info('HANDLE-INTERACTION', 'Request received', {
      sessionId,
      hasQuestion: !!question,
      questionLength: question?.length,
      chunkId
    }, requestId);

    if (!sessionId || !question) {
      logger.error('HANDLE-INTERACTION', 'Missing required parameters', {
        sessionId: !!sessionId,
        question: !!question
      }, requestId);
      return NextResponse.json(
        { error: 'Session ID and question are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    logger.auth('Authenticating user', {}, requestId);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('HANDLE-INTERACTION', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    logger.auth('User authenticated', { userId: user.id }, requestId);

    // Get session data
    logger.database('Fetching session data', { sessionId }, requestId);
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('HANDLE-INTERACTION', 'Session not found', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    logger.database('Session found', {
      id: session.id,
      phase: session.current_phase,
      status: session.status
    }, requestId);

    // Get resources for context
    logger.database('Fetching resources', {
      subjectId: session.subject_id,
      topicId: session.topic_id
    }, requestId);
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: session.subject_id,
        topic_uuid: session.topic_id as string,
      });

    if (resourcesError) {
      logger.error('HANDLE-INTERACTION', 'Error fetching resources', { resourcesError }, requestId);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }
    logger.database('Resources fetched', {
      count: resources?.length || 0
    }, requestId);

    // Prepare context for AI response
    logger.info('HANDLE-INTERACTION', 'Preparing context', {}, requestId);
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1500) || 'No content available'}`)
      .join('\n\n') || 'No external resources are attached. Use accurate general knowledge.';
    const groundingRule = resources?.length
      ? 'Uses only information from the provided educational resources'
      : 'Uses accurate, age-appropriate general knowledge';
    
    const lessonContext = session.lesson_plan ? JSON.stringify(session.lesson_plan, null, 2) : 'No lesson plan available';
    
    logger.info('HANDLE-INTERACTION', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      lessonContextLength: lessonContext.length
    }, requestId);

    // Generate AI response
    logger.ai('Preparing AI response generation', {}, requestId);
    const responsePrompt = `You are an AI tutor helping a student during a lesson. The student has asked a question.

Lesson Context:
${lessonContext}

Available Educational Resources:
${resourceContext}

Student Question: "${question}"

Provide a helpful, accurate response that:
1. Directly answers the student's question
2. ${groundingRule}
3. Is appropriate for the lesson context
4. Is conversational and encouraging
5. Suggests how this relates to the current lesson if relevant
6. Is suitable for text-to-speech conversion (clear, natural language)

If external resources are attached and the question is outside their scope, politely redirect to the lesson content.

Respond in this JSON format:
{
  "answer": "Your detailed answer here",
  "resources_used": ["List of resource titles that informed your answer"],
  "lesson_adaptation": "Optional suggestion for how this question might inform lesson pacing or focus"
}`;
    
    logger.ai('Response prompt prepared', {
      promptLength: responsePrompt.length
    }, requestId);

    logger.ai('Calling AI provider', {}, requestId);
    const completion = await openai.chat.completions.create({
      model: hostedAIModel(),
      messages: [
        {
          role: 'system',
          content: `You are an expert AI tutor. ${groundingRule}. Always respond in the requested JSON format.`
        },
        {
          role: 'user',
          content: responsePrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    });

    logger.ai('AI response received', {
      model: completion.model,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason
    }, requestId);

    const responseContent = completion.choices[0].message.content || '';
    logger.ai('Response generated', {
      length: responseContent.length,
      preview: responseContent.substring(0, 100) + '...'
    }, requestId);

    if (!responseContent.trim()) {
      logger.error('HANDLE-INTERACTION', 'Empty response content generated', {}, requestId);
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Parse the AI response
    logger.info('HANDLE-INTERACTION', 'Parsing AI response', {}, requestId);
    let parsedResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      parsedResponse = JSON.parse(jsonString);
      
      logger.info('HANDLE-INTERACTION', 'Response parsed successfully', {
        hasAnswer: !!parsedResponse.answer,
        answerLength: parsedResponse.answer?.length,
        resourcesUsed: parsedResponse.resources_used?.length || 0,
        hasAdaptation: !!parsedResponse.lesson_adaptation
      }, requestId);
    } catch (parseError) {
      logger.warn('HANDLE-INTERACTION', 'Failed to parse JSON response, using raw content', {
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      }, requestId);
      
      // Fallback to raw response if JSON parsing fails
      parsedResponse = {
        answer: responseContent,
        resources_used: [],
        lesson_adaptation: null
      };
    }

    // Store the interaction in the database
    logger.database('Storing interaction', {}, requestId);
    const interactionData = {
      session_id: sessionId,
      user_id: user.id,
      question: question,
      ai_response: parsedResponse.answer,
      resources_used: parsedResponse.resources_used || [],
      lesson_adaptation: parsedResponse.lesson_adaptation,
      interaction_type: 'question',
      created_at: new Date().toISOString()
    };
    
    const { data: interaction, error: insertError } = await supabase
      .from('student_assessments')
      .insert(interactionData)
      .select()
      .single();

    if (insertError) {
      logger.error('HANDLE-INTERACTION', 'Error storing interaction', { insertError }, requestId);
      return NextResponse.json(
        { error: 'Failed to store interaction' },
        { status: 500 }
      );
    }
    
    logger.database('Interaction stored successfully', { interactionId: interaction.id }, requestId);

    // Update chunk interactions if chunkId is provided
    if (chunkId) {
      logger.database('Updating chunk interaction count', { chunkId }, requestId);
      
      // First get the current count
      const { data: currentChunk } = await supabase
        .from('lesson_chunks')
        .select('interactions_count')
        .eq('id', chunkId)
        .single();
      
      const currentCount = currentChunk?.interactions_count || 0;
      
      const { error: chunkUpdateError } = await supabase
        .from('lesson_chunks')
        .update({
          interactions_count: currentCount + 1,
          last_interaction_at: new Date().toISOString()
        })
        .eq('id', chunkId);
        
      if (chunkUpdateError) {
        logger.warn('HANDLE-INTERACTION', 'Failed to update chunk interactions', { chunkUpdateError }, requestId);
      } else {
        logger.database('Chunk interactions updated', {}, requestId);
      }
    }

    // Generate audio for the response
    logger.speech('Starting audio generation for response', {
      textLength: parsedResponse.answer.length
    }, requestId);
    let audioUrl = null;
    try {
      const ttsResponse = await convertTextToSpeech({
        text: parsedResponse.answer,
        voiceId: 'asteria',
        bitrate: '192k',
        speed: '0',
        pitch: '1',
        codec: 'libmp3lame',
        contentType: 'interaction',
        context: `interaction response for session ${sessionId}`
      });
      
      if (ttsResponse.success && ttsResponse.audioBuffer) {
        logger.speech('Audio generation successful', {
          bufferSize: ttsResponse.audioBuffer.byteLength
        }, requestId);
        
        // Store generated audio in Vercel Blob.
        const fileName = `interaction-audio/${sessionId}/response-${interaction.id}-${Date.now()}.mp3`;
        logger.storage('Uploading to Vercel Blob', { fileName }, requestId);
        const blob = await uploadAudio(fileName, ttsResponse.audioBuffer);
        audioUrl = blob.url;
        logger.storage('Audio uploaded successfully', { path: blob.pathname, audioUrl }, requestId);

        // Update the interaction record with audio URL.
        const { error: audioUpdateError } = await supabase
          .from('student_assessments')
          .update({ audio_url: audioUrl })
          .eq('id', interaction.id);

        if (audioUpdateError) {
          logger.warn('HANDLE-INTERACTION', 'Failed to update interaction with audio URL', { audioUpdateError }, requestId);
        }
      } else {
        logger.error('HANDLE-INTERACTION', 'Audio generation failed', {
          error: ttsResponse.error
        }, requestId);
      }
    } catch (audioError) {
      const errorDetails = audioError instanceof Error ? {
        error: audioError.message,
        stack: audioError.stack
      } : { error: String(audioError), stack: undefined };
      
      logger.error('HANDLE-INTERACTION', 'Audio generation error', errorDetails, requestId);
      // Continue without audio - the text response is still valuable
    }

    const responseData = {
      interactionId: interaction.id,
      answer: parsedResponse.answer,
      resourcesUsed: parsedResponse.resources_used || [],
      lessonAdaptation: parsedResponse.lesson_adaptation,
      audioUrl: audioUrl,
      hasAudio: !!audioUrl,
      timestamp: interaction.created_at
    };
    
    logger.info('HANDLE-INTERACTION', 'Interaction handled successfully', {
      interactionId: responseData.interactionId,
      answerLength: responseData.answer?.length,
      hasAudio: responseData.hasAudio,
      resourcesUsed: responseData.resourcesUsed?.length,
      processingTime: Date.now() - startTime
    }, requestId);
    
    return NextResponse.json(responseData);

  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('HANDLE-INTERACTION', 'Fatal error', errorDetails, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
