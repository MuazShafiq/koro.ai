'use client';

import { SubjectSelectionModal } from "@/components/modals/SubjectSelectionModal";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Plus, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { useSupabase } from "@/utils/supabase/provider";
import { Database } from "@/utils/supabase/database.types";
import { KoroMark } from "@/components/brand/KoroBrand";
import { getSubjectVisual, SubjectIcon } from "@/components/subjects/SubjectIcon";
import { useState, useEffect, useCallback } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

type FormattedSubject = {
  id: string;
  subject: string;
  progress: number;
  nextTopic: string;
  gradient: string;
  completedTopics: number;
};

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<FormattedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const { supabase } = useSupabase();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleRemoveSubject = async (subjectId: string, subjectName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing subject:', error);
        return;
      }

      // Refresh the data
      await fetchUserData();
    } catch (error) {
      console.error('Error removing subject:', error);
    }
  };

  const fetchUserData = useCallback(async () => {
     try {
       setLoading(true);
       
       // Get current user
       const { data: { user } } = await supabase.auth.getUser();
       
       if (!user) {
         setLoading(false);
         return;
       }
       
       // Fetch user profile
       const { data: profileData } = await supabase
         .from('profiles')
         .select('*')
         .eq('id', user.id)
         .single();
      
      setProfile(profileData);
      
      // Fetch user subjects with progress
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select(`
          *,
          topics(
            id,
            name,
            completed
          )
        `)
        .eq('user_id', user.id);
      
      if (subjectsData) {
        const formattedSubjects = subjectsData.map((subject) => {
          const totalTopics = subject.topics?.length || 0;
          const completedTopics = subject.topics?.filter((topic) => topic.completed).length || 0;
          const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
          
          return {
            id: subject.id,
            subject: subject.name,
            progress,
            nextTopic: getNextTopic(subject.name),
            gradient: getSubjectVisual(subject.name).gradient,
            completedTopics
          };
        });
        
        setSubjects(formattedSubjects);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
     fetchUserData();
   }, [fetchUserData]);

  const getNextTopic = (subjectName: string) => {
    const topicMap: { [key: string]: string } = {
      'Mathematics': 'Algebra, Calculus, and more',
      'Physics': 'Mechanics, Thermodynamics',
      'Chemistry': 'Organic, Inorganic Chemistry',
      'Biology': 'Cell Biology, Genetics',
      'Computer Science': 'Programming, Algorithms',
      'English': 'Literature, Grammar'
    };
    return topicMap[subjectName] || 'Continue learning';
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  const totalCompletedTopics = subjects.reduce(
    (total, subject) => total + subject.completedTopics,
    0,
  );
  const averageProgress = subjects.length
    ? Math.round(subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length)
    : 0;

  const quickStats = [
    {
      title: "Active subjects",
      value: subjects.length,
      detail: subjects.length === 1 ? "learning path" : "learning paths",
      icon: BookOpen,
      tone: "from-blue-500 to-cyan-400",
    },
    {
      title: "Topics completed",
      value: totalCompletedTopics,
      detail: `${averageProgress}% average progress`,
      icon: TrendingUp,
      tone: "from-emerald-500 to-teal-400",
    },
    {
      title: "Tutor sessions",
      value: profile?.total_sessions || 0,
      detail: `${profile?.streak || 0} day streak`,
      icon: Users,
      tone: "from-violet-500 to-fuchsia-400",
    },
  ];

  return (
    <div className="page-shell">
      <main className="page-container space-y-7 pb-12">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="surface-panel relative overflow-hidden rounded-[1.75rem] p-6 md:p-8"
        >
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-48 rounded-full bg-secondary/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4 md:gap-5">
              <div className="hidden rounded-2xl border border-white/10 bg-white/[0.045] p-2 sm:block">
                <KoroMark priority size={58} />
              </div>
              <div>
                <p className="section-kicker mb-2">Learning command center</p>
                <h1 className="text-gradient text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  {greeting}, {profile?.full_name || "there"}.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Pick up where you left off, start a focused AI lesson, or see how your subjects are moving.
                </p>
              </div>
            </div>
            <Button
              onClick={() => { window.location.href = "/study"; }}
              className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 text-white shadow-lg shadow-blue-500/15 hover:from-blue-400 hover:to-violet-400"
            >
              Continue studying
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + index * 0.06 }}
                className="surface-panel rounded-2xl p-4 md:p-5"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.tone} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                    <p className="text-sm font-medium text-foreground">{stat.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{stat.detail}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="surface-panel overflow-hidden rounded-[1.75rem] p-5 md:p-7"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker mb-2">AI tutor</p>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Your subjects</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a subject and Koro will build the next lesson around your progress.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsSubjectModalOpen(true)}
              className="rounded-xl border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add subject
            </Button>
          </div>

          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {subjects.map((subject, index) => (
                <motion.article
                  key={subject.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 + index * 0.05 }}
                  onClick={() => { window.location.href = "/study"; }}
                  className="surface-panel-interactive group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.075] bg-white/[0.025] p-5"
                >
                  <div className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${subject.gradient} opacity-[0.12] blur-3xl`} />
                  <button
                    type="button"
                    aria-label={`Remove ${subject.subject}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveSubject(subject.id, subject.subject);
                    }}
                    className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-colors hover:bg-red-500/10 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="relative flex items-start gap-4 pr-8">
                    <SubjectIcon subjectName={subject.subject} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-bold text-foreground">{subject.subject}</h3>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          Ready
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">Next: {subject.nextTopic}</p>
                    </div>
                  </div>

                  <div className="relative mt-6">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">{subject.completedTopics} topics completed</span>
                      <span className="font-bold text-foreground">{subject.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${subject.gradient} transition-[width] duration-500`}
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="relative mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Personalized AI lesson
                    </span>
                    <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                      Open
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSubjectModalOpen(true)}
              className="flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center transition-colors hover:border-primary/30 hover:bg-primary/[0.035]"
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="h-6 w-6" />
              </span>
              <span className="font-semibold text-foreground">Add your first subject</span>
              <span className="mt-1 text-sm text-muted-foreground">Choose what you want Koro to teach you.</span>
            </button>
          )}
        </motion.section>
      </main>

      <SubjectSelectionModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectsAdded={fetchUserData}
      />
    </div>
  );
}
