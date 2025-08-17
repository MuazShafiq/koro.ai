'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

interface BentoGridItemProps {
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall';
  delay?: number;
}

const sizeClasses = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-1 row-span-2 md:col-span-2 md:row-span-1',
  large: 'col-span-2 row-span-2',
  wide: 'col-span-2 row-span-1',
  tall: 'col-span-1 row-span-2'
};

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-[280px]",
      className
    )}>
      {children}
    </div>
  );
}

export function BentoGridItem({ 
  children, 
  className, 
  size = 'medium',
  delay = 0 
}: BentoGridItemProps) {
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
      className={cn(
        sizeClasses[size],
        "group relative overflow-hidden rounded-xl",
        "glass border border-white/10",
        "tilt-3d cursor-pointer",
        "hover:shadow-2xl hover:shadow-primary/20",
        "transition-all duration-300 ease-out",
        className
      )}
    >
      {/* Gradient overlay for glassmorphism effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 h-full w-full p-4 md:p-6">
        {children}
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => {
          // Use deterministic values based on index to prevent hydration mismatch
          const positions = [25, 60, 85];
          const durations = [3, 4, 5];
          const delays = [0, 0.7, 1.4];
          
          return (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              initial={{ 
                x: positions[i] + '%',
                y: '100%',
                opacity: 0
              }}
              animate={{
                y: '-20%',
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: durations[i],
                repeat: Infinity,
                delay: delays[i],
                ease: 'easeOut'
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// Specialized Bento components for different content types
export function BentoSubjectCard({ children, className, ...props }: BentoGridItemProps) {
  return (
    <BentoGridItem 
      className={cn(
        "bg-gradient-to-br from-card/50 to-card/30",
        "hover:from-card/70 hover:to-card/50",
        className
      )}
      {...props}
    >
      {children}
    </BentoGridItem>
  );
}

export function BentoStatsCard({ children, className, ...props }: BentoGridItemProps) {
  return (
    <BentoGridItem 
      className={cn(
        "bg-gradient-to-br from-primary/10 to-secondary/10",
        "hover:from-primary/20 hover:to-secondary/20",
        className
      )}
      {...props}
    >
      {children}
    </BentoGridItem>
  );
}

export function BentoProgressCard({ children, className, ...props }: BentoGridItemProps) {
  return (
    <BentoGridItem 
      className={cn(
        "bg-gradient-to-br from-secondary/10 to-primary/10",
        "hover:from-secondary/20 hover:to-primary/20",
        className
      )}
      {...props}
    >
      {children}
    </BentoGridItem>
  );
}