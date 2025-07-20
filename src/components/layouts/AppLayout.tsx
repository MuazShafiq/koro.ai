"use client";

import { KoroSidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 w-full flex-1 mx-auto overflow-hidden",
      "h-screen"
    )}>
      <KoroSidebar />
      <div className="flex flex-1">
        <div className="p-2 md:p-6 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm flex flex-col gap-2 flex-1 w-full h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}