'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Volume2,
  Settings,
  BookOpen,
  Brain,
  Target,
  Clock,
  Award,
  Maximize2,
  Minimize2,
  RotateCcw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import VoiceAssistant from '@/components/voice/VoiceAssistant';
import InteractiveWhiteboard from '@/components/whiteboard/InteractiveWhiteboard';

interface StudyTopic {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
  completed: boolean;
}

interface StudySession {
  id: string;
  subjectId: string;
  topicId: string;
  startTime: Date;
  duration: number;
  progress: number;
  notes: string;
  achievements: string[];
}

const mockTopics: StudyTopic[] = [
  {
    id: '1',
    title: 'Introduction to Algebra',
    description: 'Learn the basics of algebraic expressions and equations',
    duration: 45,
    difficulty: 'beginner',
    concepts: ['Variables', 'Expressions', 'Equations', 'Solving for x'],
    completed: false,
  },
  {
    id: '2',
    title: 'Quadratic Equations',
    description: 'Master quadratic equations and their solutions',
    duration: 60,
    difficulty: 'intermediate',
    concepts: ['Standard form', 'Factoring', 'Quadratic formula', 'Graphing'],
    completed: false,
  },
  {
    id: '3',
    title: 'Systems of Equations',
    description: 'Solve systems using substitution and elimination',
    duration: 50,
    difficulty: 'intermediate',
    concepts: ['Substitution', 'Elimination', 'Graphing method', 'Applications'],
    completed: false,
  },
];

export default function StudyPage() {
  const { currentSubject, userProgress, setUserProgress } = useStore();
  const [currentTopic, setCurrentTopic] = useState<StudyTopic>(mockTopics[0]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isStudying, setIsStudying] = useState(false);
  const [studyTime, setStudyTime] = useState(0);
  const [sessionProgress, setSessionProgress] = useState(0);
  const [isWhiteboardExpanded, setIsWhiteboardExpanded] = useState(false);
  const [studyNotes, setStudyNotes] = useState('');
  const [completedConcepts, setCompletedConcepts] = useState<string[]>([]);

  // Timer for study session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isStudying && session) {
      interval = setInterval(() => {
        setStudyTime(prev => {
          const newTime = prev + 1;
          const progress = Math.min((newTime / (currentTopic.duration * 60)) * 100, 100);
          setSessionProgress(progress);
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStudying, session, currentTopic.duration]);

  const startStudySession = () => {
    const newSession: StudySession = {
      id: Date.now().toString(),
      subjectId: currentSubject?.id || '1',
      topicId: currentTopic.id,
      startTime: new Date(),
      duration: 0,
      progress: 0,
      notes: '',
      achievements: [],
    };
    
    setSession(newSession);
    setIsStudying(true);
    setStudyTime(0);
    setSessionProgress(0);
  };

  const pauseStudySession = () => {
    setIsStudying(false);
  };

  const resumeStudySession = () => {
    setIsStudying(true);
  };

  const endStudySession = () => {
    if (session) {
      const updatedSession = {
        ...session,
        duration: studyTime,
        progress: sessionProgress,
        notes: studyNotes,
      };
      
      // Update user progress
      setUserProgress({
        ...userProgress,
        totalStudyTime: userProgress.totalStudyTime + studyTime,
        sessionsCompleted: userProgress.sessionsCompleted + 1,
        currentStreak: userProgress.currentStreak + (sessionProgress >= 80 ? 1 : 0),
      });
      
      setIsStudying(false);
      setSession(null);
      
      // Mark topic as completed if progress >= 80%
      if (sessionProgress >= 80) {
        setCurrentTopic(prev => ({ ...prev, completed: true }));
      }
    }
  };

  const toggleConcept = (concept: string) => {
    setCompletedConcepts(prev => 
      prev.includes(concept)
        ? prev.filter(c => c !== concept)
        : [...prev, concept]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400';
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400';
      case 'advanced': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Study Session</h1>
            <p className="text-muted-foreground">Focus, learn, and achieve your goals</p>
          </div>
          
          <div className="flex items-center gap-4">
            {session && (
              <div className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-white/20">
                <Clock className="w-4 h-4 text-electric-blue" />
                <span className="font-mono text-lg font-semibold">
                  {formatTime(studyTime)}
                </span>
              </div>
            )}
            
            <Button variant="ghost" size="sm" className="glass border-white/20">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Study Area */}
        <div className="xl:col-span-2 space-y-6">
          {/* Topic Overview */}
          <Card className="glass border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-electric-blue to-violet flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>{currentTopic.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{currentTopic.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(currentTopic.difficulty)}>
                    {currentTopic.difficulty}
                  </Badge>
                  <Badge variant="outline" className="border-white/20">
                    {currentTopic.duration} min
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Progress Bar */}
              {session && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Session Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(sessionProgress)}%
                    </span>
                  </div>
                  <Progress value={sessionProgress} className="h-2" />
                </div>
              )}
              
              {/* Concepts */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Key Concepts</h3>
                <div className="grid grid-cols-2 gap-2">
                  {currentTopic.concepts.map((concept) => (
                    <motion.div
                      key={concept}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleConcept(concept)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        completedConcepts.includes(concept)
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : "glass border-white/20 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 transition-all",
                          completedConcepts.includes(concept)
                            ? "bg-green-500 border-green-500"
                            : "border-white/40"
                        )} />
                        <span className="text-sm font-medium">{concept}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Study Controls */}
              <div className="flex items-center justify-center gap-4">
                {!session ? (
                  <Button
                    onClick={startStudySession}
                    size="lg"
                    className="bg-gradient-to-r from-electric-blue to-violet hover:from-electric-blue/80 hover:to-violet/80"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Study Session
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={isStudying ? pauseStudySession : resumeStudySession}
                      size="lg"
                      variant="outline"
                      className="glass border-white/20"
                    >
                      {isStudying ? (
                        <><Pause className="w-5 h-5 mr-2" />Pause</>
                      ) : (
                        <><Play className="w-5 h-5 mr-2" />Resume</>
                      )}
                    </Button>
                    
                    <Button
                      onClick={endStudySession}
                      size="lg"
                      variant="destructive"
                      className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      End Session
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interactive Whiteboard */}
          <Card className="glass border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Interactive Whiteboard
                </CardTitle>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWhiteboardExpanded(!isWhiteboardExpanded)}
                  className="glass border-white/20"
                >
                  {isWhiteboardExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <InteractiveWhiteboard 
                className={cn(
                  "transition-all duration-300",
                  isWhiteboardExpanded ? "h-[600px]" : "h-[400px]"
                )}
                enablePhysics={currentTopic.difficulty === 'advanced'}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Voice Assistant */}
          <VoiceAssistant className="h-fit" />
          
          {/* Study Stats */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Session Stats
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Concepts Mastered</span>
                <span className="font-semibold">
                  {completedConcepts.length}/{currentTopic.concepts.length}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus Score</span>
                <span className="font-semibold text-green-400">
                  {session ? Math.round(sessionProgress) : 0}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Time Remaining</span>
                <span className="font-semibold">
                  {session ? formatTime(Math.max(0, (currentTopic.duration * 60) - studyTime)) : formatTime(currentTopic.duration * 60)}
                </span>
              </div>
              
              {session && sessionProgress >= 80 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 text-center"
                >
                  <Award className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-400">Great Progress!</p>
                  <p className="text-xs text-green-400/80">You&apos;re mastering this topic</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start glass border-white/20">
                <Save className="w-4 h-4 mr-2" />
                Save Progress
              </Button>
              
              <Button variant="ghost" size="sm" className="w-full justify-start glass border-white/20">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Session
              </Button>
              
              <Button variant="ghost" size="sm" className="w-full justify-start glass border-white/20">
                <SkipForward className="w-4 h-4 mr-2" />
                Next Topic
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}