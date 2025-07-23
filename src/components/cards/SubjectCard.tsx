'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Clock, TrendingUp, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Subject } from '@/lib/store';

interface SubjectCardProps {
  subject: Subject;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

// Circular progress component
function CircularProgress({ value, size = 60, strokeWidth = 4 }: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--electric-blue))" />
            <stop offset="100%" stopColor="hsl(var(--violet))" />
          </linearGradient>
        </defs>
      </svg>
      {/* Progress text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{value}%</span>
      </div>
    </div>
  );
}

export function SubjectCard({ 
  subject, 
  onClick,
  className,
  delay = 0
}: SubjectCardProps) {
  const formatLastSession = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return 'Over a week ago';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl p-6",
        "glass border border-white/10",
        "tilt-3d cursor-pointer group",
        "hover:shadow-2xl hover:shadow-primary/20",
        "transition-all duration-300 ease-out",
        "bg-gradient-to-br from-card/50 to-card/30",
        "hover:from-card/70 hover:to-card/50",
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header with icon and progress */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon with pulsing effect */}
          <motion.div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-secondary/20",
              "group-hover:from-primary/30 group-hover:to-secondary/30",
              "transition-all duration-300"
            )}
            whileHover={{ rotate: 5 }}
          >
            <span className="text-2xl filter drop-shadow-sm">{subject.icon}</span>
          </motion.div>
          
          {/* Circular progress */}
          <CircularProgress value={subject.progress} />
        </div>
        
        {/* Subject name */}
        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
          {subject.name}
        </h3>
        
        {/* Stats */}
        <div className="flex-1 space-y-3">
          {/* Topics progress */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{subject.completedTopics}/{subject.totalTopics} topics</span>
          </div>
          
          {/* Next topic */}
          {subject.nextTopic && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium truncate">
                Next: {subject.nextTopic}
              </span>
            </div>
          )}
          
          {/* Last session */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatLastSession(subject.lastSession)}</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <Progress 
            value={subject.progress} 
            className="h-2 bg-muted/20" 
          />
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0
            }}
            animate={{
              y: '-10%',
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}