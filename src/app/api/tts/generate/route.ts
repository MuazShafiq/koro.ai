import { NextRequest, NextResponse } from 'next/server';
import { convertTextToSpeech, type ContentType } from '@/lib/services/cloudflareSpeech';
import { uploadAudio } from '@/lib/storage/audio';
import { createClient as createServerClient } from '@/utils/supabase/server';

export const maxDuration = 60;

async function requireUser() {
  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireUser()) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voiceId = searchParams.get('voice') || 'asteria';
    const contentType = searchParams.get('type') || 'general';

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Convert text to speech
    const ttsResponse = await convertTextToSpeech({
      text: decodeURIComponent(text),
      voiceId,
      bitrate: '192k',
      speed: '0',
      pitch: '1',
      codec: 'libmp3lame',
      contentType: contentType as ContentType,
      context: 'TTS API request'
    });

    if (!ttsResponse.success || !ttsResponse.audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    // Store generated audio in Vercel Blob.
    const fileName = `tts-audio/generated-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const blob = await uploadAudio(fileName, ttsResponse.audioBuffer);

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      duration: ttsResponse.estimatedDuration
    });

  } catch (error) {
    console.error('Error in TTS API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await requireUser()) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { text, voiceId = 'asteria', contentType = 'general' } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Convert text to speech
    const ttsResponse = await convertTextToSpeech({
      text,
      voiceId,
      bitrate: '192k',
      speed: '0',
      pitch: '1',
      codec: 'libmp3lame',
      contentType,
      context: 'TTS API POST request'
    });

    if (!ttsResponse.success || !ttsResponse.audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    // Store generated audio in Vercel Blob.
    const fileName = `tts-audio/generated-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const blob = await uploadAudio(fileName, ttsResponse.audioBuffer);

    return NextResponse.json({
      success: true,
      audioUrl: blob.url,
      duration: ttsResponse.estimatedDuration
    });

  } catch (error) {
    console.error('Error in TTS API POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
