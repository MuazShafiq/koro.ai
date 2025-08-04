import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  logger.info('DELIVER-CHUNK', 'Starting chunk delivery', {}, requestId);
  
  try {
    const { sessionId, chunkIndex } = await request.json();
    
    logger.info('DELIVER-CHUNK', 'Request received', {
      sessionId,
      chunkIndex
    }, requestId);

    if (!sessionId || chunkIndex === undefined) {
      logger.error('DELIVER-CHUNK', 'Missing required parameters', {
        sessionId: !!sessionId,
        chunkIndex
      }, requestId);
      return NextResponse.json(
        { error: 'Session ID and chunk index are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    logger.auth('Authenticating user', {}, requestId);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('DELIVER-CHUNK', 'Authentication failed', { authError }, requestId);
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
      logger.error('DELIVER-CHUNK', 'Session not found', { sessionError }, requestId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    logger.database('Session found', {
      id: session.id,
      phase: session.current_phase,
      status: session.status,
      hasLessonPlan: !!session.lesson_plan
    }, requestId);

    // Check if chunk already exists
    logger.database('Checking for existing chunk', { chunkIndex }, requestId);
    const { data: existingChunk, error: chunkError } = await supabase
      .from('lesson_chunks')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (!chunkError && existingChunk) {
      logger.info('DELIVER-CHUNK', 'Returning existing chunk', {
        chunkId: existingChunk.id,
        hasAudio: !!existingChunk.audio_url,
        contentLength: existingChunk.script_content?.length
      }, requestId);
      return NextResponse.json({
        chunkId: existingChunk.id,
        content: existingChunk.script_content,
        audioUrl: existingChunk.audio_url,
        chunkIndex: existingChunk.chunk_index,
        isExisting: true
      });
    }
    logger.info('DELIVER-CHUNK', 'No existing chunk found, creating new one', {}, requestId);

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
      logger.error('DELIVER-CHUNK', 'Error fetching resources', { resourcesError }, requestId);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }
    logger.database('Resources fetched', {
      count: resources?.length || 0,
      titles: resources?.map((r: any) => r.title) || []
    }, requestId);

    // Prepare context for script generation
    logger.info('DELIVER-CHUNK', 'Preparing resource context', {}, requestId);
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1500) || 'No content available'}`)
      .join('\n\n') || 'No resources available';
    
    logger.info('DELIVER-CHUNK', 'Resource context prepared', {
      contextLength: resourceContext.length
    }, requestId);

    const lessonPlan = session.lesson_plan;
    logger.info('DELIVER-CHUNK', 'Analyzing lesson plan structure', {
      hasLessonPlan: !!lessonPlan,
      hasLessonChunks: !!lessonPlan?.lesson_chunks,
      totalChunks: lessonPlan?.lesson_chunks?.length || 0,
      requestedChunkIndex: chunkIndex
    }, requestId);
    
    const targetChunk = lessonPlan?.lesson_chunks?.[chunkIndex];

    if (!targetChunk) {
      logger.error('DELIVER-CHUNK', 'Chunk not found in lesson plan', {
        availableChunks: lessonPlan?.lesson_chunks?.length || 0
      }, requestId);
      return NextResponse.json(
        { error: 'Chunk not found in lesson plan' },
        { status: 404 }
      );
    }
    
    logger.info('DELIVER-CHUNK', 'Target chunk found', {
      title: targetChunk.title,
      type: targetChunk.type,
      hasContent: !!targetChunk.content
    }, requestId);

    // Generate script for this chunk
    logger.openai('Preparing script generation', {}, requestId);
    const scriptPrompt = `You are an AI tutor delivering a lesson chunk.

Lesson Context:
${JSON.stringify(lessonPlan, null, 2)}

Current Chunk to Deliver:
${JSON.stringify(targetChunk, null, 2)}

Available Educational Resources:
${resourceContext}

Student Understanding Level: ${session.lesson_plan?.student_evaluation?.understanding_level || 'intermediate'}

Generate a 2-3 minute spoken script for this lesson chunk that:
1. Uses ONLY information from the provided educational resources
2. Is conversational and engaging for audio delivery
3. Explains concepts clearly at the student's level
4. Includes natural pauses for comprehension
5. Ends with a transition or question to maintain engagement
6. Uses simple language suitable for text-to-speech

Return ONLY the script text, no JSON or formatting. The script should be ready for direct text-to-speech conversion.`;
    
    logger.openai('Script prompt prepared', {
      promptLength: scriptPrompt.length
    }, requestId);

    logger.openai('Calling OpenAI API', {}, requestId);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI tutor creating spoken lesson content. Generate clear, engaging scripts suitable for text-to-speech conversion. Use only provided educational resources.'
        },
        {
          role: 'user',
          content: scriptPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    logger.openai('OpenAI response received', {
      model: completion.model,
      usage: completion.usage,
      finishReason: completion.choices[0].finish_reason
    }, requestId);

    const scriptContent = completion.choices[0].message.content || '';
    logger.openai('Script generated', {
      length: scriptContent.length,
      preview: scriptContent.substring(0, 100) + '...'
    }, requestId);

    if (!scriptContent.trim()) {
      logger.error('DELIVER-CHUNK', 'Empty script content generated', {}, requestId);
      return NextResponse.json(
        { error: 'Failed to generate script content' },
        { status: 500 }
      );
    }

    // Generate audio using Unreal Speech API
    logger.unrealSpeech('Starting audio generation', {}, requestId);
    let audioUrl = null;
    try {
      const unrealSpeechPayload = {
        Text: scriptContent,
        VoiceId: 'Scarlett',
        Bitrate: '192k',
        Speed: '0',
        Pitch: '1',
        Codec: 'libmp3lame',
      };
      
      logger.unrealSpeech('Preparing request', {
        textLength: scriptContent.length,
        voiceId: unrealSpeechPayload.VoiceId,
        hasApiKey: !!process.env.UNREAL_SPEECH_API_KEY
      }, requestId);
      
      const unrealSpeechResponse = await fetch('https://api.v6.unrealspeech.com/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNREAL_SPEECH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(unrealSpeechPayload),
      });

      logger.unrealSpeech('API response received', {
        status: unrealSpeechResponse.status,
        statusText: unrealSpeechResponse.statusText,
        headers: Object.fromEntries(unrealSpeechResponse.headers as any)
      }, requestId);
      
      if (unrealSpeechResponse.ok) {
        logger.unrealSpeech('Processing audio buffer', {}, requestId);
        const audioBuffer = await unrealSpeechResponse.arrayBuffer();
        logger.unrealSpeech('Audio buffer processed', {
          bufferSize: audioBuffer.byteLength
        }, requestId);
        
        // Upload audio to Supabase Storage
        const fileName = `lesson-audio/${sessionId}/chunk-${chunkIndex}-${Date.now()}.mp3`;
        logger.storage('Uploading to Supabase storage', { fileName }, requestId);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600'
          });

        if (uploadError) {
          logger.error('DELIVER-CHUNK', 'Error uploading audio', { uploadError }, requestId);
        } else {
          logger.storage('Audio uploaded successfully', { path: uploadData.path }, requestId);
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('lessons')
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;
          logger.storage('Audio URL generated', { audioUrl }, requestId);
        }
      } else {
        const errorText = await unrealSpeechResponse.text();
        logger.error('DELIVER-CHUNK', 'Unreal Speech API error', {
          status: unrealSpeechResponse.status,
          error: errorText
        }, requestId);
      }
    } catch (audioError) {
      const errorDetails = audioError instanceof Error ? {
        error: audioError.message,
        stack: audioError.stack
      } : { error: String(audioError), stack: undefined };
      
      logger.error('DELIVER-CHUNK', 'Audio generation error', errorDetails, requestId);
      // Continue without audio - the script can still be displayed
    }

    // Store chunk in database
    logger.database('Storing chunk in database', {}, requestId);
    const chunkData = {
      session_id: sessionId,
      chunk_index: chunkIndex,
      script_content: scriptContent,
      audio_url: audioUrl,
      chunk_type: 'lesson',
      delivered_at: new Date().toISOString()
    };
    
    logger.database('Chunk data prepared', {
      session_id: chunkData.session_id,
      chunk_index: chunkData.chunk_index,
      hasScript: !!chunkData.script_content,
      scriptLength: chunkData.script_content?.length,
      hasAudio: !!chunkData.audio_url,
      chunk_type: chunkData.chunk_type
    }, requestId);
    
    const { data: chunk, error: insertError } = await supabase
      .from('lesson_chunks')
      .insert(chunkData)
      .select()
      .single();

    if (insertError) {
      logger.error('DELIVER-CHUNK', 'Error storing chunk', { insertError }, requestId);
      return NextResponse.json(
        { error: 'Failed to store lesson chunk' },
        { status: 500 }
      );
    }
    
    logger.database('Chunk stored successfully', { chunkId: chunk.id }, requestId);

    // Update session current chunk index
    logger.database('Updating session current chunk index', { chunkIndex }, requestId);
    const { error: updateError } = await supabase
      .from('lesson_sessions')
      .update({ current_chunk_index: chunkIndex })
      .eq('id', sessionId);
      
    if (updateError) {
      logger.warn('DELIVER-CHUNK', 'Failed to update session chunk index', { updateError }, requestId);
    } else {
      logger.database('Session updated successfully', {}, requestId);
    }

    const responseData = {
      chunkId: chunk.id,
      content: scriptContent,
      audioUrl: audioUrl,
      chunkIndex: chunkIndex,
      hasAudio: !!audioUrl,
      totalChunks: lessonPlan?.lesson_chunks?.length || 1,
      isLastChunk: chunkIndex >= (lessonPlan?.lesson_chunks?.length || 1) - 1
    };
    
    logger.info('DELIVER-CHUNK', 'Chunk delivered successfully', {
      chunkId: responseData.chunkId,
      contentLength: responseData.content?.length,
      hasAudio: responseData.hasAudio,
      chunkIndex: responseData.chunkIndex,
      totalChunks: responseData.totalChunks,
      isLastChunk: responseData.isLastChunk,
      processingTime: Date.now() - startTime
    }, requestId);
    
    return NextResponse.json(responseData);

  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : { message: String(error), stack: undefined, name: 'Unknown' };
    
    logger.error('DELIVER-CHUNK', 'Fatal error', errorDetails, requestId);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}