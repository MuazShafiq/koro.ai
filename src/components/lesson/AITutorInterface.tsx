'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Volume2, 
  Send, 
  ArrowLeft, 
  Loader2,
  MessageCircle,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { Blackboard } from './Blackboard';
import { AudioWaveform } from './AudioWaveform';
import { ChatMessage } from './ChatMessage';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  gradient: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface AssessmentQuestion {
  question: string;
  purpose: string;
}

interface AITutorInterfaceProps {
  sessionId: string;
  subject: Subject;
  topic: Topic | null;
  onEndSession: () => void;
}

export function AITutorInterface({ 
  sessionId, 
  subject, 
  topic, 
  onEndSession 
}: AITutorInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'assessment' | 'delivery' | 'interaction'>('assessment');
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<string[]>([]);
  const [blackboardContent, setBlackboardContent] = useState('');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    initializeSession();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentAudio) {
      currentAudio.playbackRate = playbackSpeed[0];
    }
  }, [playbackSpeed, currentAudio]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeSession = async () => {
    try {
      // Get session data to check current phase
      const response = await fetch(`/api/tutor/session/${sessionId}`);
      if (response.ok) {
        const sessionData = await response.json();
        
        if (sessionData.assessmentQuestions) {
          setAssessmentQuestions(sessionData.assessmentQuestions);
          setCurrentPhase('assessment');
          
          // Add welcome message
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: `Welcome to your ${subject.name} tutoring session${topic ? ` on ${topic.name}` : ''}! Let's start with a few questions to understand your current knowledge level.`,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
          
          // Add first assessment question
          if (sessionData.assessmentQuestions.length > 0) {
            const firstQuestion: Message = {
              id: (Date.now() + 1).toString(),
              type: 'ai',
              content: sessionData.assessmentQuestions[0].question,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, firstQuestion]);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      toast.error('Failed to initialize session');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      if (currentPhase === 'assessment') {
        await handleAssessmentResponse(inputValue.trim());
      } else {
        await handleInteraction(inputValue.trim());
      }
    } catch (error) {
      console.error('Error handling message:', error);
      toast.error('Failed to process message');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleAssessmentResponse = async (answer: string) => {
    const newAnswers = [...assessmentAnswers, answer];
    setAssessmentAnswers(newAnswers);

    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      const nextQuestion: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: assessmentQuestions[nextIndex].question,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, nextQuestion]);
    } else {
      // All questions answered, submit assessment
      await submitAssessment(newAnswers);
    }
  };

  const submitAssessment = async (answers: string[]) => {
    try {
      const assessmentData = assessmentQuestions.map((q, index) => ({
        question: q.question,
        answer: answers[index] || ''
      }));

      const response = await fetch('/api/tutor/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          answers: assessmentData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      const result = await response.json();
      
      // Add AI response about assessment
      const assessmentComplete: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `Great! I've analyzed your responses. You show ${result.evaluation.understanding_level} understanding. Let's begin the lesson tailored to your level.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assessmentComplete]);
      
      // Move to delivery phase
      setCurrentPhase('delivery');
      
      // Start delivering first chunk
      setTimeout(() => {
        deliverNextChunk(0);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    }
  };

  const deliverNextChunk = async (chunkIndex: number) => {
    try {
      const response = await fetch('/api/tutor/deliver-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          chunkIndex
        })
      });

      if (!response.ok) {
        throw new Error('Failed to deliver chunk');
      }

      const chunk = await response.json();
      
      // Update blackboard with lesson content
      setBlackboardContent(chunk.content);
      
      // Add lesson content as message
      const lessonMessage: Message = {
        id: chunk.chunkId,
        type: 'ai',
        content: chunk.content,
        timestamp: new Date(),
        audioUrl: chunk.audioUrl
      };
      setMessages(prev => [...prev, lessonMessage]);
      
      // Auto-play audio if available
      if (chunk.audioUrl) {
        playAudio(chunk.audioUrl);
      }
      
      setCurrentChunkIndex(chunkIndex);
      setCurrentPhase('interaction');
      
    } catch (error) {
      console.error('Error delivering chunk:', error);
      toast.error('Failed to deliver lesson content');
    }
  };

  const handleInteraction = async (question: string) => {
    try {
      const response = await fetch('/api/tutor/handle-interaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          question,
          chunkId: messages[messages.length - 2]?.id // Previous AI message ID
        })
      });

      if (!response.ok) {
        throw new Error('Failed to handle interaction');
      }

      const result = await response.json();
      
      const aiResponse: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: result.answer,
        timestamp: new Date(),
        audioUrl: result.audioUrl
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // Auto-play response audio if available
      if (result.audioUrl) {
        playAudio(result.audioUrl);
      }
      
    } catch (error) {
      console.error('Error handling interaction:', error);
      toast.error('Failed to process question');
    }
  };

  const playAudio = (audioUrl: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackSpeed[0];
    
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    };
    
    setCurrentAudio(audio);
    audioRef.current = audio;
    audio.play();
  };

  const togglePlayPause = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEndSession}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`p-2 rounded-lg ${subject.gradient}`}>
            <span className="text-lg">{subject.icon}</span>
          </div>
          <div>
            <h1 className="font-semibold">{subject.name}</h1>
            {topic && (
              <p className="text-sm text-muted-foreground">{topic.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground capitalize">
            {currentPhase} Phase
          </span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Blackboard */}
        <div className="flex-1 p-4">
          <Blackboard content={blackboardContent} />
        </div>

        {/* Right Panel */}
        <div className="w-96 border-l flex flex-col">
          {/* Audio Waveform */}
          <div className="p-4 border-b">
            <AudioWaveform 
              audioRef={audioRef}
              isPlaying={isPlaying}
            />
            
            {/* Audio Controls */}
            <div className="flex items-center justify-between mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlayPause}
                disabled={!currentAudio}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex items-center space-x-2 flex-1 mx-3">
                <Volume2 className="h-4 w-4" />
                <Slider
                  value={playbackSpeed}
                  onValueChange={setPlaybackSpeed}
                  max={2}
                  min={0.5}
                  step={0.25}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8">
                  {playbackSpeed[0]}x
                </span>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onPlayAudio={playAudio}
                  />
                ))}
                
                {isTyping && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Brain className="h-4 w-4" />
                    <span className="text-sm">AI is thinking...</span>
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    currentPhase === 'assessment'
                      ? 'Type your answer...'
                      : 'Ask a question or continue...'
                  }
                  disabled={isLoading}
                  maxLength={500}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {inputValue.length}/500
                </span>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}