import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, question, chunkId } = await request.json();

    if (!sessionId || !question) {
      return NextResponse.json(
        { error: 'Session ID and question are required' },
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

    // Get resources for RAG context
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

    // Get current chunk context if provided
    let currentChunkContext = '';
    if (chunkId) {
      const { data: chunk, error: chunkError } = await supabase
        .from('lesson_chunks')
        .select('script_content')
        .eq('id', chunkId)
        .single();
      
      if (!chunkError && chunk) {
        currentChunkContext = `Current lesson content: ${chunk.script_content}`;
      }
    }

    // Prepare context for AI response
    const resourceContext = resources
      ?.map((r: any) => `Title: ${r.title}\nContent: ${r.content_text?.substring(0, 1000) || 'No content available'}`)
      .join('\n\n') || 'No resources available';

    const lessonContext = session.lesson_plan ? JSON.stringify(session.lesson_plan, null, 2) : 'No lesson plan available';

    // Generate AI response using RAG
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
      const cleanedContent = extractJsonFromMarkdown(rawContent);
      aiResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate response' },
        { status: 500 }
      );
    }

    // Store the interaction in student_assessments
    const { error: assessmentError } = await supabase
      .from('student_assessments')
      .insert({
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
      });

    if (assessmentError) {
      console.error('Error storing interaction:', assessmentError);
    }

    // Update chunk interaction if chunkId provided
    if (chunkId) {
      const { error: chunkUpdateError } = await supabase
        .from('lesson_chunks')
        .update({
          student_interaction: {
            question: question,
            ai_response: aiResponse.answer,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', chunkId);

      if (chunkUpdateError) {
        console.error('Error updating chunk interaction:', chunkUpdateError);
      }
    }

    // Generate audio for the response if possible
    let audioUrl = null;
    if (aiResponse.can_answer && aiResponse.answer) {
      try {
        const unrealSpeechResponse = await fetch('https://api.v6.unrealspeech.com/stream', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.UNREAL_SPEECH_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            Text: aiResponse.answer,
            VoiceId: 'Scarlett',
            Bitrate: '192k',
            Speed: '0',
            Pitch: '1',
            Codec: 'libmp3lame',
          }),
        });

        if (unrealSpeechResponse.ok) {
          const audioBuffer = await unrealSpeechResponse.arrayBuffer();
          
          // Upload audio to Supabase Storage
          const fileName = `interaction-audio/${sessionId}/response-${Date.now()}.mp3`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('lessons')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mpeg',
              cacheControl: '3600'
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('lessons')
              .getPublicUrl(fileName);
            
            audioUrl = urlData.publicUrl;
          }
        }
      } catch (audioError) {
        console.error('Error generating response audio:', audioError);
      }
    }

    return NextResponse.json({
      answer: aiResponse.answer,
      canAnswer: aiResponse.can_answer,
      resourceUsed: aiResponse.resource_used,
      lessonAdaptation: aiResponse.lesson_adaptation,
      audioUrl: audioUrl,
      hasAudio: !!audioUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handle-interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}