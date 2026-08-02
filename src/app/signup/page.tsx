import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
import { KoroBrand } from '@/components/brand/KoroBrand';

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is already authenticated, redirect to home
  if (session) {
    redirect('/');
  }

  return (
    <div className="relative flex min-h-screen justify-center overflow-hidden p-4 py-8">
      <div className="pointer-events-none absolute -left-40 top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-secondary/15 blur-3xl" />
      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <KoroBrand
            href="/signup"
            priority
            size={56}
            className="mb-6 justify-center"
          />
          <p className="section-kicker mb-2">Start learning</p>
          <h1 className="text-gradient mb-2 text-4xl font-bold tracking-tight">
            Join Koro.ai
          </h1>
          <p className="text-muted-foreground">
            Start your personalized learning journey today
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
