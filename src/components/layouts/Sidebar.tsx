"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  BookOpen,
  BarChart3,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Mic,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

interface SidebarProps {
  className?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Overview & Progress"
  },
  {
    name: "Study",
    href: "/study",
    icon: BookOpen,
    description: "Learning Materials"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Performance Insights"
  },
  {
    name: "Voice Assistant",
    href: "/voice",
    icon: Mic,
    description: "AI Learning Companion"
  },
  {
    name: "Goals",
    href: "/goals",
    icon: Target,
    description: "Learning Objectives"
  },
  {
    name: "Achievements",
    href: "/achievements",
    icon: Trophy,
    description: "Badges & Rewards"
  },
];

const bottomNavigation = [
  {
    name: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function KoroSidebar({ className }: SidebarProps) {
  const { sidebarExpanded, setSidebarExpanded, userProgress } = useStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.div
      animate={{
        width: sidebarExpanded ? 320 : 80,
      }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        "relative flex h-screen flex-col",
        "glass border-r border-white/10",
        "bg-gradient-to-b from-card/80 to-card/60",
        "backdrop-blur-xl",
        className
      )}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 opacity-50" />
      
      {/* Header */}
      <div className="relative z-10 flex h-20 items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center gap-3"
            >
              <motion.div 
                className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Zap className="h-5 w-5 text-primary-foreground" />
              </motion.div>
              <div>
                <span className="font-bold text-xl text-foreground">Koro.ai</span>
                <p className="text-xs text-muted-foreground">AI Learning Platform</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarExpanded(!sidebarExpanded)}
          className="h-10 w-10 rounded-xl glass border border-white/10 text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-300"
        >
          <motion.div
            animate={{ rotate: sidebarExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {sidebarExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </motion.div>
        </Button>
      </div>

      {/* User Progress Summary */}
      {sidebarExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-4 mb-6 p-4 rounded-xl glass border border-white/10 bg-gradient-to-br from-primary/10 to-secondary/10"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Weekly Goal</span>
            <span className="text-xs text-muted-foreground">{userProgress.weeklyGoal.current}/{userProgress.weeklyGoal.target}h</span>
          </div>
          <div className="w-full bg-muted/20 rounded-full h-2">
            <motion.div
              className="h-2 bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(userProgress.weeklyGoal.current / userProgress.weeklyGoal.target) * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-2 py-2">
          {navigation.map((item, index) => {
            const Icon = item.icon;
            const isHovered = hoveredItem === item.name;
            
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.02,
                    x: 4,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  onHoverStart={() => setHoveredItem(item.name)}
                  onHoverEnd={() => setHoveredItem(null)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    "text-muted-foreground hover:text-foreground",
                    "transition-all duration-300 ease-out",
                    "group cursor-pointer overflow-hidden",
                    isHovered && "glass border border-white/10 bg-gradient-to-r from-primary/10 to-secondary/10"
                  )}
                >
                  {/* Hover background */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: isHovered ? 1 : 0,
                      scale: isHovered ? 1 : 0.8
                    }}
                    transition={{ duration: 0.2 }}
                  />
                  
                  {/* Icon */}
                  <motion.div
                    className="relative z-10 p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"
                    whileHover={{ rotate: 5 }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  </motion.div>
                  
                  {/* Text */}
                  <AnimatePresence mode="wait">
                    {sidebarExpanded && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 flex-1"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                          {item.description}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Glow effect */}
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.5 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="relative z-10 border-t border-white/10 p-4 space-y-2">
        {bottomNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium",
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-primary/10 transition-all duration-300",
                  "group cursor-pointer"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {sidebarExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="truncate"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-white/10 p-4">
        <AnimatePresence mode="wait">
          {sidebarExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-muted-foreground space-y-1"
            >
              <p className="font-medium">© 2024 Koro.ai</p>
              <p className="text-muted-foreground/60">Version 2.0.0 Beta</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0
            }}
            animate={{
              y: '-10%',
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Export for backward compatibility
export const Logo = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">K</span>
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        Koro.ai
      </motion.span>
    </Link>
  );
};

export const LogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">K</span>
      </div>
    </Link>
  );
};