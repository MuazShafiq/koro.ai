"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { KoroBrand, KoroMark } from "@/components/brand/KoroBrand";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Your learning overview",
  },
  {
    name: "Study",
    href: "/study",
    icon: BookOpen,
    description: "Start an AI lesson",
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Progress and insights",
  },
];

const bottomNavigation = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function KoroSidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarExpanded, setSidebarExpanded, userProgress } = useStore();
  const goalTarget = Math.max(1, userProgress.weeklyGoal.target);
  const goalProgress = Math.min(100, (userProgress.weeklyGoal.current / goalTarget) * 100);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <aside
      className={cn(
        "relative z-30 flex h-16 w-full shrink-0 border-t border-white/[0.07] bg-[#090c14]/95 backdrop-blur-2xl transition-[width] duration-300 md:h-full md:flex-col md:border-r md:border-t-0",
        sidebarExpanded ? "md:w-[272px]" : "md:w-[76px]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.13),transparent_38%)] md:block" />

      <div className="relative hidden h-full min-h-0 flex-col md:flex">
        <div className={cn("flex h-[76px] shrink-0 items-center", sidebarExpanded ? "px-4" : "justify-center px-2")}>
          {sidebarExpanded ? (
            <KoroBrand href="/dashboard" priority size={42} showSubtitle />
          ) : (
            <Link href="/dashboard" aria-label="Koro.ai dashboard">
              <KoroMark priority size={40} />
            </Link>
          )}

          {sidebarExpanded && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarExpanded(false)}
              aria-label="Collapse sidebar"
              className="ml-auto h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!sidebarExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarExpanded(true)}
            aria-label="Expand sidebar"
            className="mx-auto mb-3 h-9 w-9 rounded-xl text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {sidebarExpanded && (
          <div className="mx-3 mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Weekly goal</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {userProgress.weeklyGoal.current} of {userProgress.weeklyGoal.target} hours
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {Math.round(goalProgress)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 transition-[width] duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={!sidebarExpanded ? item.name : undefined}
                className={cn(
                  "group relative flex items-center rounded-xl border px-3 py-2.5 transition-colors",
                  sidebarExpanded ? "gap-3" : "justify-center",
                  active
                    ? "border-primary/20 bg-primary/[0.10] text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-white/[0.045] hover:text-foreground",
                )}
              >
                {active && <span className="absolute -left-3 h-6 w-0.5 rounded-r-full bg-primary" />}
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/[0.045] group-hover:bg-white/[0.075]",
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {sidebarExpanded && (
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/[0.06] p-3">
          {bottomNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={!sidebarExpanded ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  sidebarExpanded ? "gap-3" : "justify-center",
                  active ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:bg-white/[0.045] hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {sidebarExpanded && <span>{item.name}</span>}
              </Link>
            );
          })}
          {sidebarExpanded && (
            <p className="px-3 pt-3 text-[11px] text-muted-foreground/60">Koro.ai · Voice-first learning</p>
          )}
        </div>
      </div>

      <nav className="relative flex h-full w-full items-center justify-around px-2 md:hidden">
        {[...navigation, ...bottomNavigation].map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center rounded-xl transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export const Logo = () => <KoroBrand showSubtitle={false} size={32} />;

export const LogoIcon = () => (
  <Link href="/dashboard" aria-label="Koro.ai home" className="relative z-20 inline-flex py-1">
    <KoroMark size={32} />
  </Link>
);
