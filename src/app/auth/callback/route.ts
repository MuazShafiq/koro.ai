import { createClient } from '@/utils/supabase/server';
import { initializeUserData } from '@/utils/supabase/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    // If this is a new user (sign up), initialize their data
    if (data?.user && !error) {
      // Check if this is a new user by looking for existing subjects
      const { data: existingSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1);
      
      // If no subjects exist, this is likely a new user
      if (!existingSubjects || existingSubjects.length === 0) {
        await initializeUserData(data.user.id, supabase);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
}