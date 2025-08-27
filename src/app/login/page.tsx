import { AuthForm } from '@/components/auth/AuthForm';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If there is a session, redirect to the dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-300">
            Sign in to continue your learning journey
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}