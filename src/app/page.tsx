import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Check,
  MessageCircleMore,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { KoroBrand, KoroMark } from '@/components/brand/KoroBrand';

export const metadata: Metadata = {
  title: 'Koro.ai | Your personal AI tutor',
  description:
    'Learn through adaptive, voice-guided lessons with a synchronized AI tutor and blackboard.',
};

const lessonSteps = [
  {
    icon: MessageCircleMore,
    label: 'Quick knowledge check',
    detail: 'Koro starts from what you already know.',
  },
  {
    icon: Volume2,
    label: 'Clear, spoken guidance',
    detail: 'Lessons unfold naturally, one idea at a time.',
  },
  {
    icon: BookOpen,
    label: 'A blackboard that keeps up',
    detail: 'Key equations and notes appear as they are taught.',
  },
];

export default function Home() {
  return (
    <main className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#06070a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="absolute -right-24 top-8 h-96 w-96 rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <header className="relative z-10 mx-auto flex h-14 w-full max-w-7xl shrink-0 items-center justify-between px-4 sm:h-[72px] sm:px-8 lg:px-10">
        <KoroBrand
          href="/"
          size={36}
          priority
          subtitleClassName="hidden sm:block"
        />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary navigation">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white sm:rounded-xl sm:px-4"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-lg bg-white px-3 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 sm:rounded-xl sm:px-5"
          >
            Get started
            <ArrowRight className="hidden h-4 w-4 sm:block" />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid min-h-0 w-full max-w-7xl flex-1 items-center gap-6 px-5 pb-5 sm:px-8 sm:pb-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-10">
        <div className="flex min-h-0 flex-col justify-center lg:pr-6">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 sm:mb-5 sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            Voice-guided learning, built around you
          </div>

          <h1 className="max-w-3xl text-[clamp(2.6rem,7vw,5.8rem)] font-bold leading-[0.94] tracking-[-0.055em]">
            A tutor that teaches at{' '}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
              your pace.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-white/55 sm:mt-6 sm:text-lg sm:leading-8">
            Koro turns difficult concepts into focused conversations, spoken explanations,
            and a live blackboard—without dumping an entire lesson on you at once.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-blue-500/30 sm:px-6 sm:text-base"
            >
              Start learning
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/[0.035] px-5 text-sm font-semibold text-white/80 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white sm:px-6 sm:text-base"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45 sm:mt-8 sm:text-sm">
            {['Adaptive lessons', 'Synchronized audio', 'Progress that matters'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400/10 text-emerald-400">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-0 items-center justify-center lg:flex">
          <div className="absolute h-[70%] w-[70%] rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/15 blur-3xl" />
          <div className="relative w-full max-w-[520px] rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/50 backdrop-blur-xl xl:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KoroMark size={54} className="shadow-lg shadow-blue-500/20" />
                <div>
                  <p className="font-semibold">Koro is ready</p>
                  <p className="text-xs text-white/45">Your lesson adapts as you learn</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <div className="space-y-2.5">
              {lessonSteps.map(({ icon: Icon, label, detail }, index) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5 transition-colors hover:bg-white/[0.045]"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-blue-300">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                        0{index + 1}
                      </span>
                      <p className="text-sm font-semibold text-white/90">{label}</p>
                    </div>
                    <p className="mt-0.5 text-xs leading-5 text-white/40">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-400/15 bg-blue-500/[0.07] px-4 py-3">
              <div>
                <p className="text-xs font-medium text-blue-200">Next up</p>
                <p className="mt-0.5 text-sm font-semibold">Motion under constant acceleration</p>
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/25">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 opacity-35 sm:hidden" aria-hidden="true">
          <KoroMark size={72} />
        </div>
      </section>
    </main>
  );
}
