'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

interface AudioWaveformProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

export function AudioWaveform({ audioRef, isPlaying }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Re-initialize audio context whenever audioRef.current changes
  useEffect(() => {
    if (audioRef.current) {
      initializeAudioContext();
    }
  }, [audioRef.current]);

  useEffect(() => {
    if (isPlaying && analyser && dataArray) {
      startAnimation();
    } else {
      stopAnimation();
      if (!isPlaying) {
        drawStaticWaveform();
      }
    }

    return () => stopAnimation();
  }, [isPlaying, analyser, dataArray]);

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const initializeAudioContext = async () => {
    try {
      // Clean up previous audio context if it exists
      if (audioContext) {
        await audioContext.close();
      }
      
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyserNode = context.createAnalyser();
      
      analyserNode.fftSize = 256;
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      if (audioRef.current) {
        try {
          // Disconnect previous source if it exists
          if (sourceRef.current) {
            sourceRef.current.disconnect();
          }
          
          const source = context.createMediaElementSource(audioRef.current);
          source.connect(analyserNode);
          analyserNode.connect(context.destination);
          
          sourceRef.current = source;
          setAudioContext(context);
          setAnalyser(analyserNode);
          setDataArray(dataArray);
          setIsInitialized(true);
          
          // Draw initial static waveform
          drawStaticWaveform();
        } catch (sourceError) {
          console.warn('Could not create media element source:', sourceError);
          // Still set up the context for potential future use
          setAudioContext(context);
          setAnalyser(analyserNode);
          setDataArray(dataArray);
          setIsInitialized(true);
          drawStaticWaveform();
        }
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
      // Fallback to static waveform
      drawStaticWaveform();
    }
  };

  const startAnimation = () => {
    if (!analyser || !dataArray) return;
    
    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      drawWaveform(dataArray);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const drawWaveform = (frequencyData: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#10b981'); // emerald-500
    gradient.addColorStop(0.5, '#06d6a0'); // custom teal
    gradient.addColorStop(1, '#3b82f6'); // blue-500
    
    ctx.fillStyle = gradient;
    
    const barWidth = width / frequencyData.length;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const barHeight = (frequencyData[i] / 255) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;
      
      // Add some smoothing and minimum height
      const smoothedHeight = Math.max(barHeight, 4);
      
      ctx.fillRect(x, height - smoothedHeight, barWidth - 1, smoothedHeight);
    }
  };

  const drawStaticWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#374151'); // gray-700
    gradient.addColorStop(0.5, '#4b5563'); // gray-600
    gradient.addColorStop(1, '#6b7280'); // gray-500
    
    ctx.fillStyle = gradient;
    
    // Draw static bars with random heights
    const numBars = 64;
    const barWidth = width / numBars;
    
    for (let i = 0; i < numBars; i++) {
      // Create a wave-like pattern
      const waveHeight = Math.sin(i * 0.2) * 0.3 + 0.4;
      const randomVariation = Math.random() * 0.3;
      const barHeight = (waveHeight + randomVariation) * height * 0.6;
      
      const x = i * barWidth;
      const y = height - barHeight;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      if (!isPlaying) {
        drawStaticWaveform();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isPlaying]);

  return (
    <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Audio Visualization
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isPlaying 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-slate-400'
            }`}></div>
            <span className="text-xs text-slate-500">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-16 rounded-lg bg-slate-100 dark:bg-slate-800"
            style={{ width: '100%', height: '64px' }}
          />
          
          {/* Overlay effects */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent via-transparent to-white/10 pointer-events-none"></div>
          
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-xs text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
                Waiting for audio...
              </div>
            </div>
          )}
        </div>
        
        {/* Frequency bands indicator */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Low</span>
          <span>Mid</span>
          <span>High</span>
        </div>
      </div>
    </Card>
  );
}