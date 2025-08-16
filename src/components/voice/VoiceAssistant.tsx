'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';

interface WaveformProps {
  isActive: boolean;
  amplitude: number;
}

const Waveform: React.FC<WaveformProps> = ({ isActive, amplitude }) => {
  const bars = Array.from({ length: 20 }, (_, i) => i);
  
  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {bars.map((bar) => {
        // Use deterministic values based on bar index and amplitude to prevent hydration mismatch
        const baseHeight = isActive 
          ? (bar % 3 + 1) * amplitude * 15 + 10
          : 4;
        const delay = bar * 0.1;
        const duration = 0.5 + (bar % 4) * 0.125; // Deterministic duration based on bar index
        
        return (
          <motion.div
            key={bar}
            className="bg-gradient-to-t from-electric-blue to-neon-cyan rounded-full"
            style={{
              width: '3px',
            }}
            animate={{
              height: isActive ? [baseHeight, baseHeight * 0.3, baseHeight] : 4,
            }}
            transition={{
              duration: duration,
              repeat: isActive ? Infinity : 0,
              delay: delay,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
};

interface VoiceAssistantProps {
  className?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ className }) => {
  const { voiceState, updateVoiceState } = useStore();
  const [amplitude, setAmplitude] = useState(0.5);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Simulate voice amplitude for demo
  useEffect(() => {
    if (voiceState.status === 'listening' || voiceState.status === 'responding') {
      const interval = setInterval(() => {
        setAmplitude(Math.random() * 0.8 + 0.2);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAmplitude(0.1);
    }
  }, [voiceState.status]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        // Here you would typically send the audio to your speech recognition service
        simulateTranscription();
      };
      
      mediaRecorderRef.current.start();
      updateVoiceState({ isRecording: true, status: 'listening' });
      
      // Analyze audio for waveform
      const analyzeAudio = () => {
        if (analyserRef.current && voiceState.status === 'listening') {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAmplitude(average / 255);
          animationFrameRef.current = requestAnimationFrame(analyzeAudio);
        }
      };
      analyzeAudio();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    updateVoiceState({ isRecording: false, status: 'processing' });
  };

  const simulateTranscription = () => {
    // Simulate speech recognition
    setTimeout(() => {
      const sampleQuestions = [
        "What is photosynthesis?",
        "Explain Newton's first law",
        "How do I solve quadratic equations?",
        "What is the capital of France?",
        "Tell me about the water cycle"
      ];
      const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
      setTranscript(randomQuestion);
      
      // Simulate AI response
      setTimeout(() => {
        updateVoiceState({ status: 'responding' });
        const responses = {
          "What is photosynthesis?": "Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen.",
          "Explain Newton's first law": "Newton's first law states that an object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.",
          "How do I solve quadratic equations?": "You can solve quadratic equations using the quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
          "What is the capital of France?": "The capital of France is Paris, known for its rich history, culture, and iconic landmarks like the Eiffel Tower.",
          "Tell me about the water cycle": "The water cycle involves evaporation, condensation, precipitation, and collection, continuously moving water through Earth's systems."
        };
        setResponse(responses[randomQuestion as keyof typeof responses] || "I'm here to help you learn! Ask me any question about your subjects.");
        
        // Simulate speech duration
        setTimeout(() => {
          updateVoiceState({ status: 'idle' });
        }, 3000);
      }, 1000);
    }, 2000);
  };

  const toggleListening = () => {
    if (voiceState.status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Card className={cn(
      "glass p-6 border-0 relative overflow-hidden",
      className
    )}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/10 via-violet/10 to-neon-pink/10" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-electric-blue to-violet flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Koro Assistant</h3>
              <p className="text-sm text-muted-foreground">
                {voiceState.status === 'listening' ? 'Listening...' :
                 voiceState.status === 'responding' ? 'Speaking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Waveform Visualization */}
        <div className="mb-6 p-4 rounded-lg bg-black/20 border border-white/10">
          <Waveform 
            isActive={voiceState.status === 'listening' || voiceState.status === 'responding'} 
            amplitude={amplitude}
          />
        </div>

        {/* Transcript and Response */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 rounded-lg bg-electric-blue/10 border border-electric-blue/20"
            >
              <p className="text-sm font-medium text-electric-blue mb-1">You asked:</p>
              <p className="text-sm text-foreground">{transcript}</p>
            </motion.div>
          )}
          
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-3 rounded-lg bg-violet/10 border border-violet/20"
            >
              <p className="text-sm font-medium text-violet mb-1">Koro says:</p>
              <p className="text-sm text-foreground">{response}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={toggleListening}
            size="lg"
            className={cn(
              "w-16 h-16 rounded-full transition-all duration-300",
              voiceState.status === 'listening'
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-gradient-to-r from-electric-blue to-violet hover:from-electric-blue/80 hover:to-violet/80"
            )}
          >
            {voiceState.status === 'listening' ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="glass border-white/20 hover:bg-white/10"
            disabled={voiceState.status === 'responding'}
          >
            {voiceState.status === 'responding' ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          {[
            "Explain this topic",
            "Quiz me",
            "Show examples",
            "Practice problems"
          ].map((action, index) => (
            <Button
              key={action}
              variant="ghost"
              size="sm"
              className="glass border-white/10 hover:bg-white/10 text-xs"
              onClick={() => {
                setTranscript(action);
                simulateTranscription();
              }}
            >
              {action}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default VoiceAssistant;