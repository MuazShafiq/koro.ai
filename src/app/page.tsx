import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  // Check authentication on server side
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect based on authentication status
  if (session) {
    // User is authenticated, redirect to dashboard
    redirect('/dashboard');
  } else {
    // User is not authenticated, redirect to login
    redirect('/login');
  }
  
  // This return statement will never be reached due to redirects above
  return null;
}
