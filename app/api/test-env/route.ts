import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasUnrealSpeech = !!process.env.UNREAL_SPEECH_API_KEY;
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      environment: process.env.NODE_ENV,
      apiKeys: {
        openai: hasOpenAI,
        unrealSpeech: hasUnrealSpeech,
        supabaseUrl: hasSupabaseUrl,
        supabaseKey: hasSupabaseKey
      },
      message: 'Environment variables check'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check environment variables' },
      { status: 500 }
    );
  }
}