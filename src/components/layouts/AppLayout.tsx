"use client";

import { usePathname } from "next/navigation";
import { KoroSidebar } from "./Sidebar";
// import { ThemeToggle } from "@/components/ui/theme-toggle";
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
        {/* Theme toggle - hidden as we're defaulting to dark mode */}
        {/* <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
          <ThemeToggle />
        </div> */}
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
      
      {/* Theme toggle - hidden as we're defaulting to dark mode */}
      {/* <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
        <ThemeToggle />
      </div> */}
      
      <div className="flex flex-1">
        <div className="p-2 md:p-6 rounded-tl-2xl border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm flex flex-col gap-2 flex-1 w-full h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}