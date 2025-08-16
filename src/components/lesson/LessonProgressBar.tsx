import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonProgressBarProps {
  sessionId: string;
  className?: string;
}

interface ProgressData {
  progress_percentage: number;
  total_concepts: number;
  delivered_concepts: number;
  pending_concepts: number;
  equations_count: number;
  resource_sections_covered: number;
  avg_engagement_score: number;
}

export function LessonProgressBar({ sessionId, className }: LessonProgressBarProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/tutor/progress/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setProgressData(data);
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchProgress, 10000);
    
    return () => clearInterval(interval);
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-24 h-2 bg-muted rounded-full animate-pulse" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!progressData) {
    return null;
  }

  const progressPercentage = Math.round(progressData.progress_percentage || 0);
  const conceptsDelivered = progressData.delivered_concepts || 0;
  const totalConcepts = progressData.total_concepts || 0;

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Progress Bar */}
      <div className="flex items-center space-x-2">
        <div className="w-20">
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[2rem]">
          {progressPercentage}%
        </span>
      </div>

      {/* Concepts Counter */}
      <div className="flex items-center space-x-1">
        <Target className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {conceptsDelivered}/{totalConcepts}
        </span>
      </div>

      {/* Engagement Badge */}
      {progressData.avg_engagement_score > 0 && (
        <Badge 
          variant="outline" 
          className="text-xs px-1.5 py-0.5 h-5"
        >
          <BookOpen className="h-2.5 w-2.5 mr-1" />
          {Math.round(progressData.avg_engagement_score * 100)}%
        </Badge>
      )}
    </div>
  );
}

export default LessonProgressBar;