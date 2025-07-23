'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Award, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceCardProps {
  title: string;
  value: string | number;
  change: number;
  period: string;
  icon?: React.ReactNode;
  className?: string;
  delay?: number;
  chartData?: number[];
  target?: number;
}

// Mini sparkline chart component
function SparklineChart({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className={cn("w-full h-8", className)}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.polyline
          fill="none"
          stroke="url(#sparkline-gradient)"
          strokeWidth="2"
          points={points}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Progress ring for targets
function ProgressRing({ value, target, size = 40 }: {
  value: number;
  target: number;
  size?: number;
}) {
  const percentage = Math.min((value / target) * 100, 100);
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}

export function PerformanceCard({
  title,
  value,
  change,
  period,
  icon,
  className,
  delay = 0,
  chartData,
  target
}: PerformanceCardProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  const getTrendIcon = () => {
    if (isNeutral) return <Minus className="w-4 h-4" />;
    return isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };
  
  const getTrendColor = () => {
    if (isNeutral) return "text-muted-foreground";
    return isPositive ? "text-emerald-500" : "text-red-500";
  };
  
  const getIconWithDefault = () => {
    if (icon) return icon;
    if (title.toLowerCase().includes('streak')) return <Target className="w-5 h-5" />;
    if (title.toLowerCase().includes('score')) return <Award className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
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
      className={cn(
        "relative overflow-hidden rounded-xl p-6",
        "glass border border-white/10",
        "hover:shadow-2xl hover:shadow-primary/10",
        "transition-all duration-300 ease-out",
        "bg-gradient-to-br from-card/50 to-card/30",
        "hover:from-card/70 hover:to-card/50",
        "group",
        className
      )}
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 text-primary group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300"
              whileHover={{ rotate: 5, scale: 1.1 }}
            >
              {getIconWithDefault()}
            </motion.div>
            <h3 className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
              {title}
            </h3>
          </div>
          
          {/* Target progress ring */}
          {target && typeof value === 'number' && (
            <ProgressRing value={value} target={target} />
          )}
        </div>
        
        {/* Value with animation */}
        <div className="mb-4">
          <motion.div 
            className="text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
          >
            {value}
          </motion.div>
        </div>
        
        {/* Sparkline chart */}
        {chartData && chartData.length > 0 && (
          <div className="mb-4">
            <SparklineChart data={chartData} />
          </div>
        )}
        
        {/* Change indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div 
              className={cn(
                "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                getTrendColor(),
                isPositive ? "bg-emerald-500/10" : isNeutral ? "bg-muted/10" : "bg-red-500/10"
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: delay + 0.4 }}
            >
              {getTrendIcon()}
              <span>
                {isNeutral ? '0' : `${isPositive ? '+' : ''}${change}`}%
              </span>
            </motion.div>
          </div>
          <span className="text-sm text-muted-foreground">
            {period}
          </span>
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(2)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%',
              y: '100%',
              opacity: 0
            }}
            animate={{
              y: '-10%',
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}