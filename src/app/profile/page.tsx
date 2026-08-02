import { UserProfile } from '@/components/profile/UserProfile';

export default function ProfilePage() {
  return (
    <div className="page-container min-h-full pb-12">
      <div className="surface-panel mb-7 rounded-[1.75rem] p-6 md:p-8">
        <p className="section-kicker mb-2">Your account</p>
        <h1 className="text-gradient text-3xl font-bold tracking-tight md:text-4xl">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">Keep your identity and learning profile up to date.</p>
      </div>
      <UserProfile />
    </div>
  );
}
