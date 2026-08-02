import type { LucideIcon } from 'lucide-react';
import {
  Atom,
  BarChart3,
  BookOpen,
  Calculator,
  Code2,
  Dna,
  FlaskConical,
  Globe2,
  GraduationCap,
  Landmark,
  Microscope,
  Music2,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubjectVisual {
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

const subjectVisuals: Array<{
  matches: string[];
  visual: SubjectVisual;
}> = [
  {
    matches: ['mathematics', 'math', 'calculus', 'algebra'],
    visual: {
      icon: Calculator,
      gradient: 'from-blue-500 via-blue-500 to-cyan-400',
      glow: 'shadow-blue-500/25',
    },
  },
  {
    matches: ['physics'],
    visual: {
      icon: Atom,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      glow: 'shadow-violet-500/25',
    },
  },
  {
    matches: ['chemistry'],
    visual: {
      icon: FlaskConical,
      gradient: 'from-fuchsia-500 via-purple-500 to-violet-500',
      glow: 'shadow-fuchsia-500/25',
    },
  },
  {
    matches: ['biology'],
    visual: {
      icon: Dna,
      gradient: 'from-emerald-500 via-green-500 to-teal-400',
      glow: 'shadow-emerald-500/25',
    },
  },
  {
    matches: ['computer science', 'computing', 'programming', 'coding'],
    visual: {
      icon: Code2,
      gradient: 'from-indigo-500 via-blue-500 to-sky-400',
      glow: 'shadow-indigo-500/25',
    },
  },
  {
    matches: ['english', 'literature', 'language'],
    visual: {
      icon: BookOpen,
      gradient: 'from-orange-500 via-rose-500 to-pink-500',
      glow: 'shadow-rose-500/25',
    },
  },
  {
    matches: ['science'],
    visual: {
      icon: Microscope,
      gradient: 'from-cyan-500 via-sky-500 to-blue-500',
      glow: 'shadow-cyan-500/25',
    },
  },
  {
    matches: ['geography'],
    visual: {
      icon: Globe2,
      gradient: 'from-teal-500 via-cyan-500 to-blue-500',
      glow: 'shadow-cyan-500/25',
    },
  },
  {
    matches: ['history'],
    visual: {
      icon: Landmark,
      gradient: 'from-amber-500 via-orange-500 to-red-500',
      glow: 'shadow-orange-500/25',
    },
  },
  {
    matches: ['economics', 'business'],
    visual: {
      icon: BarChart3,
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      glow: 'shadow-emerald-500/25',
    },
  },
  {
    matches: ['art', 'design'],
    visual: {
      icon: Palette,
      gradient: 'from-pink-500 via-fuchsia-500 to-violet-500',
      glow: 'shadow-pink-500/25',
    },
  },
  {
    matches: ['music'],
    visual: {
      icon: Music2,
      gradient: 'from-purple-500 via-indigo-500 to-blue-500',
      glow: 'shadow-purple-500/25',
    },
  },
];

const fallbackVisual: SubjectVisual = {
  icon: GraduationCap,
  gradient: 'from-blue-500 via-indigo-500 to-violet-500',
  glow: 'shadow-indigo-500/25',
};

export function getSubjectVisual(subjectName: string): SubjectVisual {
  const normalizedName = subjectName.trim().toLowerCase();
  return subjectVisuals.find(({ matches }) =>
    matches.some((match) => normalizedName.includes(match)),
  )?.visual || fallbackVisual;
}

interface SubjectIconProps {
  subjectName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { frame: 'h-9 w-9 rounded-xl', icon: 'h-[18px] w-[18px]' },
  md: { frame: 'h-11 w-11 rounded-xl', icon: 'h-[22px] w-[22px]' },
  lg: { frame: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
};

export function SubjectIcon({
  subjectName,
  size = 'md',
  className,
}: SubjectIconProps) {
  const visual = getSubjectVisual(subjectName);
  const Icon = visual.icon;
  const dimensions = sizes[size];

  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate flex shrink-0 items-center justify-center overflow-hidden border border-white/25 bg-gradient-to-br text-white shadow-lg',
        visual.gradient,
        visual.glow,
        dimensions.frame,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.38),transparent_42%)]" />
      <div className="absolute -bottom-3 -right-2 h-8 w-8 rounded-full bg-black/15 blur-md" />
      <Icon
        className={cn('relative z-10 drop-shadow-sm', dimensions.icon)}
        strokeWidth={2}
      />
    </div>
  );
}
