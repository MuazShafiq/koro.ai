import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import SignupForm from '@/components/auth/SignupForm';
import { KoroBrand } from '@/components/brand/KoroBrand';

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is already authenticated, redirect to the app
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden p-3 focus-within:overflow-y-auto sm:p-4 sm:py-8">
      <div className="pointer-events-none absolute -left-40 top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-[-12rem] h-[34rem] w-[34rem] rounded-full bg-secondary/15 blur-3xl" />
      <div className="relative w-full max-w-lg">
        <div className="mb-3 text-center sm:mb-8">
          <KoroBrand
            href="/"
            priority
            size={48}
            className="justify-center sm:mb-6"
          />
          <h1 className="text-gradient mb-3 hidden text-4xl font-bold tracking-tight sm:block">
            Meet your new study partner
          </h1>
          <p className="hidden text-muted-foreground sm:block">
            Create your account and start learning with Koro.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
