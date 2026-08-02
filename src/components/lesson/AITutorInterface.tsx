'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Volume2, 
  Send, 
  ArrowLeft, 
  Loader2,
  MessageCircle,
  Brain,
  Gauge,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Blackboard, BlackboardEntry, BlackboardItem } from './Blackboard';
import { AudioWaveform } from './AudioWaveform';
import { ChatMessage } from './ChatMessage';
import { isLocalMode } from '@/lib/local-mode';
import { useSupabase } from '@/utils/supabase/provider';
import { uniqueAssessmentQuestions } from '@/lib/tutor-text';
import { generateDeterministicBlackboard } from '@/lib/blackboard-content';

let fallbackMessageSequence = 0;

function createMessageId(kind: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${kind}-${crypto.randomUUID()}`;
  }
  fallbackMessageSequence += 1;
  return `${kind}-${Date.now()}-${fallbackMessageSequence}`;
}

function assessmentProgressKey(sessionId: string): string {
  return `koro-assessment-progress-${sessionId}`;
}

function splitTutorMessage(text: string, maxLength = 360): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const sentenceUnits = normalized
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(part => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const parts: string[] = [];
  let current = '';

  const append = (unit: string) => {
    let remaining = unit;
    while (remaining.length > maxLength) {
      const breakAt = remaining.lastIndexOf(' ', maxLength);
      const safeBreak = breakAt > maxLength * 0.55 ? breakAt : maxLength;
      const piece = remaining.slice(0, safeBreak).trim();
      if (current) {
        parts.push(current);
        current = '';
      }
      if (piece) parts.push(piece);
      remaining = remaining.slice(safeBreak).trim();
    }

    if (!remaining) return;
    const combined = current ? `${current} ${remaining}` : remaining;
    if (combined.length > maxLength) {
      if (current) parts.push(current);
      current = remaining;
    } else {
      current = combined;
    }
  };

  sentenceUnits.forEach(append);
  if (current) parts.push(current);
  return parts.length > 0 ? parts : [normalized];
}

function assignBlackboardItemsToMessages(
  messages: Message[],
  items: BlackboardItem[],
): BlackboardItem[][] {
  const assignments = messages.map(() => [] as BlackboardItem[]);
  if (messages.length === 0) return assignments;

  const ignoredWords = new Set([
    'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'that', 'the',
    'their', 'then', 'this', 'was', 'were', 'when', 'where', 'which', 'with',
  ]);

  const meaningfulWords = (value: string) => new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9Δ=+\-*\/^\s]/g, ' ')
      .split(/\s+/)
      .filter(word => (
        (word.length > 2 && !ignoredWords.has(word)) || /[=+\-*\/^]/.test(word)
      )),
  );
  const messageWords = messages.map(message => meaningfulWords(message.content));
  const maxItemsPerMessage = Math.max(1, Math.ceil(items.length / messages.length));

  items.forEach((item, itemIndex) => {
    const itemWords = meaningfulWords(
      [item.label, item.content, item.description, ...(item.steps || [])]
        .filter(Boolean)
        .join(' '),
    );
    const scoredMessages = messageWords.map((words, messageIndex) => {
      let score = 0;
      itemWords.forEach(word => {
        if (words.has(word)) score += /[=+\-*\/^]/.test(word) ? 3 : 1;
      });
      return { messageIndex, score };
    }).sort((left, right) => right.score - left.score);
    const bestAvailable = scoredMessages.find(
      candidate => assignments[candidate.messageIndex].length < maxItemsPerMessage,
    ) || scoredMessages[0];
    let bestIndex = bestAvailable?.messageIndex || 0;
    const bestScore = bestAvailable?.score || 0;

    if (bestScore === 0) {
      bestIndex = Math.min(
        messages.length - 1,
        Math.floor((itemIndex / Math.max(1, items.length)) * messages.length),
      );
    }
    assignments[bestIndex].push(item);
  });

  return assignments;
}

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

interface QueuedSpeech {
  text: string;
  onComplete?: () => void;
}

interface AssessmentQuestion {
  question: string;
  purpose: string;
  audioUrl?: string;
}

interface SessionData {
  sessionId: string;
  subject: { id: string; name: string } | string;
  topic: { id: string; name: string } | string | null;
  lessonOverview: {
    title?: string;
    description?: string;
    estimatedDuration?: number;
    difficulty?: string;
  } | string;
  assessmentQuestions: AssessmentQuestion[];
  estimatedDuration: number;
  welcomeAudioUrl?: string;
  currentPhase?: 'assessment' | 'delivery' | 'interaction' | 'completed';
  currentChunkIndex?: number;
  deliveredChunkIndexes?: number[];
  status?: 'active' | 'completed';
  aiProvider?: 'ollama' | 'deterministic';
  aiModel?: string | null;
  groundedInLocalResources?: boolean;
  resourceTitles?: string[];
  lessonChunks?: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;
}

interface AITutorInterfaceProps {
  sessionId: string;
  subject: Subject;
  topic: Topic | null;
  sessionData?: SessionData;
  onEndSession: () => void;
}

export function AITutorInterface({ 
  sessionId, 
  subject, 
  topic, 
  sessionData,
  onEndSession 
}: AITutorInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'assessment' | 'delivery' | 'interaction' | 'completed'>('assessment');
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<string[]>([]);
  const firstQuestionAddedRef = useRef(false);
  const [blackboardEntries, setBlackboardEntries] = useState<BlackboardEntry[]>([]);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState([0.85]);
  const [playbackSpeed, setPlaybackSpeed] = useState([1]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(sessionData?.lessonChunks?.length || 0);
  const [aiProvider, setAIProvider] = useState<'ollama' | 'deterministic'>(
    sessionData?.aiProvider || 'deterministic',
  );
  const [aiModel, setAIModel] = useState<string | null>(sessionData?.aiModel || null);
  const [resourceTitles, setResourceTitles] = useState<string[]>(
    sessionData?.resourceTitles || [],
  );
  const [isTyping, setIsTyping] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const { supabase } = useSupabase();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speechPlaybackRef = useRef<{
    text: string;
    charIndex: number;
    startIndex: number;
    startedAt: number;
    rate: number;
    onComplete?: () => void;
  } | null>(null);
  const speechQueueRef = useRef<QueuedSpeech[]>([]);
  const speechGenerationPendingRef = useRef(false);
  const speechGenerationIdRef = useRef(0);
  const generatedSpeechCacheRef = useRef<Map<string, string>>(new Map());
  const synchronizedAudioHandlersRef = useRef<Map<string, {
    onComplete: () => void;
    onProgress: (currentTime: number, duration: number) => void;
  }>>(new Map());
  const controlRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequentialRevealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoSpokenMessageIdRef = useRef<string | null>(null);
  const suppressedAutoSpeechIdsRef = useRef<Set<string>>(new Set());
  const initializedSessionIdRef = useRef<string | null>(null);
  const sendInFlightRef = useRef(false);
  const audioUnlockInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const localMode = isLocalMode();

  useEffect(() => {
    if (initializedSessionIdRef.current === sessionId) return;
    initializedSessionIdRef.current = sessionId;
    void initializeSession();
  }, [sessionId]);

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToBottom);
    return () => cancelAnimationFrame(frame);
  }, [messages]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const selectBestFreeVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const scoreVoice = (voice: SpeechSynthesisVoice) => {
        const name = voice.name.toLowerCase();
        const languageScore = /^en([-_]|$)/i.test(voice.lang) ? 40 : 0;
        const naturalScore = /natural|neural|enhanced|premium/.test(name) ? 120 : 0;
        const providerScore = /google|microsoft|apple/.test(name) ? 35 : 0;
        const tutorToneScore = /aria|jenny|sonia|samantha|serena|female/.test(name) ? 20 : 0;
        const roboticPenalty = /espeak|festival|compact/.test(name) ? -100 : 0;
        return languageScore + naturalScore + providerScore + tutorToneScore + roboticPenalty;
      };

      preferredVoiceRef.current = voices
        .filter(voice => /^en([-_]|$)/i.test(voice.lang))
        .sort((left, right) => scoreVoice(right) - scoreVoice(left))[0] || null;
    };

    selectBestFreeVoice();
    window.speechSynthesis.addEventListener('voiceschanged', selectBestFreeVoice);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', selectBestFreeVoice);
    };
  }, []);

  useEffect(() => {
    if (currentAudio) {
      currentAudio.playbackRate = playbackSpeed[0];
      currentAudio.volume = volume[0];
      return;
    }

    const activeSpeech = speechPlaybackRef.current;
    if (
      !activeSpeech ||
      typeof window === 'undefined' ||
      !window.speechSynthesis.speaking
    ) {
      return;
    }

    if (controlRestartTimerRef.current) {
      clearTimeout(controlRestartTimerRef.current);
    }

    controlRestartTimerRef.current = setTimeout(() => {
      const playback = speechPlaybackRef.current;
      if (!playback) return;

      const elapsedSeconds = Math.max(0, (performance.now() - playback.startedAt) / 1000);
      const estimatedIndex = playback.startIndex + Math.floor(elapsedSeconds * 14 * playback.rate);
      const resumeAt = Math.max(0, playback.charIndex, estimatedIndex);
      speechRef.current = null;
      speechPlaybackRef.current = null;
      window.speechSynthesis.cancel();
      speakWithBrowser(playback.text, false, resumeAt, playback.onComplete);
    }, 60);

    return () => {
      if (controlRestartTimerRef.current) {
        clearTimeout(controlRestartTimerRef.current);
      }
    };
  }, [playbackSpeed, volume, currentAudio]);

  useEffect(() => {
    if (teardownTimerRef.current) {
      clearTimeout(teardownTimerRef.current);
      teardownTimerRef.current = null;
    }
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      teardownTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          stopPlayback(false);
        }
      }, 0);
    };
  }, []);

  const stopPlayback = (updateState = true) => {
    if (controlRestartTimerRef.current) {
      clearTimeout(controlRestartTimerRef.current);
      controlRestartTimerRef.current = null;
    }

    sequentialRevealTimersRef.current.forEach(clearTimeout);
    sequentialRevealTimersRef.current = [];

    const activeAudio = audioRef.current;
    if (activeAudio) {
      activeAudio.onplay = null;
      activeAudio.onplaying = null;
      activeAudio.onwaiting = null;
      activeAudio.onpause = null;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.ontimeupdate = null;
      activeAudio.onloadedmetadata = null;
      activeAudio.pause();
      activeAudio.currentTime = 0;
      audioRef.current = null;
    }

    speechGenerationIdRef.current += 1;
    speechGenerationPendingRef.current = false;
    synchronizedAudioHandlersRef.current.clear();
    suppressedAutoSpeechIdsRef.current.clear();
    speechQueueRef.current = [];
    speechRef.current = null;
    speechPlaybackRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (updateState) {
      setCurrentAudio(null);
      setIsPlaying(false);
      setShowAudioPrompt(false);
    }
  };

  const handleEndSession = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    stopPlayback();
    onEndSession();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  };

  const enableAudioPlayback = async (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (audioUnlockInFlightRef.current) return;
    audioUnlockInFlightRef.current = true;

    try {
      const pendingAudio = audioRef.current;
      // Keep generated cross-origin media on the native HTMLAudioElement path.
      // Routing it through Web Audio can produce silence when CORS headers do
      // not allow an analyser node to consume the response.
      if (pendingAudio?.paused) await pendingAudio.play();
      setUserHasInteracted(true);
      setShowAudioPrompt(false);
      toast.success('Audio enabled');
    } catch (error) {
      console.error('Failed to enable audio playback:', error);
      setShowAudioPrompt(true);
      toast.error('Audio is still blocked. Click Enable Audio again.');
    } finally {
      audioUnlockInFlightRef.current = false;
    }
  };

  const initializeSession = async () => {
    try {
      // Use sessionData prop if available, otherwise fetch from API
      let sessionInfo = sessionData;
      
      if (!sessionInfo || localMode) {
        const response = await fetch(`/api/tutor/session/${sessionId}`);
        if (response.ok) {
          sessionInfo = await response.json();
        }
      }

      if (!isMountedRef.current) return;
      
      if (sessionInfo && sessionInfo.assessmentQuestions) {
        const normalizedAssessmentQuestions = uniqueAssessmentQuestions(
          sessionInfo.assessmentQuestions,
        );
        let restoredAnswers: string[] = [];
        let restoredQuestionIndex = 0;
        try {
          const savedProgress = window.localStorage.getItem(
            assessmentProgressKey(sessionId),
          );
          if (savedProgress) {
            const parsed = JSON.parse(savedProgress) as {
              answers?: string[];
              questionIndex?: number;
            };
            restoredAnswers = Array.isArray(parsed.answers) ? parsed.answers : [];
            restoredQuestionIndex = Math.max(
              0,
              Math.min(
                Number(parsed.questionIndex) || 0,
                Math.max(0, normalizedAssessmentQuestions.length - 1),
              ),
            );
          }
        } catch {
          window.localStorage.removeItem(assessmentProgressKey(sessionId));
        }
        setAssessmentQuestions(normalizedAssessmentQuestions);
        setCurrentQuestionIndex(restoredQuestionIndex);
        setAssessmentAnswers(restoredAnswers);
        setTotalChunks(sessionInfo.lessonChunks?.length || 0);
        setAIProvider(sessionInfo.aiProvider || 'deterministic');
        setAIModel(sessionInfo.aiModel || null);
        setResourceTitles(sessionInfo.resourceTitles || []);
        const restoredPhase = sessionInfo.currentPhase || 'assessment';
        const restoredChunkIndex = sessionInfo.currentChunkIndex || 0;
        setCurrentChunkIndex(restoredChunkIndex);

        if (restoredPhase !== 'assessment') {
          setCurrentPhase(restoredPhase);
          const deliveredIndexes = sessionInfo.deliveredChunkIndexes || [];
          const restoredMessages: Message[] = [
            {
              id: `resume-${sessionId}`,
              type: 'ai',
              content: restoredPhase === 'completed'
                ? `Welcome back. You completed this ${topic?.name || subject.name} lesson.`
                : `Welcome back. Your lesson progress has been restored at section ${restoredChunkIndex + 1}.`,
              timestamp: new Date(),
            },
            ...(sessionInfo.lessonChunks || [])
              .filter((_, index) => deliveredIndexes.includes(index))
              .flatMap((chunk, chunkIndex) =>
                splitTutorMessage(chunk.content).map((content, partIndex) => ({
                  id: `restored-${chunk.id}-${chunkIndex}-part-${partIndex}`,
                  type: 'ai' as const,
                  content,
                  timestamp: new Date(),
                })),
              ),
          ];
          setMessages(restoredMessages);

          const restoredEntries: BlackboardEntry[] = [];
          for (const [index, chunk] of (sessionInfo.lessonChunks || []).entries()) {
            if (!deliveredIndexes.includes(index)) continue;
            const blackboardData = await generateBlackboardContent(chunk.content);
            restoredEntries.push({
              id: `restored-entry-${chunk.id}`,
              timestamp: new Date(),
              items: blackboardData.blackboard?.length
                ? blackboardData.blackboard
                : generateDeterministicBlackboard(chunk.content).blackboard,
            });
          }
          setBlackboardEntries(restoredEntries);
          return;
        }

        stopPlayback();
        setCurrentPhase('assessment');
        firstQuestionAddedRef.current = false;

        const welcomeMessage: Message = {
          id: `welcome-${sessionId}`,
          type: 'ai',
          content: `Welcome to your ${subject.name} tutoring session${topic ? ` on ${topic.name}` : ''}! Let's start with a few questions to understand your current knowledge level.`,
          timestamp: new Date(),
        };
        lastAutoSpokenMessageIdRef.current = welcomeMessage.id;
        setMessages([welcomeMessage]);

        const addFirstAssessmentQuestion = () => {
          if (
            !isMountedRef.current ||
            firstQuestionAddedRef.current ||
            !sessionInfo ||
            normalizedAssessmentQuestions.length === 0
          ) {
            return;
          }

          firstQuestionAddedRef.current = true;
          const question = normalizedAssessmentQuestions[restoredQuestionIndex];
          const firstQuestion: Message = {
            id: `assessment-${sessionId}-${restoredQuestionIndex}`,
            type: 'ai',
            content: question.question,
            timestamp: new Date(),
            audioUrl: question.audioUrl,
          };
          setMessages((previous) => (
            previous.some((message) => message.id === firstQuestion.id)
              ? previous
              : [...previous, firstQuestion]
          ));

          if (question.audioUrl) {
            void playAudio(question.audioUrl);
          } else {
            lastAutoSpokenMessageIdRef.current = firstQuestion.id;
            queueSpeech(question.question);
          }
        };

        if (sessionInfo.welcomeAudioUrl) {
          void playAudio(sessionInfo.welcomeAudioUrl, addFirstAssessmentQuestion);
        } else if (typeof window !== 'undefined') {
          queueSpeech(welcomeMessage.content, addFirstAssessmentQuestion);
        } else {
          addFirstAssessmentQuestion();
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
      toast.error('Failed to initialize session');
    }
  };

  const handleSendMessage = async () => {
    if (
      !inputValue.trim() ||
      isLoading ||
      currentPhase === 'delivery' ||
      sendInFlightRef.current
    ) return;
    sendInFlightRef.current = true;

    const userMessage: Message = {
      id: createMessageId('user'),
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
      } else if (
        currentPhase === 'interaction' &&
        /^(continue|next|go on|keep going)\b/i.test(inputValue.trim())
      ) {
        await advanceLesson();
      } else if (currentPhase === 'completed') {
        return;
      } else {
        await handleInteraction(inputValue.trim());
      }
    } catch (error) {
      console.error('Error handling message:', error);
      toast.error('Failed to process message');
    } finally {
      sendInFlightRef.current = false;
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
      window.localStorage.setItem(
        assessmentProgressKey(sessionId),
        JSON.stringify({ answers: newAnswers, questionIndex: nextIndex }),
      );
      
      const nextQuestion: Message = {
        id: `assessment-${sessionId}-${nextIndex}`,
        type: 'ai',
        content: assessmentQuestions[nextIndex].question,
        timestamp: new Date(),
        audioUrl: assessmentQuestions[nextIndex].audioUrl
      };
      setMessages(prev => (
        prev.some(message => message.id === nextQuestion.id)
          ? prev
          : [...prev, nextQuestion]
      ));
      
      // Auto-play next question audio
      if (assessmentQuestions[nextIndex].audioUrl) {
        void playAudio(assessmentQuestions[nextIndex].audioUrl!);
      }
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
      window.localStorage.removeItem(assessmentProgressKey(sessionId));
      
      // Add AI response about assessment without audio initially
      const assessmentComplete: Message = {
        id: createMessageId('assessment-complete'),
        type: 'ai',
        content: `Great! I've analyzed your responses. You show ${result.evaluation.understanding_level} understanding. Let's begin the lesson tailored to your level.`,
        timestamp: new Date()
      };
      lastAutoSpokenMessageIdRef.current = assessmentComplete.id;
      setMessages(prev => [...prev, assessmentComplete]);
      
      // Move to delivery phase
      setCurrentPhase('delivery');
      const assessmentAudioFinished = new Promise<void>(resolve => {
        queueSpeech(assessmentComplete.content, resolve);
      });
      // Prepare the first lesson section while the assessment wrap-up is
      // speaking, then present it the instant both are ready.
      void deliverNextChunk(0, assessmentAudioFinished);
      
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    }
  };

  const generateBlackboardContent = async (script: string) => {
    try {
      const response = await fetch('/api/blackboard/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ script })
      });

      if (!response.ok) {
        return generateDeterministicBlackboard(script);
      }

      const blackboardData = await response.json();
      return blackboardData;
    } catch (error) {
      console.warn('Using local blackboard fallback:', error);
      return generateDeterministicBlackboard(script);
    }
  };

  function streamTutorContent(
    tutorMessages: Message[],
    blackboardItems: BlackboardItem[],
    spokenText: string,
    audioUrl?: string,
    onComplete?: () => void,
  ) {
    sequentialRevealTimersRef.current.forEach(clearTimeout);
    sequentialRevealTimersRef.current = [];

    if (tutorMessages.length === 0) {
      onComplete?.();
      return;
    }

    tutorMessages.forEach(message => suppressedAutoSpeechIdsRef.current.add(message.id));

    const itemAssignments = assignBlackboardItemsToMessages(tutorMessages, blackboardItems);
    const totalCharacters = tutorMessages.reduce(
      (total, message) => total + Math.max(1, message.content.length),
      0,
    );
    let traversedCharacters = 0;
    const revealThresholds = tutorMessages.map(message => {
      const threshold = traversedCharacters / totalCharacters;
      traversedCharacters += Math.max(1, message.content.length);
      return threshold;
    });
    let revealedThrough = -1;

    const revealThroughProgress = (progress: number) => {
      const boundedProgress = Math.min(1, Math.max(0, progress));
      let targetIndex = revealedThrough;
      while (
        targetIndex + 1 < tutorMessages.length &&
        revealThresholds[targetIndex + 1] <= boundedProgress + 0.001
      ) {
        targetIndex += 1;
      }
      if (boundedProgress >= 1) targetIndex = tutorMessages.length - 1;
      if (targetIndex <= revealedThrough) return;

      const newlyRevealed = tutorMessages.slice(revealedThrough + 1, targetIndex + 1);
      setMessages(previous => {
        const existingIds = new Set(previous.map(message => message.id));
        const unseen = newlyRevealed.filter(message => !existingIds.has(message.id));
        return unseen.length > 0 ? [...previous, ...unseen] : previous;
      });

      const newBoardEntries = newlyRevealed.flatMap((message, offset) => {
        const messageIndex = revealedThrough + 1 + offset;
        const assignedItems = itemAssignments[messageIndex] || [];
        return assignedItems.length > 0 ? [{
          id: `${message.id}-blackboard`,
          timestamp: new Date(),
          items: assignedItems,
        }] : [];
      });
      if (newBoardEntries.length > 0) {
        setBlackboardEntries(previous => {
          const existingIds = new Set(previous.map(entry => entry.id));
          const unseen = newBoardEntries.filter(entry => !existingIds.has(entry.id));
          return unseen.length > 0 ? [...previous, ...unseen] : previous;
        });
      }

      revealedThrough = targetIndex;
    };

    // Show the first teaching beat immediately. Everything else follows audio time.
    revealThroughProgress(0);

    const finishStream = () => {
      sequentialRevealTimersRef.current.forEach(clearTimeout);
      sequentialRevealTimersRef.current = [];
      revealThroughProgress(1);
      onComplete?.();
    };

    const playSynchronizedAudio = (resolvedAudioUrl: string) => {
      const synchronizedHandlers = {
        onComplete: finishStream,
        onProgress: (currentTime: number, duration: number) => {
          revealThroughProgress(currentTime / duration);
        },
      };
      synchronizedAudioHandlersRef.current.set(resolvedAudioUrl, synchronizedHandlers);
      void playAudio(
        resolvedAudioUrl,
        synchronizedHandlers.onComplete,
        synchronizedHandlers.onProgress,
      );
    };

    const startBrowserFallback = () => {
      const estimatedDurationMs = Math.max(2500, (spokenText.length / 14) * 1000);
      revealThresholds.slice(1).forEach(threshold => {
        const timer = setTimeout(
          () => revealThroughProgress(threshold),
          estimatedDurationMs * threshold,
        );
        sequentialRevealTimersRef.current.push(timer);
      });
      queueSpeech(spokenText, finishStream);
    };

    if (audioUrl) {
      playSynchronizedAudio(audioUrl);
      return;
    }

    // Existing chunks created during a provider outage may have no stored
    // audio. Repair them on demand with the current TTS provider before using
    // browser speech as a last resort.
    void fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text: spokenText, contentType: 'lesson' }),
    })
      .then(async response => {
        if (!response.ok) throw new Error(`TTS repair failed (${response.status})`);
        return response.json();
      })
      .then(result => {
        if (!isMountedRef.current || typeof result.audioUrl !== 'string') {
          throw new Error('TTS repair returned no audio URL');
        }
        playSynchronizedAudio(result.audioUrl);
      })
      .catch(error => {
        console.warn('Using browser speech after TTS repair failed:', error);
        startBrowserFallback();
      });
  }

  const deliverNextChunk = async (
    chunkIndex: number,
    waitUntil?: Promise<void>,
  ) => {
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
      
      // Generate intelligent blackboard content using GPT-4o
      const blackboardData = await generateBlackboardContent(chunk.content);
      
      // Check for duplicates before adding new blackboard entry
      const newItems = blackboardData.blackboard?.length
        ? blackboardData.blackboard
        : generateDeterministicBlackboard(chunk.content).blackboard;
      
      // Keep spoken lesson sections readable instead of rendering one wall of text.
      const lessonMessageBaseId = chunk.chunkId || createMessageId('lesson-chunk');
      const lessonMessages: Message[] = splitTutorMessage(chunk.content).map((content, index) => ({
        id: `${lessonMessageBaseId}-part-${index}`,
        type: 'ai',
        content,
        timestamp: new Date(),
        audioUrl: index === 0 ? chunk.audioUrl : undefined,
      }));
      if (lessonMessages.length > 0) {
        lastAutoSpokenMessageIdRef.current = lessonMessages[lessonMessages.length - 1].id;
      }

      if (waitUntil) await waitUntil;
      if (!isMountedRef.current) return;

      setCurrentChunkIndex(chunkIndex);
      setTotalChunks(chunk.totalChunks || totalChunks);
      setCurrentPhase('delivery');
      streamTutorContent(
        lessonMessages,
        newItems,
        chunk.content,
        chunk.audioUrl,
        () => setCurrentPhase('interaction'),
      );
      
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
      if (result.aiProvider) {
        setAIProvider(result.aiProvider);
        setAIModel(result.aiModel || null);
      }
      
      // Generate blackboard content for the AI response
      const blackboardData = await generateBlackboardContent(result.answer);
      
      // Check for duplicates before adding new blackboard entry for interaction response
      const newItems = blackboardData.blackboard?.length
        ? blackboardData.blackboard
        : generateDeterministicBlackboard(result.answer).blackboard;
      
      const responseId = createMessageId('ai-response');
      const aiResponses: Message[] = splitTutorMessage(result.answer).map((content, index) => ({
        id: `${responseId}-part-${index}`,
        type: 'ai',
        content,
        timestamp: new Date(),
        audioUrl: index === 0 ? result.audioUrl : undefined,
      }));
      if (aiResponses.length > 0) {
        lastAutoSpokenMessageIdRef.current = aiResponses[aiResponses.length - 1].id;
      }
      streamTutorContent(
        aiResponses,
        newItems,
        result.answer,
        result.audioUrl,
      );
      
    } catch (error) {
      console.error('Error handling interaction:', error);
      toast.error('Failed to process question');
    }
  };

  const playAudio = async (
    audioUrl: string,
    onComplete?: () => void,
    onProgress?: (currentTime: number, duration: number) => void,
  ) => {
    const synchronizedHandlers = synchronizedAudioHandlersRef.current.get(audioUrl);
    const completionHandler = onComplete || synchronizedHandlers?.onComplete;
    const progressHandler = onProgress || synchronizedHandlers?.onProgress;
    const previousAudio = audioRef.current;
    if (previousAudio) {
      previousAudio.onended = null;
      previousAudio.onerror = null;
      previousAudio.onplaying = null;
      previousAudio.onwaiting = null;
      previousAudio.ontimeupdate = null;
      previousAudio.onloadedmetadata = null;
      previousAudio.pause();
    }
    
    const audio = new Audio(audioUrl);
    audio.playbackRate = playbackSpeed[0];
    audio.volume = volume[0];
    audio.preservesPitch = true;

    const reportProgress = () => {
      if (!progressHandler || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      progressHandler(audio.currentTime, audio.duration);
    };
    
    // `play` fires as soon as playback is requested, before buffering is
    // complete. `playing` tracks the point at which audible media can advance.
    audio.onplay = null;
    audio.onplaying = () => setIsPlaying(true);
    audio.onwaiting = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);
    audio.onloadedmetadata = reportProgress;
    audio.ontimeupdate = reportProgress;
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      if (progressHandler && Number.isFinite(audio.duration)) {
        progressHandler(audio.duration, audio.duration);
      }
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentAudio(null);
      if (completionHandler) {
        completionHandler();
      } else {
        finishSpeechItem();
      }
    };
    
    audio.onerror = (error) => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
      toast.error('Failed to play audio');
      if (completionHandler) {
        completionHandler();
      } else {
        finishSpeechItem();
      }
    };
    
    setCurrentAudio(audio);
    audioRef.current = audio;
    
    try {
      await audio.play();
      setUserHasInteracted(true);
      setShowAudioPrompt(false);
    } catch (error) {
      console.warn('Audio auto-play blocked:', error);
      // Show prompt for user to enable audio
      setShowAudioPrompt(true);
    }
  };

  const syncCompletedTopicProgress = async () => {
    if (!localMode || !topic) return;

    try {
      await supabase
        .from('topics')
        .update({ completed: true, progress: 100 })
        .eq('id', topic.id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('total_sessions, xp, level')
        .eq('id', user.id)
        .single();

      if (profile) {
        const nextXp = (profile.xp || 0) + 100;
        await supabase
          .from('profiles')
          .update({
            total_sessions: (profile.total_sessions || 0) + 1,
            xp: nextXp,
            level: Math.max(profile.level || 1, Math.floor(nextXp / 500) + 1),
          })
          .eq('id', user.id);
      }

      await supabase.from('study_sessions').insert({
        user_id: user.id,
        subject_id: subject.id,
        topic_id: topic.id,
        duration_minutes: 30,
        session_type: 'study',
        completed: true,
        notes: `Completed local tutor session ${sessionId}`,
      });
      await supabase.rpc('update_daily_progress', {
        user_uuid: user.id,
        study_minutes: 30,
        session_completed: true,
        quiz_taken: false,
        xp_gained: 100,
      });
    } catch (error) {
      console.warn('Lesson completed, but local dashboard progress could not be updated:', error);
    }
  };

  const completeLesson = async () => {
    const response = await fetch('/api/tutor/validate-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to complete lesson');
    }

    if (!result.isReadyForCompletion) {
      const missing = result.missingRequirements?.join(', ') || 'Complete the remaining lesson sections';
      toast.error(missing);
      return;
    }

    setCurrentPhase('completed');
    const completionMessage: Message = {
      id: createMessageId('completed'),
      type: 'ai',
      content: `Lesson complete! You covered all ${result.progressSummary.totalConcepts} sections. Your progress has been saved, and you earned 100 XP.`,
      timestamp: new Date(),
    };
    setMessages((previous) => [...previous, completionMessage]);
    setBlackboardEntries((previous) => [
      ...previous,
      {
        id: createMessageId('blackboard-completion'),
        timestamp: new Date(),
        items: [{
          type: 'text',
          label: 'Lesson complete',
          content: `100% complete • ${result.progressSummary.totalConcepts} sections covered`,
        }],
      },
    ]);
    await syncCompletedTopicProgress();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('koro-active-tutor-session');
    }
    toast.success('Lesson completed and progress saved');
  };

  const advanceLesson = async () => {
    const nextChunkIndex = currentChunkIndex + 1;
    if (nextChunkIndex < totalChunks) {
      setCurrentPhase('delivery');
      await deliverNextChunk(nextChunkIndex);
    } else {
      await completeLesson();
    }
  };

  const handleAdvanceClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setIsTyping(true);
    try {
      await advanceLesson();
    } catch (error) {
      console.error('Error advancing lesson:', error);
      toast.error('Failed to advance the lesson');
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const finishSpeechItem = (onComplete?: () => void) => {
    onComplete?.();
    const nextMessage = speechQueueRef.current.shift();
    if (nextMessage) speakMessage(nextMessage.text, false, 0, nextMessage.onComplete);
  };

  function speakWithBrowser(
    text: string,
    interrupt = false,
    startIndex = 0,
    onComplete?: () => void,
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Audio is not available right now');
      finishSpeechItem(onComplete);
      return;
    }

    if (interrupt) {
      window.speechSynthesis.cancel();
    }

    const normalizedText = text.replace(/\$|\\Delta|\\/g, ' ');
    const boundedStartIndex = Math.min(Math.max(0, startIndex), normalizedText.length);
    const leadingWhitespace = normalizedText.slice(boundedStartIndex).match(/^\s*/)?.[0].length || 0;
    const spokenStartIndex = boundedStartIndex + leadingWhitespace;
    const remainingText = normalizedText.slice(spokenStartIndex);
    if (!remainingText) {
      finishSpeechItem(onComplete);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      remainingText,
    );
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
      utterance.lang = preferredVoiceRef.current.lang;
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = playbackSpeed[0];
    utterance.volume = volume[0];
    utterance.pitch = 1.02;
    utterance.onstart = () => {
      speechRef.current = utterance;
      speechPlaybackRef.current = {
        text: normalizedText,
        charIndex: spokenStartIndex,
        startIndex: spokenStartIndex,
        startedAt: performance.now(),
        rate: utterance.rate,
        onComplete,
      };
      setIsPlaying(true);
    };
    utterance.onboundary = (event) => {
      if (speechRef.current === utterance && speechPlaybackRef.current) {
        speechPlaybackRef.current.charIndex = spokenStartIndex + event.charIndex;
      }
    };
    utterance.onend = () => {
      if (speechRef.current !== utterance) return;
      speechRef.current = null;
      speechPlaybackRef.current = null;
      setIsPlaying(false);
      finishSpeechItem(onComplete);
    };
    utterance.onerror = (event) => {
      if (speechRef.current !== utterance) return;
      speechRef.current = null;
      speechPlaybackRef.current = null;
      setIsPlaying(false);
      if (event.error === 'not-allowed') {
        setShowAudioPrompt(true);
      } else if (event.error !== 'canceled' && event.error !== 'interrupted') {
        toast.error('Browser speech could not read this message');
      }
      finishSpeechItem(onComplete);
    };
    window.speechSynthesis.speak(utterance);
  }

  function speakMessage(
    text: string,
    interrupt = false,
    startIndex = 0,
    onComplete?: () => void,
  ): void {
    if (interrupt) {
      speechGenerationIdRef.current += 1;
      speechGenerationPendingRef.current = false;
      speechQueueRef.current = [];

      const activeAudio = audioRef.current;
      if (activeAudio) {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.pause();
        audioRef.current = null;
        setCurrentAudio(null);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRef.current = null;
      speechPlaybackRef.current = null;
      setIsPlaying(false);
    }

    // A browser utterance can only be resumed by the browser. Normal messages
    // use the same generated Cloudflare voice as lesson chunks.
    if (startIndex > 0) {
      speakWithBrowser(text, false, startIndex, onComplete);
      return;
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      finishSpeechItem(onComplete);
      return;
    }

    const cachedAudioUrl = generatedSpeechCacheRef.current.get(normalizedText);
    if (cachedAudioUrl) {
      void playAudio(cachedAudioUrl, () => finishSpeechItem(onComplete));
      return;
    }

    const generationId = ++speechGenerationIdRef.current;
    speechGenerationPendingRef.current = true;
    void fetch('/api/tts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text: normalizedText, contentType: 'lesson' }),
    })
      .then(async response => {
        if (!response.ok) throw new Error(`TTS request failed (${response.status})`);
        return response.json();
      })
      .then(result => {
        if (generationId !== speechGenerationIdRef.current || !isMountedRef.current) return;
        speechGenerationPendingRef.current = false;
        if (!result.audioUrl || typeof result.audioUrl !== 'string') {
          throw new Error('TTS response did not contain audio');
        }
        generatedSpeechCacheRef.current.set(normalizedText, result.audioUrl);
        void playAudio(result.audioUrl, () => finishSpeechItem(onComplete));
      })
      .catch(error => {
        if (generationId !== speechGenerationIdRef.current || !isMountedRef.current) return;
        speechGenerationPendingRef.current = false;
        console.warn('Using browser voice fallback:', error);
        speakWithBrowser(normalizedText, false, 0, onComplete);
      });
  }

  const queueSpeech = (text: string, onComplete?: () => void) => {
    if (
      speechGenerationPendingRef.current ||
      audioRef.current ||
      (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        (window.speechSynthesis.speaking || window.speechSynthesis.pending)
      )
    ) {
      speechQueueRef.current.push({ text, onComplete });
      return;
    }
    speakMessage(text, false, 0, onComplete);
  };

  const speakLatestMessage = () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (speechGenerationPendingRef.current) {
      speechGenerationIdRef.current += 1;
      speechGenerationPendingRef.current = false;
      setIsPlaying(false);
      return;
    }

    if (
      'speechSynthesis' in window &&
      (window.speechSynthesis.speaking || window.speechSynthesis.pending)
    ) {
      speechQueueRef.current = [];
      window.speechSynthesis.cancel();
      speechRef.current = null;
      speechPlaybackRef.current = null;
      setIsPlaying(false);
      return;
    }

    const latestTutorMessage = [...messages].reverse().find((message) => message.type === 'ai');
    if (latestTutorMessage) {
      speakMessage(latestTutorMessage.content, true);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const latestTutorMessage = [...messages].reverse().find((message) => message.type === 'ai');
    if (
      !latestTutorMessage ||
      latestTutorMessage.audioUrl ||
      suppressedAutoSpeechIdsRef.current.has(latestTutorMessage.id) ||
      lastAutoSpokenMessageIdRef.current === latestTutorMessage.id
    ) {
      return;
    }

    lastAutoSpokenMessageIdRef.current = latestTutorMessage.id;
    queueSpeech(latestTutorMessage.content);
  }, [messages]);

  const togglePlayPause = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
    } else {
      speakLatestMessage();
    }
  };

  const handleVolumeChange = (nextValue: number[]) => {
    const nextVolume = Math.min(1, Math.max(0, nextValue[0] ?? volume[0]));
    const activeAudio = audioRef.current;
    if (activeAudio) activeAudio.volume = nextVolume;
    setVolume([nextVolume]);
  };

  const handlePlaybackSpeedChange = (nextValue: number[]) => {
    const nextSpeed = Math.min(2, Math.max(0.5, nextValue[0] ?? playbackSpeed[0]));
    const activeAudio = audioRef.current;
    if (activeAudio) {
      activeAudio.playbackRate = nextSpeed;
      activeAudio.preservesPitch = true;
    }
    setPlaybackSpeed([nextSpeed]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isLastChunk = totalChunks > 0 && currentChunkIndex >= totalChunks - 1;

  return (
    <div 
      className="h-screen bg-background flex flex-col" 
      onClick={!userHasInteracted ? enableAudioPlayback : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndSession}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className={`p-2 rounded-lg ${subject.gradient}`}>
            <span className="text-lg">{subject.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-semibold">{subject.name}</h1>
                {topic && (
                  <p className="text-sm text-muted-foreground">{topic.name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {localMode && (
            <Badge
              variant="outline"
              title={aiProvider === 'ollama'
                ? `Generated locally with ${aiModel || 'Ollama'}`
                : 'Built-in fallback; start Ollama to enable the local model'}
              className={aiProvider === 'ollama'
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-amber-500/40 text-amber-400'}
            >
              {aiProvider === 'ollama' ? 'Local AI' : 'Fallback'}
            </Badge>
          )}
          {localMode && resourceTitles.length > 0 && (
            <Badge
              variant="outline"
              title={`Grounded in: ${resourceTitles.join(', ')}`}
              className="border-blue-500/40 text-blue-400"
            >
              {resourceTitles.length} PDF source{resourceTitles.length === 1 ? '' : 's'}
            </Badge>
          )}
          {currentPhase !== 'assessment' && totalChunks > 0 && (
            <span className="text-xs text-muted-foreground">
              {currentPhase === 'completed'
                ? `${totalChunks}/${totalChunks} sections`
                : `Section ${currentChunkIndex + 1}/${totalChunks}`}
            </span>
          )}
          <span className="text-sm text-muted-foreground capitalize">
            {currentPhase} Phase
          </span>
          <div className={`w-2 h-2 rounded-full ${
            currentPhase === 'completed' ? 'bg-blue-500' : 'bg-green-500 animate-pulse'
          }`}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Blackboard */}
        <div className="flex-1 p-4 overflow-hidden">
          <Blackboard entries={blackboardEntries} />
        </div>

        {/* Right Panel */}
        <div className="w-96 border-l flex flex-col h-full overflow-hidden">
          {/* Audio Waveform */}
          <div className="p-4 border-b flex-shrink-0">
            <AudioWaveform
              isPlaying={isPlaying}
              volume={volume[0]}
            />
            
            {/* Audio Controls */}
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-[2rem_1rem_3rem_1fr_2.5rem] items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayPause}
                  disabled={!currentAudio && messages.every((message) => message.type !== 'ai')}
                  title={!currentAudio ? 'Read or stop the latest tutor message' : 'Play or pause audio'}
                  className="h-8 w-8 p-0"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Volume2 className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">Volume</span>
                <Slider
                  value={volume}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.01}
                  aria-label="Lesson volume"
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground text-right">
                  {Math.round(volume[0] * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-[2rem_1rem_3rem_1fr_2.5rem] items-center gap-2">
                <span aria-hidden="true" />
                <Gauge className="h-4 w-4" />
                <span className="text-xs text-muted-foreground">Speed</span>
                <Slider
                  value={playbackSpeed}
                  onValueChange={handlePlaybackSpeedChange}
                  max={2}
                  min={0.5}
                  step={0.05}
                  aria-label="Playback speed"
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground text-right">
                  {Number(playbackSpeed[0].toFixed(2))}x
                </span>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="p-4 border-t flex-shrink-0">
              {currentPhase === 'completed' ? (
                <div className="space-y-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-7 w-7 text-blue-400" />
                  <div>
                    <p className="font-medium">Lesson complete</p>
                    <p className="text-xs text-muted-foreground">Progress saved • 100 XP earned</p>
                  </div>
                  <Button onClick={handleEndSession} className="w-full">
                    Back to study
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex space-x-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        currentPhase === 'assessment'
                          ? 'Type your answer...'
                          : currentPhase === 'delivery'
                            ? 'Lesson is being delivered...'
                          : 'Ask a question about this section...'
                      }
                      disabled={isLoading || currentPhase === 'delivery'}
                      maxLength={500}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || currentPhase === 'delivery' || !inputValue.trim()}
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

                  {currentPhase === 'interaction' && (
                    <Button
                      onClick={handleAdvanceClick}
                      disabled={isLoading}
                      variant={isLastChunk ? 'default' : 'outline'}
                      className="mt-3 w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isLastChunk ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <ChevronRight className="mr-2 h-4 w-4" />
                      )}
                      {isLastChunk ? 'Complete lesson' : 'Continue to next section'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Prompt Overlay */}
      {showAudioPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <Volume2 className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Enable Audio</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Click anywhere to enable audio playback for the lesson.
            </p>
            <Button 
              onClick={enableAudioPlayback}
              className="w-full"
            >
              Enable Audio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
