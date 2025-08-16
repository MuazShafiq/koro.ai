'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  BookOpen,
  Brain,
  Target,
  Clock,
  Award,
  ArrowRight,
  Sparkles,
  Users,
  MessageCircle,
  Zap
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


type Subject = Database['public']['Tables']['subjects']['Row'];
type Topic = Database['public']['Tables']['topics']['Row'];

interface AITutorSession {
  sessionId: string;
  subject: Subject;
  topic: Topic | null;
  isActive: boolean;
  sessionData?: any; // Store the full session data from API
}

interface StudyOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  features: string[];
  action: () => void;
}

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
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Filter topics to only show those with available resources
      const topicsWithResources = [];
      if (topicsData) {
        for (const topic of topicsData) {
          try {
            const { data: resources, error: resourceError } = await supabase
              .rpc('get_resources_by_topic', {
                subject_uuid: subjectId,
                topic_uuid: topic.id
              });
            
            // Only include topics that have resources
            if (!resourceError && resources && resources.length > 0) {
              topicsWithResources.push(topic);
            }
          } catch (resourceError) {
            console.warn(`Failed to check resources for topic ${topic.name}:`, resourceError);
          }
        }
      }
      
      setTopics(topicsWithResources);
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

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const sessionData = await response.json();
      
      setAiSession({
        sessionId: sessionData.sessionId,
        subject: selectedSubject,
        topic: selectedTopic,
        isActive: true,
        sessionData: sessionData // Store the full session data
      });
      
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">AI-Powered Study</h1>
            <p className="text-muted-foreground">Experience personalized learning with our AI tutor</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-500/50 text-green-400">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subject Selection */}
        <div className="space-y-6">
          <Card className="glass border-0">
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
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      selectedSubject?.id === subject.id
                        ? "bg-primary/20 border-primary/50"
                        : "glass border-white/20 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${subject.gradient} flex items-center justify-center`}>
                        <span className="text-lg">{subject.icon}</span>
                      </div>
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
            <Card className="glass border-0">
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
                      {topics.map((topic) => (
                        <motion.div
                          key={topic.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedTopic(topic)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all",
                            selectedTopic?.id === topic.id
                              ? "bg-blue-500/20 border-blue-500/50"
                              : "glass border-white/20 hover:bg-white/5"
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
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Tutor Sessions
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* General AI Tutoring - Hidden for now, keeping only topic-focused sessions */}
              {/* <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-6 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 cursor-pointer"
                onClick={() => selectedSubject && startAITutorSession(selectedSubject.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">General AI Tutoring</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Start a comprehensive learning session with our AI tutor
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        Interactive Chat
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Adaptive Learning
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        Personalized
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {selectedSubject && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      disabled={isStartingSession}
                    >
                      {isStartingSession ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Starting Session...
                        </div>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start AI Tutoring
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </motion.div> */}

              {/* Topic-Specific Tutoring */}
              {selectedTopic && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-6 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 cursor-pointer"
                  onClick={() => selectedSubject && startAITutorSession(selectedSubject.id, selectedTopic.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Topic-Focused Session</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Deep dive into: <span className="font-medium text-foreground">{selectedTopic.name}</span>
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
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
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
                          Start Topic Session
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
          <Card className="glass border-0">
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