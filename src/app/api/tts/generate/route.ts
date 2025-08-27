import { NextRequest, NextResponse } from 'next/server';
import { convertTextToSpeech } from '@/lib/services/unrealSpeech';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voiceId = searchParams.get('voice') || 'Scarlett';
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
      contentType: contentType as any,
      context: 'TTS API request'
    });

    if (!ttsResponse.success || !ttsResponse.audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    // Upload audio to Supabase Storage
    const fileName = `tts-audio/generated-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lessons')
      .upload(fileName, ttsResponse.audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading audio to Supabase:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lessons')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
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
    const body = await request.json();
    const { text, voiceId = 'Scarlett', contentType = 'general' } = body;

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

    // Upload audio to Supabase Storage
    const fileName = `tts-audio/generated-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lessons')
      .upload(fileName, ttsResponse.audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading audio to Supabase:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lessons')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
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