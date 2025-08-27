'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, Brain } from 'lucide-react';
import { AITutorInterface } from '@/components/lesson/AITutorInterface';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export default function AITutorPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params?.subjectId as string;
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSubjectAndTopics();
  }, [subjectId]);

  const fetchSubjectAndTopics = async () => {
    try {
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (subjectError) {
        console.error('Error fetching subject:', subjectError);
        toast.error('Failed to load subject');
        return;
      }

      setSubject(subjectData);

      // Fetch topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('name');

      if (topicsError) {
        console.error('Error fetching topics:', topicsError);
        toast.error('Failed to load topics');
        return;
      }

      setTopics(topicsData || []);
    } catch (error) {
      console.error('Error in fetchSubjectAndTopics:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const startAITutorSession = async (topicId?: string) => {
    setStartingSession(true);
    try {
      const response = await fetch('/api/tutor/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId,
          topicId: topicId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setSessionData(data); // Store the full session data
      
      if (topicId) {
        const topic = topics.find(t => t.id === topicId);
        setSelectedTopic(topic || null);
      }

      toast.success('AI Tutor session started!');
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start AI tutor session');
    } finally {
      setStartingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <h1 className="text-2xl font-bold text-muted-foreground">Subject not found</h1>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // If session is active, show the AI tutor interface
  if (sessionId) {
    return (
      <AITutorInterface
        sessionId={sessionId}
        subject={subject}
        topic={selectedTopic}
        sessionData={sessionData}
        onEndSession={() => {
          setSessionId(null);
          setSessionData(null);
          setSelectedTopic(null);
        }}
      />
    );
  }

  // Show topic selection or start general session
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard')}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl ${subject.gradient}`}>
            <span className="text-2xl">{subject.icon}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{subject.name}</h1>
            <p className="text-muted-foreground">AI-Powered Tutoring Session</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Start General Session - Hidden for now, keeping only topic-focused sessions */}
        {/* <Card className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">General AI Tutoring</h2>
              <p className="text-muted-foreground">
                Start a comprehensive tutoring session covering {subject.name}
              </p>
            </div>
          </div>
          <Button
            onClick={() => startAITutorSession()}
            disabled={startingSession}
            className="w-full"
          >
            {startingSession ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Starting Session...
              </>
            ) : (
              'Start AI Tutor Session'
            )}
          </Button>
        </Card> */}

        {/* Topic-Specific Sessions */}
        {topics.length > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Topic-Specific Tutoring
              </h2>
              <div className="grid gap-3">
                {topics.map((topic) => (
                  <Card key={topic.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{topic.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Focused tutoring on {topic.name}
                        </p>
                      </div>
                      <Button
                        onClick={() => startAITutorSession(topic.id)}
                        disabled={startingSession}
                        variant="outline"
                        size="sm"
                      >
                        {startingSession ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        ) : (
                          'Start'
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}