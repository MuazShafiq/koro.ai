'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Play, 
  Settings, 
  Clock, 
  Volume2, 
  BookOpen,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLesson, LessonGenerationRequest } from '@/hooks/useLesson';
import { LessonPlayer, LessonPlayerSkeleton } from './LessonPlayer';
import { toast } from 'sonner';

interface LessonGeneratorProps {
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicName: string;
  className?: string;
}

export function LessonGenerator({
  subjectId,
  topicId,
  subjectName,
  topicName,
  className = ''
}: LessonGeneratorProps) {
  const { lesson, isGenerating, error, generateLesson, clearLesson } = useLesson();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [settings, setSettings] = useState({
    userLevel: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    duration: 30,
    generateAudio: true
  });

  const handleGenerateLesson = async () => {
    const request: LessonGenerationRequest = {
      subjectId,
      topicId,
      subjectName,
      topicName,
      userLevel: settings.userLevel,
      duration: settings.duration,
      generateAudio: settings.generateAudio
    };

    await generateLesson(request);
  };

  const handleLessonComplete = () => {
    toast.success('Lesson completed!', {
      description: 'Your progress has been saved.'
    });
  };

  if (lesson) {
    return (
      <div className={className}>
        <div className="mb-4">
          <button
            onClick={clearLesson}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Generate New Lesson
          </button>
        </div>
        <LessonPlayer lesson={lesson} onComplete={handleLessonComplete} />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className={className}>
        <LessonPlayerSkeleton />
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI-Led Tutoring</h2>
              <p className="text-purple-100 text-sm">Personalized lesson generation</p>
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4" />
              <span className="font-medium">{subjectName}</span>
            </div>
            <h3 className="text-lg font-semibold">{topicName}</h3>
          </div>
        </div>

        {/* Settings */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Quick Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Level
                </label>
                <select
                  value={settings.userLevel}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    userLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={settings.duration}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Narration
                </label>
                <div className="flex items-center h-10">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.generateAudio}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        generateAudio: e.target.checked
                      }))}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.generateAudio ? 'bg-blue-600' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        settings.generateAudio ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                    <span className="ml-3 text-sm text-gray-700">
                      {settings.generateAudio ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Settings className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-200 pt-6"
              >
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Lesson Customization</h4>
                  <div className="space-y-4 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5 text-purple-500" />
                      <div>
                        <p className="font-medium">AI-Powered Content</p>
                        <p>Lessons are generated using advanced AI based on your selected topic and available educational resources.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Volume2 className="w-4 h-4 mt-0.5 text-blue-500" />
                      <div>
                        <p className="font-medium">Audio Narration</p>
                        <p>High-quality text-to-speech conversion creates engaging audio lessons you can listen to anywhere.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 mt-0.5 text-green-500" />
                      <div>
                        <p className="font-medium">Adaptive Duration</p>
                        <p>Lesson content is tailored to fit your selected time frame while maintaining educational value.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerateLesson}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating Lesson...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Generate AI Lesson
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Info */}
            <div className="text-center text-sm text-gray-500">
              <p>Lesson generation typically takes 30-60 seconds</p>
              {settings.generateAudio && (
                <p className="mt-1">Audio narration adds an additional 15-30 seconds</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}