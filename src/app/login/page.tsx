import { AuthForm } from '@/components/auth/AuthForm';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { KoroBrand } from '@/components/brand/KoroBrand';

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If there is a session, redirect to the dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -left-40 top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-secondary/15 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <KoroBrand
            href="/login"
            priority
            size={56}
            className="mb-6 justify-center"
          />
          <p className="section-kicker mb-2">Welcome back</p>
          <h1 className="text-gradient mb-2 text-4xl font-bold tracking-tight">
            Welcome Back
          </h1>
          <p className="text-muted-foreground">
            Sign in to continue your learning journey
          </p>
        </div>
        <AuthForm />
      </div>
    </div>
  );
}
