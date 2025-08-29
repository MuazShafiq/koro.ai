import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withAuthRetry } from '@/utils/supabase/retry';
import { logger } from '@/lib/logger';
import { convertTextToSpeech, validateApiKey } from '@/lib/services/unrealSpeech';
import tutorVoiceSOP from '@/lib/tutor-voice-sop.json';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('GENERATE-QUESTION-AUDIO', 'Starting background audio generation', {}, requestId);
  
  try {
    const { sessionId, questions } = await request.json();
    
    if (!sessionId || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Session ID and questions array are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Verify user authentication
    const authResult = await withAuthRetry(
      supabase,
      async (client) => await client.auth.getUser(),
      { requestId, operation: 'user authentication' }
    );
    
    const { user } = authResult.data;
    if (authResult.error || !user) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Verify session belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Validate TTS service before proceeding
    const apiKeyValidation = validateApiKey();
    if (!apiKeyValidation.isValid) {
      logger.warn('GENERATE-QUESTION-AUDIO', 'TTS service unavailable, skipping audio generation', {
        reason: apiKeyValidation.error,
        sessionId
      }, requestId);
      
      return NextResponse.json({
        success: true,
        sessionId,
        audioResults: questions.map((q: any) => ({
          id: q.id,
          audioUrl: null,
          success: false,
          error: 'TTS service unavailable',
          skipped: true
        })),
        successCount: 0,
        totalCount: questions.length,
        ttsUnavailable: true,
        message: 'Audio generation skipped due to TTS service unavailability'
      });
    }

    // Generate audio for all questions in parallel
    logger.info('GENERATE-QUESTION-AUDIO', 'Generating audio for questions', {
      questionCount: questions.length,
      ttsServiceStatus: 'available'
    }, requestId);

    const audioPromises = questions.map(async (questionData: any, index: number) => {
      try {
        // Add timeout to prevent hanging requests
        const ttsPromise = convertTextToSpeech({
          text: questionData.question,
          voiceId: tutorVoiceSOP.voice_delivery_instructions.voice_parameters.unreal_speech_settings.voiceId,
          contentType: 'assessment',
          context: `background question ${index + 1} for session ${sessionId}`
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('TTS request timeout (30s)')), 30000);
        });
        
        const ttsResult = await Promise.race([ttsPromise, timeoutPromise]);
        
        if (!ttsResult.success || !ttsResult.audioBuffer) {
          throw new Error(ttsResult.error || 'TTS conversion failed');
        }
        
        // Upload to Supabase Storage
        const fileName = `question_${sessionId}_${index}_bg.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(fileName, ttsResult.audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600'
          });
        
        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl(fileName);
        
        logger.info('GENERATE-QUESTION-AUDIO', 'Successfully generated audio for question', {
          questionIndex: index,
          questionId: questionData.id,
          audioSize: ttsResult.audioBuffer.length
        }, requestId);
        
        return {
          id: questionData.id,
          audioUrl: urlData.publicUrl,
          success: true
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isAuthError = errorMessage.includes('401') || errorMessage.includes('authentication');
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit');
        
        logger.error('GENERATE-QUESTION-AUDIO', 'Failed to generate audio for question', {
          questionIndex: index,
          questionId: questionData.id,
          error: errorMessage,
          isAuthError,
          isRateLimit,
          questionText: questionData.question?.substring(0, 100) + '...'
        }, requestId);
        
        return {
          id: questionData.id,
          audioUrl: null,
          success: false,
          error: errorMessage,
          errorType: isAuthError ? 'authentication' : isRateLimit ? 'rate_limit' : 'unknown'
        };
      }
    });

    // Wait for all audio generation to complete
    const audioResults = await Promise.all(audioPromises);
    
    // Analyze results
    const successfulResults = audioResults.filter(result => result.success);
    const failedResults = audioResults.filter(result => !result.success);
    const authErrors = failedResults.filter(result => result.errorType === 'authentication');
    const rateLimitErrors = failedResults.filter(result => result.errorType === 'rate_limit');
    
    // Log comprehensive results
    logger.info('GENERATE-QUESTION-AUDIO', 'Audio generation batch completed', {
      sessionId,
      successCount: successfulResults.length,
      failedCount: failedResults.length,
      authErrorCount: authErrors.length,
      rateLimitErrorCount: rateLimitErrors.length,
      totalCount: questions.length,
      successRate: `${Math.round((successfulResults.length / questions.length) * 100)}%`
    }, requestId);
    
    // Update session with audio URLs (even if some failed)
    try {
      // Get current assessment questions
      const { data: currentSession } = await supabase
        .from('lesson_sessions')
        .select('assessment_questions')
        .eq('id', sessionId)
        .single();
      
      if (currentSession?.assessment_questions) {
        // Update questions with audio URLs (successful ones only)
        const updatedQuestions = currentSession.assessment_questions.map((q: any) => {
          const audioResult = successfulResults.find(result => result.id === q.id);
          return audioResult ? { ...q, audioUrl: audioResult.audioUrl } : q;
        });
        
        // Update session in database
        await supabase
          .from('lesson_sessions')
          .update({ 
            assessment_questions: updatedQuestions,
            audio_generation_status: successfulResults.length === questions.length ? 'completed' : 'partial'
          })
          .eq('id', sessionId);
      }
    } catch (dbError) {
      logger.error('GENERATE-QUESTION-AUDIO', 'Failed to update session with audio URLs', {
        sessionId,
        error: dbError
      }, requestId);
    }

    // Return success even if some audio generation failed
    // This allows the AI tutor to continue working without audio
    return NextResponse.json({
      success: true,
      sessionId,
      audioResults,
      successCount: successfulResults.length,
      totalCount: questions.length,
      hasFailures: failedResults.length > 0,
      authErrorCount: authErrors.length,
      rateLimitErrorCount: rateLimitErrors.length,
      message: successfulResults.length === 0 
        ? 'Audio generation failed for all questions, but session can continue without audio'
        : successfulResults.length < questions.length
        ? `Audio generated for ${successfulResults.length}/${questions.length} questions`
        : 'All audio generated successfully'
    });

  } catch (error) {
    logger.error('GENERATE-QUESTION-AUDIO', 'Unexpected error', { error }, requestId);
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
