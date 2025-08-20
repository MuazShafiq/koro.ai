import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../src/utils/supabase/server';
import OpenAI from 'openai';
import { logger } from '../../../../src/lib/logger';
import { convertTextToSpeech } from '../../../../src/lib/services/unrealSpeech';
import { progressService } from '../../../../src/lib/services/progressService';

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

**IMPORTANT - Reduce Confirmations:**
- Avoid asking "Does this make sense?" or "Do you understand?" after explanations
- Don't use phrases like "Are you following along?" or "Is this clear?"
- Instead of confirmations, use natural transitions like "Now let's explore..." or "This leads us to..."
- Be confident and direct in explanations
- Only ask questions when they serve a pedagogical purpose (checking specific understanding or encouraging thinking)
- Keep the flow conversational but avoid excessive checking for comprehension

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

    // Extract concepts and equations from the generated content for progress tracking
    logger.info('DELIVER-CHUNK', 'Extracting concepts for progress tracking', {}, requestId);
    let conceptsToTrack: string[] = [];
    let equationsToTrack: string[] = [];
    
    try {
      // Extract key concepts from the chunk content
      const conceptMatches = targetChunk.content?.match(/(?:understand|learn|concept|definition|theorem|principle)[:\s]+([^.!?\n]{10,100})/gi) || [];
      conceptsToTrack = conceptMatches.map((match: string) =>
        match.replace(/^(?:understand|learn|concept|definition|theorem|principle)[:\s]+/i, '').trim()
      ).filter((concept: string) => concept.length > 5 && concept.length < 150);
      
      // Add chunk title as a concept if it's meaningful
      if (targetChunk.title && targetChunk.title.length > 5) {
        conceptsToTrack.unshift(targetChunk.title);
      }
      
      // Extract equations from script content
      const equationPatterns = [
        /\$\$([^$]+)\$\$/g, // LaTeX display math
        /\$([^$]+)\$/g,   // LaTeX inline math
        /(?:^|\s)((?:[a-zA-Z]\s*[=<>≤≥≠±∓×÷]|[=<>≤≥≠±∓×÷]\s*[a-zA-Z])[^.!?\n]*)/gm // Mathematical expressions
      ];
      
      equationPatterns.forEach(pattern => {
        const matches = scriptContent.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const cleaned = match.replace(/[\$\\\[\]\(\)]/g, '').trim();
            if (cleaned.length > 2 && cleaned.length < 100) {
              equationsToTrack.push(cleaned);
            }
          });
        }
      });
      
      logger.info('DELIVER-CHUNK', 'Concepts extracted for tracking', {
        conceptsCount: conceptsToTrack.length,
        equationsCount: equationsToTrack.length,
        concepts: conceptsToTrack.slice(0, 3) // Log first 3 for debugging
      }, requestId);
    } catch (extractionError) {
      logger.warn('DELIVER-CHUNK', 'Failed to extract concepts', { extractionError }, requestId);
      // Continue without concept tracking if extraction fails
    }

    // Generate audio using Unreal Speech API with chunking support
    logger.unrealSpeech('Starting audio generation with chunking', {
      textLength: scriptContent.length
    }, requestId);
    let audioUrl = null;
    try {
      const ttsResponse = await convertTextToSpeech({
        text: scriptContent,
        voiceId: 'Scarlett',
        bitrate: '192k',
        speed: '0',
        pitch: '1',
        codec: 'libmp3lame',
        contentType: 'lesson',
        context: `lesson chunk ${chunkIndex} for session ${sessionId}`
      });
      
      if (ttsResponse.success && ttsResponse.audioBuffer) {
        logger.unrealSpeech('Audio generation successful', {
          bufferSize: ttsResponse.audioBuffer.byteLength,
          chunksProcessed: ttsResponse.chunksProcessed || 1
        }, requestId);
        
        // Upload audio to Supabase Storage
        const fileName = `lesson-audio/${sessionId}/chunk-${chunkIndex}-${Date.now()}.mp3`;
        logger.storage('Uploading to Supabase storage', { fileName }, requestId);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(fileName, ttsResponse.audioBuffer, {
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
        logger.error('DELIVER-CHUNK', 'Audio generation failed', {
          error: ttsResponse.error
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

    // Track progress for delivered concepts
    logger.info('DELIVER-CHUNK', 'Tracking concept progress', {
      conceptsToTrack: conceptsToTrack.length,
      sessionId
    }, requestId);
    
    try {
      // Add each concept to progress tracking
      for (const concept of conceptsToTrack) {
        const progressId = await progressService.addConceptProgress(
          sessionId,
          concept,
          targetChunk.title || `Chunk ${chunkIndex}`,
          equationsToTrack.length > 0 ? equationsToTrack : undefined
        );
        
        // Mark as delivered immediately since we're delivering the chunk
        await progressService.markConceptDelivered(progressId, 0.8); // Default engagement score
        
        logger.info('DELIVER-CHUNK', 'Concept progress tracked', {
          concept: concept.substring(0, 50),
          progressId
        }, requestId);
      }
      
      // If no specific concepts were extracted, track the chunk itself
      if (conceptsToTrack.length === 0 && targetChunk.title) {
        const progressId = await progressService.addConceptProgress(
          sessionId,
          targetChunk.title,
          `Chunk ${chunkIndex}`,
          equationsToTrack.length > 0 ? equationsToTrack : undefined
        );
        await progressService.markConceptDelivered(progressId, 0.8);
        
        logger.info('DELIVER-CHUNK', 'Chunk title tracked as concept', {
          title: targetChunk.title,
          progressId
        }, requestId);
      }
    } catch (progressError) {
      logger.error('DELIVER-CHUNK', 'Failed to track concept progress', { progressError }, requestId);
      // Continue without failing the entire request
    }

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

    // Get updated progress summary for response
    let progressSummary = null;
    try {
      progressSummary = await progressService.getProgressSummary(sessionId);
      logger.info('DELIVER-CHUNK', 'Progress summary retrieved', {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts
      }, requestId);
    } catch (progressError) {
      logger.warn('DELIVER-CHUNK', 'Failed to get progress summary', { progressError }, requestId);
    }

    const responseData = {
      chunkId: chunk.id,
      content: scriptContent,
      audioUrl: audioUrl,
      chunkIndex: chunkIndex,
      hasAudio: !!audioUrl,
      totalChunks: lessonPlan?.lesson_chunks?.length || 1,
      isLastChunk: chunkIndex >= (lessonPlan?.lesson_chunks?.length || 1) - 1,
      conceptsTracked: conceptsToTrack.length,
      equationsTracked: equationsToTrack.length,
      progressSummary: progressSummary ? {
        progressPercentage: progressSummary.progressPercentage,
        deliveredConcepts: progressSummary.deliveredConcepts,
        totalConcepts: progressSummary.totalConcepts,
        equationsCount: progressSummary.equationsCount
      } : null
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