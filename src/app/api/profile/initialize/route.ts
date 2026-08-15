import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

type ProfileInput = {
  full_name?: string;
  age?: number | null;
  location?: string;
  school?: string;
  grade_level?: string;
  subjects_of_interest?: string[];
  learning_goals?: string;
  bio?: string;
};

export async function POST(request: Request) {
  const profile = (await request.json()) as ProfileInput;
  const neon = await createClient();
  const {
    data: { user },
  } = await neon.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await neon.rpc('initialize_user_profile', {
    profile_data: {
      user_id: user.id,
      full_name: profile.full_name ?? null,
      age: profile.age ?? null,
      location: profile.location ?? '',
      school: profile.school ?? '',
      grade_level: profile.grade_level ?? '',
      subjects_of_interest: profile.subjects_of_interest ?? [],
      learning_goals: profile.learning_goals ?? '',
      bio: profile.bio ?? '',
    },
  });

  if (error) {
    console.error('Failed to initialize Neon user profile:', error);
    return NextResponse.json(
      { error: 'Profile initialization failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
