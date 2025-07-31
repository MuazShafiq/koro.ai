'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Undo, 
  Redo, 
  Download, 
  Trash2,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DrawingTool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

interface WhiteboardProps {
  width?: number;
  height?: number;
  className?: string;
  enablePhysics?: boolean;
}

export const InteractiveWhiteboard: React.FC<WhiteboardProps> = ({
  width = 800,
  height = 600,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [showColorPalette, setShowColorPalette] = useState(false);

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#000000', '#ffffff', '#6b7280', '#f97316'
  ];

  const tools = [
    { id: 'pen' as DrawingTool, icon: Pen, label: 'Pen' },
    { id: 'eraser' as DrawingTool, icon: Eraser, label: 'Eraser' },
    { id: 'rectangle' as DrawingTool, icon: Square, label: 'Rectangle' },
    { id: 'circle' as DrawingTool, icon: CircleIcon, label: 'Circle' },
    { id: 'text' as DrawingTool, icon: Type, label: 'Text' }
  ];

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e);
    setIsDrawing(true);
    setLastX(x);
    setLastY(y);
  }, [getMousePos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getMousePos(e);

    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, strokeWidth * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    setLastX(x);
    setLastY(y);
  }, [isDrawing, tool, color, strokeWidth, lastX, lastY, getMousePos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col space-y-4', className)}
    >
      {/* Toolbar */}
      <Card className="glass border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Drawing Tools */}
            <div className="flex items-center space-x-2">
              {tools.map((toolItem) => {
                const Icon = toolItem.icon;
                return (
                  <Button
                    key={toolItem.id}
                    variant={tool === toolItem.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool(toolItem.id)}
                    className={cn(
                      'glass border-white/20',
                      tool === toolItem.id && 'bg-gradient-to-r from-electric-blue to-violet'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                );
              })}
            </div>

            {/* Color Palette */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColorPalette(!showColorPalette)}
                className="glass border-white/20"
              >
                <Palette className="w-4 h-4 mr-2" />
                <div 
                  className="w-4 h-4 rounded border border-white/20" 
                  style={{ backgroundColor: color }}
                />
              </Button>
              
              {showColorPalette && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full mt-2 p-2 glass border border-white/20 rounded-lg grid grid-cols-4 gap-2 z-10"
                >
                  {colors.map((c) => (
                    <button
                      key={c}
                      className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setColor(c);
                        setShowColorPalette(false);
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground w-6">{strokeWidth}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCanvas}
                className="glass border-white/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCanvas}
                className="glass border-white/20 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card className="glass border-0 overflow-hidden">
        <CardContent className="p-0">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="cursor-crosshair bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InteractiveWhiteboard;