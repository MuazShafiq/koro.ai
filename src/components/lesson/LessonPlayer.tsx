'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  BookOpen, 
  Clock, 
  Target, 
  Lightbulb,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { LessonData } from '@/hooks/useLesson';
import { toast } from 'sonner';

interface LessonPlayerProps {
  lesson: LessonData;
  onComplete?: () => void;
  className?: string;
}

export function LessonPlayer({ lesson, onComplete, className = '' }: LessonPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setIsCompleted(true);
      onComplete?.();
      toast.success('Lesson completed!', {
        description: 'Great job! You\'ve finished this lesson.'
      });
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio');
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    setIsCompleted(false);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{lesson.title}</h2>
            <div className="flex items-center gap-4 text-blue-100">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{lesson.estimatedDuration} min</span>
              </div>
              {isCompleted && (
                <div className="flex items-center gap-1 text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>
          <BookOpen className="w-8 h-8 text-blue-200" />
        </div>
      </div>

      {/* Audio Player */}
      {lesson.audioUrl && (
        <div className="p-6 border-b border-gray-200">
          <audio ref={audioRef} src={lesson.audioUrl} preload="metadata" />
          
          {/* Controls */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            
            <button
              onClick={restart}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleMute}
              className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 mx-4">
              <div className="text-sm text-gray-500 mb-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showTranscript ? 'Hide' : 'Show'} Transcript
          </button>
        </div>
      )}

      {/* Learning Objectives */}
      {lesson.objectives.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Learning Objectives</h3>
          </div>
          <ul className="space-y-2">
            {lesson.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-gray-700">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Points */}
      {lesson.keyPoints.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Key Points</h3>
          </div>
          <div className="grid gap-2">
            {lesson.keyPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-gray-700">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesson Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Lesson Content</h3>
          {lesson.audioUrl && (
            <span className="text-sm text-gray-500">
              {showTranscript ? 'Audio transcript' : 'Full lesson text'}
            </span>
          )}
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="prose prose-gray max-w-none"
        >
          <div 
            className="text-gray-700 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }}
          />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Loading state component for lesson generation
 */
export function LessonPlayerSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Generating your lesson...</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-blue-500/30 rounded w-3/4" />
          <div className="h-3 bg-blue-500/20 rounded w-1/2" />
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}