"use client";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";

interface SubjectCardProps {
  subject: string;
  icon: React.ReactNode;
  progress: number;
  nextTopic: string;
  href: string;
  gradient?: string;
}

export const SubjectCard = ({
  subject,
  icon,
  progress,
  nextTopic,
  href,
  gradient = "from-sky-400 to-blue-500",
}: SubjectCardProps) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "backdrop-blur-sm bg-white/70 dark:bg-neutral-900/70 border border-white/20 dark:border-neutral-700/50",
          "rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300",
          "space-y-3 group cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold group-hover:text-primary transition-colors">{subject}</div>
          <div className={cn(
            "p-2 rounded-full bg-gradient-to-r",
            gradient,
            "text-white shadow-sm group-hover:shadow-md transition-all duration-300"
          )}>
            {icon}
          </div>
        </div>
        <div className="border-t border-muted mt-2 pt-2">
          <Progress value={progress} className="h-2 bg-muted" />
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Next: {nextTopic}
        </div>
      </motion.div>
    </Link>
  );
};