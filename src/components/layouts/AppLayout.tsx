"use client";

import { usePathname } from "next/navigation";
import { KoroSidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  
  // Check if current page is an auth page (login/signup)
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isLandingPage) {
    return (
      <div className="app-background relative h-[100dvh] overflow-hidden bg-background">
        {children}
      </div>
    );
  }
  
  // For auth pages, render without sidebar
  if (isAuthPage) {
    return (
      <div className="app-background relative h-[100dvh] min-h-0 overflow-hidden bg-background">
        {children}
      </div>
    );
  }
  
  // For regular pages, render with sidebar
  return (
    <div className="app-background relative mx-auto flex h-[100dvh] min-h-0 w-full flex-1 flex-col overflow-hidden bg-background md:flex-row">
      <KoroSidebar className="order-2 md:order-1" />

      <div className="order-1 flex min-h-0 min-w-0 flex-1 overflow-hidden md:order-2">
        <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
