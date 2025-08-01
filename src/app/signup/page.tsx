import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import SignupForm from '@/components/auth/SignupForm';

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is already authenticated, redirect to home
  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Join Koro.ai
          </h1>
          <p className="text-gray-600">
            Start your personalized learning journey today
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}