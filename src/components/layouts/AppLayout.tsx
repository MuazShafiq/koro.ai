"use client";

import { usePathname } from "next/navigation";
import { KoroSidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  
  // Check if current page is an auth page (login/signup)
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  
  // For auth pages, render without sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background relative">
        {children}
      </div>
    );
  }
  
  // For regular pages, render with sidebar
  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-background w-full flex-1 mx-auto overflow-hidden",
      "h-screen relative"
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
