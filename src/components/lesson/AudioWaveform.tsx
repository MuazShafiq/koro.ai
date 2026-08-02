'use client';

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface AudioWaveformProps {
  isPlaying: boolean;
  volume?: number;
}

export function AudioWaveform({
  isPlaying,
  volume = 1,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const canvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return {
      canvas,
      context: canvas.getContext('2d'),
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
  };

  const drawBars = (values: number[], active: boolean) => {
    const metrics = canvasSize();
    if (!metrics?.context) return;

    const { context, width, height } = metrics;
    context.clearRect(0, 0, width, height);

    const gradient = context.createLinearGradient(0, 0, width, 0);
    if (active) {
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(0.5, '#22d3ee');
      gradient.addColorStop(1, '#3b82f6');
    } else {
      gradient.addColorStop(0, '#334155');
      gradient.addColorStop(0.5, '#475569');
      gradient.addColorStop(1, '#64748b');
    }
    context.fillStyle = gradient;

    const gap = 2;
    const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);
    values.forEach((value, index) => {
      const barHeight = Math.max(3, value * height * 0.88);
      const x = index * (barWidth + gap);
      const y = (height - barHeight) / 2;
      context.beginPath();
      context.roundRect(x, y, barWidth, barHeight, Math.min(barWidth / 2, 3));
      context.fill();
    });
  };

  const drawStatic = () => {
    const values = Array.from({ length: 44 }, (_, index) => {
      const envelope = 0.12 + Math.sin((index / 43) * Math.PI) * 0.1;
      return envelope + (index % 5) * 0.008;
    });
    drawBars(values, false);
  };

  const stopAnimation = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  useEffect(() => {
    stopAnimation();

    if (!isPlaying) {
      drawStatic();
      return;
    }

    const startedAt = performance.now();
    const animate = (timestamp: number) => {
      const time = (timestamp - startedAt) / 1000;
      const values = Array.from({ length: 44 }, (_, index) => {
        const lowPulse = Math.sin(time * 7.2 + index * 0.34);
        const voiceTexture = Math.sin(time * 13.7 - index * 0.21);
        const envelope = 0.46 + 0.34 * Math.sin(time * 3.1 + index * 0.08);
        const energy = 0.18 + Math.abs(lowPulse * 0.48 + voiceTexture * 0.22) * envelope;
        return Math.min(0.95, energy * volume);
      });
      drawBars(values, true);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return stopAnimation;
  }, [isPlaying, volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (!isPlaying) drawStatic();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isPlaying]);

  useEffect(() => {
    return stopAnimation;
  }, []);

  return (
    <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Audio Visualization
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-500">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          <canvas ref={canvasRef} className="block h-16 w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10" />
          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded bg-white/80 px-2 py-1 text-xs text-slate-400 dark:bg-slate-800/80">
                Waiting for audio...
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between text-xs text-slate-400">
          <span>Voice</span>
          <span>Activity</span>
          <span>Output</span>
        </div>
      </div>
    </Card>
  );
}
