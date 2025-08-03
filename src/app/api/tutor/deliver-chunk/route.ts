import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, chunkIndex } = await request.json();

    if (!sessionId || chunkIndex === undefined) {
      return NextResponse.json(
        { error: 'Session ID and chunk index are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('lesson_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if chunk already exists
    const { data: existingChunk, error: chunkError } = await supabase
      .from('lesson_chunks')
      .select('*')
      .eq('session_id', sessionId)
      .eq('chunk_index', chunkIndex)
      .single();

    if (!chunkError && existingChunk) {
      return NextResponse.json({
        chunkId: existingChunk.id,
        content: existingChunk.script_content,
        audioUrl: existingChunk.audio_url,
        chunkIndex: existingChunk.chunk_index,
        isExisting: true
      });
    }

    // Get resources for context
    const { data: resources, error: resourcesError } = await supabase
      .rpc('get_resources_by_topic', {
        subject_uuid: session.subject_id,
        topic_uuid: session.topic_id
      });

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError);
      return NextResponse.json(
        { error: 'Failed to fetch educational resources' },
        { status: 500 }
      );
    }

    // Prepare context for script generation
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1500) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const lessonPlan = session.lesson_plan;
    const targetChunk = lessonPlan?.lesson_chunks?.[chunkIndex];

    if (!targetChunk) {
      return NextResponse.json(
        { error: 'Chunk not found in lesson plan' },
        { status: 404 }
      );
    }

    // Generate script for this chunk
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

    const scriptContent = completion.choices[0].message.content || '';

    if (!scriptContent.trim()) {
      return NextResponse.json(
        { error: 'Failed to generate script content' },
        { status: 500 }
      );
    }

    // Generate audio using Unreal Speech API
    let audioUrl = null;
    try {
      const unrealSpeechResponse = await fetch('https://api.v6.unrealspeech.com/stream', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNREAL_SPEECH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Text: scriptContent,
          VoiceId: 'Scarlett', // You can make this configurable
          Bitrate: '192k',
          Speed: '0',
          Pitch: '1',
          Codec: 'libmp3lame',
        }),
      });

      if (unrealSpeechResponse.ok) {
        const audioBuffer = await unrealSpeechResponse.arrayBuffer();
        
        // Upload audio to Supabase Storage
        const fileName = `lesson-audio/${sessionId}/chunk-${chunkIndex}-${Date.now()}.mp3`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('lessons')
          .upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600'
          });

        if (uploadError) {
          console.error('Error uploading audio:', uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('lessons')
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;
        }
      } else {
        console.error('Unreal Speech API error:', await unrealSpeechResponse.text());
      }
    } catch (audioError) {
      console.error('Error generating audio:', audioError);
      // Continue without audio - the script can still be displayed
    }

    // Store chunk in database
    const { data: chunk, error: insertError } = await supabase
      .from('lesson_chunks')
      .insert({
        session_id: sessionId,
        chunk_index: chunkIndex,
        script_content: scriptContent,
        audio_url: audioUrl,
        chunk_type: 'lesson',
        delivered_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error storing chunk:', insertError);
      return NextResponse.json(
        { error: 'Failed to store lesson chunk' },
        { status: 500 }
      );
    }

    // Update session current chunk index
    await supabase
      .from('lesson_sessions')
      .update({ current_chunk_index: chunkIndex })
      .eq('id', sessionId);

    return NextResponse.json({
      chunkId: chunk.id,
      content: scriptContent,
      audioUrl: audioUrl,
      chunkIndex: chunkIndex,
      hasAudio: !!audioUrl,
      totalChunks: lessonPlan?.lesson_chunks?.length || 1,
      isLastChunk: chunkIndex >= (lessonPlan?.lesson_chunks?.length || 1) - 1
    });

  } catch (error) {
    console.error('Error in deliver-chunk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}