import { AuthForm } from '@/components/auth/AuthForm';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If there is a session, redirect to the dashboard
  if (session) {
    redirect('/');
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <AuthForm />
    </div>
  );
}