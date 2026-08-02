'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Brain,
  Target,
  Award,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { useSupabase } from '../../utils/supabase/provider';
import { AITutorInterface } from '@/components/lesson/AITutorInterface';
import { toast } from 'sonner';
import { Database } from '@/utils/supabase/database.types';
import { SubjectIcon } from '@/components/subjects/SubjectIcon';


type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

interface AITutorSession {
  sessionId: string;
  subject: Subject;
  topic: Topic | null;
  isActive: boolean;
  sessionData?: any; // Store the full session data from API
}

const ACTIVE_LOCAL_SESSION_KEY = 'koro-active-tutor-session';

export default function StudyPage() {
  const { currentSubject, userProgress } = useStore();
  const { supabase } = useSupabase();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [aiSession, setAiSession] = useState<AITutorSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);

  useEffect(() => {
    try {
      const savedSession = window.localStorage.getItem(ACTIVE_LOCAL_SESSION_KEY);
      if (savedSession) {
        setAiSession(JSON.parse(savedSession));
      }
    } catch (error) {
      console.warn('Could not restore the active local lesson:', error);
    }
  }, []);
  
  // Fetch subjects and topics from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error('Please log in to access study materials');
          return;
        }
        
        // Fetch subjects for the current user
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        
        if (subjectsError) throw subjectsError;
        
        if (subjectsData && subjectsData.length > 0) {
          setSubjects(subjectsData);
          
          // Set the first subject as selected if currentSubject is not set
          const targetSubject = subjectsData.find(s => s.id === currentSubject) || subjectsData[0];
          setSelectedSubject(targetSubject);
          
          // Fetch topics for the selected subject
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', targetSubject.id)
            .order('created_at', { ascending: true });
          
          if (topicsError) throw topicsError;
          
          if (topicsData) {
            setTopics(topicsData);
          }
        } else {
          // No subjects found - user needs to add subjects manually
          console.log('No subjects found. User needs to add subjects through the dashboard.');
          setSubjects([]);
          setTopics([]);
          setSelectedSubject(null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load study materials');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [supabase, currentSubject]);

  // Fetch topics when subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchTopicsForSubject(selectedSubject.id);
    }
  }, [selectedSubject]);

  const fetchTopicsForSubject = async (subjectId: string) => {
    try {
      const { data: topicsData, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Uploaded resources improve grounding, but they are not required.
      // The hosted AI can teach a starter topic from its general knowledge.
      setTopics(topicsData || []);
      setSelectedTopic(null); // Reset topic selection
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    }
  };

  const startAITutorSession = async (subjectId: string, topicId?: string) => {
    if (!selectedSubject) return;
    
    setIsStartingSession(true);
    
    try {
      const response = await fetch('/api/tutor/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId,
          topicId
        })
      });

      const sessionData = await response.json();
      if (!response.ok) {
        throw new Error(sessionData.error || 'Failed to start session');
      }
      
      const nextSession: AITutorSession = {
        sessionId: sessionData.sessionId,
        subject: selectedSubject,
        topic: selectedTopic,
        isActive: true,
        sessionData: sessionData // Store the full session data
      };
      setAiSession(nextSession);
      window.localStorage.setItem(ACTIVE_LOCAL_SESSION_KEY, JSON.stringify(nextSession));
      
      toast.success('AI Tutor session started!');
      
    } catch (error) {
      console.error('Error starting AI session:', error);
      toast.error('Failed to start AI tutor session');
    } finally {
      setIsStartingSession(false);
    }
  };

  const endAITutorSession = () => {
    setAiSession(null);
    setSelectedTopic(null);
    window.localStorage.removeItem(ACTIVE_LOCAL_SESSION_KEY);
    toast.success('Session ended successfully');
  };

  // If AI session is active, render the AI Tutor Interface
  if (aiSession) {
    return (
      <AITutorInterface
        sessionId={aiSession.sessionId}
        subject={aiSession.subject}
        topic={aiSession.topic}
        sessionData={aiSession.sessionData}
        onEndSession={endAITutorSession}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-background via-background to-background/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container min-h-full pb-12">
      {/* Header */}
      <div className="surface-panel relative mb-7 overflow-hidden rounded-[1.75rem] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-center justify-between">
          <div className="relative">
            <p className="section-kicker mb-2">Tutor workspace</p>
            <h1 className="text-gradient text-3xl font-bold tracking-tight md:text-4xl">Build your next lesson</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Choose a subject, narrow it to a topic if you want, and Koro will adapt the session to you.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="relative hidden border-primary/25 bg-primary/10 px-3 py-1.5 text-primary sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              Adaptive AI
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Selection */}
        <div className="space-y-6">
          <Card className="surface-panel rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Choose Your Subject
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {subjects.length > 0 ? (
                subjects.map((subject) => (
                  <motion.div
                    key={subject.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSubject(subject)}
                    className={cn(
                      "rounded-xl border p-4 cursor-pointer transition-all",
                      selectedSubject?.id === subject.id
                        ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/5"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <SubjectIcon subjectName={subject.name} />
                      <div className="flex-1">
                        <h3 className="font-semibold">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">{subject.description}</p>
                      </div>
                      {selectedSubject?.id === subject.id && (
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subjects found</p>
                  <p className="text-sm text-muted-foreground">Please visit the dashboard to add subjects first</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topic Selection */}
          {selectedSubject && (
            <Card className="surface-panel rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Select Topic (Optional)
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {topics.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <motion.div
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedTopic(null)}
                        className={cn(
                          "cursor-pointer rounded-xl border p-3 transition-all",
                          !selectedTopic
                            ? "border-primary/30 bg-primary/10"
                            : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-medium">All {selectedSubject.name} topics</h4>
                            <p className="mt-1 text-xs text-muted-foreground">Let Koro choose the best place to begin</p>
                          </div>
                          {!selectedTopic && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                      </motion.div>
                      {topics.map((topic) => (
                        <motion.div
                          key={topic.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedTopic(topic)}
                          className={cn(
                            "rounded-xl border p-3 cursor-pointer transition-all",
                            selectedTopic?.id === topic.id
                              ? "bg-primary/10 border-primary/30"
                              : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{topic.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {topic.completed && (
                                  <Badge variant="outline" className="text-xs border-green-500/50 text-green-400">
                                    Completed
                                  </Badge>
                                )}
                                {topic.progress > 0 && !topic.completed && (
                                  <Badge variant="outline" className="text-xs">
                                    {topic.progress}% Progress
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedTopic?.id === topic.id && (
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No topics available for this subject</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Tutor Options */}
        <div className="space-y-6">
          <Card className="surface-panel rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Tutor Sessions
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {selectedSubject && (
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.995 }}
                  className="relative cursor-pointer overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 p-6"
                  onClick={() => startAITutorSession(selectedSubject.id, selectedTopic?.id)}
                >
                  <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                  <div className="flex items-start gap-4">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="relative flex-1">
                      <p className="section-kicker mb-1">Ready to begin</p>
                      <h3 className="mb-2 text-lg font-semibold">
                        {selectedTopic ? 'Topic-focused session' : `${selectedSubject.name} discovery session`}
                      </h3>
                      <p className="mb-2 text-sm text-muted-foreground">
                        {selectedTopic ? (
                          <>Deep dive into <span className="font-medium text-foreground">{selectedTopic.name}</span></>
                        ) : (
                          <>Koro will assess you and choose the most useful <span className="font-medium text-foreground">{selectedSubject.name}</span> starting point.</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Targeted learning with assessments and interactive content
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Target className="w-3 h-3 mr-1" />
                          Focused
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Award className="w-3 h-3 mr-1" />
                          Assessments
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative mt-5 border-t border-white/10 pt-4">
                    <Button 
                      className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:from-blue-400 hover:to-violet-400"
                      disabled={isStartingSession}
                    >
                      {isStartingSession ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Starting Session...
                        </div>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2" />
                          Start AI Session
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {!selectedSubject && (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a subject to start AI tutoring</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Stats */}
          <Card className="surface-panel rounded-2xl border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Your Progress
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Sessions</span>
                <span className="font-semibold">{userProgress.totalSessions}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Streak</span>
                <span className="font-semibold text-orange-400">{userProgress.streak} days</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Experience Points</span>
                <span className="font-semibold text-blue-400">{userProgress.xp} XP</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Weekly Goal</span>
                <span className="font-semibold">
                  {userProgress.weeklyGoal.current}/{userProgress.weeklyGoal.target}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
