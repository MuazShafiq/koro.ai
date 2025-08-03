'use client';

import { useEffect, useRef, useState, ReactElement } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface BlackboardProps {
  content: string;
}

export function Blackboard({ content }: BlackboardProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [processedContent, setProcessedContent] = useState<ReactElement[]>([]);

  useEffect(() => {
    if (content) {
      const processed = processContent(content);
      setProcessedContent(processed);
      
      // Auto-scroll to bottom when content updates
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      }, 100);
    }
  }, [content]);

  const processContent = (text: string): ReactElement[] => {
    if (!text) return [];

    const elements: ReactElement[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (!line.trim()) {
        elements.push(<div key={`empty-${lineIndex}`} className="h-4" />);
        return;
      }

      // Check if line contains LaTeX (block math)
      const blockMathRegex = /\$\$([^$]+)\$\$/g;
      const inlineMathRegex = /\$([^$]+)\$/g;
      
      if (blockMathRegex.test(line)) {
        // Handle block math
        const parts = line.split(blockMathRegex);
        const lineElements: ReactElement[] = [];
        
        parts.forEach((part, partIndex) => {
          if (partIndex % 2 === 0) {
            // Regular text
            if (part.trim()) {
              lineElements.push(
                <span key={`text-${lineIndex}-${partIndex}`} className="text-green-300">
                  {part}
                </span>
              );
            }
          } else {
            // Block math
            try {
              lineElements.push(
                <div key={`block-math-${lineIndex}-${partIndex}`} className="my-4 flex justify-center">
                  <BlockMath math={part} />
                </div>
              );
            } catch (error) {
              console.error('LaTeX rendering error:', error);
              lineElements.push(
                <span key={`error-${lineIndex}-${partIndex}`} className="text-red-400">
                  [Math Error: {part}]
                </span>
              );
            }
          }
        });
        
        elements.push(
          <div key={`line-${lineIndex}`} className="mb-2">
            {lineElements}
          </div>
        );
      } else {
        // Handle inline math and regular text
        const parts = line.split(inlineMathRegex);
        const lineElements: ReactElement[] = [];
        
        parts.forEach((part, partIndex) => {
          if (partIndex % 2 === 0) {
            // Regular text
            if (part.trim()) {
              lineElements.push(
                <span key={`text-${lineIndex}-${partIndex}`} className="text-green-300">
                  {part}
                </span>
              );
            }
          } else {
            // Inline math
            try {
              lineElements.push(
                <InlineMath key={`inline-math-${lineIndex}-${partIndex}`} math={part} />
              );
            } catch (error) {
              console.error('LaTeX rendering error:', error);
              lineElements.push(
                <span key={`error-${lineIndex}-${partIndex}`} className="text-red-400">
                  [Math Error: {part}]
                </span>
              );
            }
          }
        });
        
        elements.push(
          <div key={`line-${lineIndex}`} className="mb-2 leading-relaxed">
            {lineElements.length > 0 ? lineElements : (
              <span className="text-green-300">{line}</span>
            )}
          </div>
        );
      }
    });

    return elements;
  };

  return (
    <Card className="h-full bg-slate-900 border-slate-700 shadow-2xl">
      <div className="h-full flex flex-col">
        {/* Blackboard Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <h2 className="text-sm font-medium text-slate-400">AI Blackboard</h2>
          <div className="w-16"></div>
        </div>

        {/* Blackboard Content */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div 
            ref={contentRef}
            className="p-6 min-h-full font-mono text-lg leading-relaxed"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)
              `
            }}
          >
            {processedContent.length > 0 ? (
              <div className="space-y-1">
                {processedContent}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-lg">Waiting for lesson content...</p>
                  <p className="text-sm mt-2">The AI will start writing here soon</p>
                </div>
              </div>
            )}
            
            {/* Chalk dust effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-8 w-1 h-1 bg-green-300 rounded-full opacity-30 animate-pulse"></div>
              <div className="absolute top-12 right-12 w-1 h-1 bg-green-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
              <div className="absolute bottom-8 left-16 w-1 h-1 bg-green-300 rounded-full opacity-25 animate-pulse delay-500"></div>
            </div>
          </div>
        </ScrollArea>

        {/* Blackboard Footer */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Auto-scroll enabled</span>
            <span>LaTeX supported</span>
          </div>
        </div>
      </div>
    </Card>
  );
}