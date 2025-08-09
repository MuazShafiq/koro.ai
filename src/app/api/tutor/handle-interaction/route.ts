import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import { convertTextToSpeech } from '@/lib/services/unrealSpeech';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    const { sessionId, question, chunkId } = await request.json();
    
    logger.info('INTERACTION', 'New interaction request', {
      sessionId,
      questionLength: question?.length || 0,
      hasChunkId: !!chunkId,
      chunkId
    });

    if (!sessionId || !question) {
      logger.error('INTERACTION', 'Missing required fields', {
        hasSessionId: !!sessionId,
        hasQuestion: !!question
      });
      return NextResponse.json(
        { error: 'Session ID and question are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    logger.info('INTERACTION', 'Authenticating user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('INTERACTION', 'Authentication failed', { error: authError });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('INTERACTION', 'User authenticated', {
      userId: user.id,
      email: user.email
    });

    // Get session data
    logger.database('Fetching session data', { sessionId });
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      logger.error('INTERACTION', 'Session not found', {
        sessionId,
        userId: user.id,
        error: sessionError
      });
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    logger.database('Session found', {
      sessionId: session.id,
      subjectId: session.subject_id,
      topicId: session.topic_id,
      currentPhase: session.current_phase,
      hasLessonPlan: !!session.lesson_plan
    });

    // Get resources for RAG context
    logger.database('Fetching educational resources');
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: session.subject_id,
        topic_uuid: session.topic_id
      });

    if (resourcesError) {
      logger.error('INTERACTION', 'Error fetching resources', { error: resourcesError });
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }
    
    logger.database('Resources fetched', {
      resourcesCount: resources?.length || 0,
      resourceTitles: resources?.map((r: any) => r.title) || []
    });

    // Get current chunk context if provided
    let currentChunkContext = '';
    if (chunkId) {
      logger.database('Fetching chunk context', { chunkId });
      const { data: chunk, error: chunkError } = await supabase
        .from('lesson_chunks')
        .select('script_content')
        .eq('id', chunkId)
        .single();
      
      if (!chunkError && chunk) {
        currentChunkContext = `Current lesson content: ${chunk.script_content}`;
        logger.database('Chunk context loaded', {
          chunkId,
          contentLength: chunk.script_content?.length || 0
        });
      } else {
        logger.warn('INTERACTION', 'Could not load chunk context', {
          chunkId,
          error: chunkError
        });
      }
    }

    // Prepare context for AI response
    logger.info('INTERACTION', 'Preparing context for AI response');
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const lessonContext = session.lesson_plan ? JSON.stringify(session.lesson_plan, null, 2) : 'No lesson plan available';
    
    logger.info('INTERACTION', 'Context prepared', {
      resourceContextLength: resourceContext.length,
      lessonContextLength: lessonContext.length,
      hasCurrentChunk: !!currentChunkContext,
      currentChunkLength: currentChunkContext.length
    });

    // Generate AI response using RAG
    logger.openai('Preparing prompt');
    const responsePrompt = `You are an AI tutor answering a student's question during a lesson.

Lesson Context:
${lessonContext}

${currentChunkContext}

Available Educational Resources (USE ONLY THESE FOR ANSWERS):
${resourceContext}

Student Question: "${question}"

Provide a helpful answer that:
1. Uses ONLY information from the provided educational resources
2. Is directly relevant to the student's question
3. Connects back to the current lesson when appropriate
4. Is clear and at the student's understanding level
5. Encourages further learning
6. If the question cannot be answered from the resources, politely explain that you can only discuss topics covered in the course materials

Return a JSON object with:
{
  "answer": "Your response to the student",
  "resource_used": "Which resource(s) the answer came from",
  "lesson_adaptation": "How this might affect the remaining lesson (if applicable)",
  "can_answer": true/false
}`;
    
    logger.openai('Prompt prepared', { promptLength: responsePrompt.length });

    logger.openai('Calling API for response generation');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI tutor. Always respond with valid JSON only. Use only provided educational resources to answer questions. Be helpful but stay within the bounds of the course materials.'
        },
        {
          role: 'user',
          content: responsePrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    logger.openai('Response received', {
      model: completion.model,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason
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

    let aiResponse;
    try {
      const rawContent = completion.choices[0].message.content || '{}';
      logger.openai('Raw response received', {
        length: rawContent.length,
        preview: rawContent.substring(0, 200) + '...'
      });
      
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      logger.openai('Content cleaned', { cleanedLength: cleanedContent.length });
      
      aiResponse = JSON.parse(cleanedContent);
      logger.openai('Response parsed successfully', {
        canAnswer: aiResponse.can_answer,
        hasAnswer: !!aiResponse.answer,
        answerLength: aiResponse.answer?.length || 0,
        resourceUsed: aiResponse.resource_used
      });
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      logger.error('INTERACTION', 'Failed to parse AI response JSON', {
        error: errorMessage,
        rawContent: completion.choices[0].message.content
      });
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Store the interaction in student_assessments
    logger.database('Storing interaction');
    const interactionData = {
      session_id: sessionId,
      question: question,
      student_answer: '', // This is a question, not an answer
      ai_evaluation: {
        response: aiResponse.answer,
        resource_used: aiResponse.resource_used,
        can_answer: aiResponse.can_answer,
        interaction_type: 'question'
      },
      assessment_type: 'interaction'
    };
    
    const { error: assessmentError } = await supabase
      .from('student_assessments')
      .insert(interactionData);

    if (assessmentError) {
      logger.error('INTERACTION', 'Error storing interaction', { error: assessmentError });
    } else {
      logger.database('Interaction stored successfully');
    }

    // Update chunk interaction if chunkId provided
    if (chunkId) {
      logger.database('Updating chunk interaction', { chunkId });
      const chunkInteractionData = {
        student_interaction: {
          question: question,
          ai_response: aiResponse.answer,
          timestamp: new Date().toISOString()
        }
      };
      
      const { error: chunkUpdateError } = await supabase
        .from('lesson_chunks')
        .update(chunkInteractionData)
        .eq('id', chunkId);

      if (chunkUpdateError) {
        logger.error('INTERACTION', 'Error updating chunk interaction', { error: chunkUpdateError });
      } else {
        logger.database('Chunk interaction updated successfully');
      }
    }

    // Generate audio for the response if possible
    let audioUrl = null;
    if (aiResponse.can_answer && aiResponse.answer) {
      try {
        logger.info('INTERACTION', 'Generating audio with chunking support', {
          textLength: aiResponse.answer.length
        });
        
        const ttsResponse = await convertTextToSpeech({
          text: aiResponse.answer,
          voiceId: 'Scarlett',
          bitrate: '192k',
          speed: '0',
          pitch: '1',
          codec: 'libmp3lame'
        });
        
        if (ttsResponse.success && ttsResponse.audioBuffer) {
          logger.info('INTERACTION', 'Audio generated successfully', {
            sizeBytes: ttsResponse.audioBuffer.byteLength,
            chunksProcessed: ttsResponse.chunksProcessed || 1
          });
          
          // Upload audio to Supabase Storage
          const fileName = `interaction-audio/${sessionId}/response-${Date.now()}.mp3`;
          logger.info('INTERACTION', 'Uploading audio to Supabase', { fileName });
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lessons')
            .upload(fileName, ttsResponse.audioBuffer, {
              contentType: 'audio/mpeg',
              cacheControl: '3600'
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('lessons')
              .getPublicUrl(fileName);
            
            audioUrl = urlData.publicUrl;
            logger.info('INTERACTION', 'Audio uploaded successfully', { audioUrl });
          } else {
            logger.error('INTERACTION', 'Audio upload failed', { error: uploadError });
          }
        } else {
          logger.error('INTERACTION', 'Audio generation failed', {
            error: ttsResponse.error
          });
        }
      } catch (audioError) {
        const errorDetails = audioError instanceof Error ? {
          message: audioError.message,
          stack: audioError.stack
        } : { message: String(audioError), stack: undefined };
        
        logger.error('INTERACTION', 'Error generating response audio', errorDetails);
      }
    } else {
      logger.warn('INTERACTION', 'Skipping audio generation', {
        canAnswer: aiResponse.can_answer,
        hasAnswer: !!aiResponse.answer
      });
    }

    const responseData = {
      answer: aiResponse.answer,
      canAnswer: aiResponse.can_answer,
      resourceUsed: aiResponse.resource_used,
      lessonAdaptation: aiResponse.lesson_adaptation,
      audioUrl: audioUrl,
      hasAudio: !!audioUrl,
      timestamp: new Date().toISOString()
    };
    
    logger.info('INTERACTION', 'Success! Returning response', {
      canAnswer: responseData.canAnswer,
      hasAnswer: !!responseData.answer,
      answerLength: responseData.answer?.length || 0,
      hasAudio: responseData.hasAudio,
      resourceUsed: responseData.resourceUsed
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('INTERACTION', 'Fatal error', errorDetails);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}