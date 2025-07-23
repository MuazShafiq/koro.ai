"use client";
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PerformanceCardProps {
  streak: number;
  learningTime: string;
  strength: string;
  href: string;
}

export const PerformanceCard = ({
  streak,
  learningTime,
  strength,
  href,
}: PerformanceCardProps) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30",
          "border border-border text-card-foreground rounded-2xl p-6 shadow-xl hover:shadow-2xl",
          "transition-all duration-300 group cursor-pointer"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-bold text-card-foreground">Your Progress</div>
          <BarChart2 className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-base font-medium">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-orange-500 dark:text-orange-300"
            >
              🔥
            </motion.span>
            <span>Streak: {streak} days</span>
          </div>
          <div className="text-sm text-muted-foreground">⏱️ Time this week: {learningTime}</div>
          <div className="text-sm text-muted-foreground">💪 Strongest in: {strength}</div>
        </div>
      </motion.div>
    </Link>
  );
};