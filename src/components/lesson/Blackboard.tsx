'use client';

import { useEffect, useRef, useState, ReactElement } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { BookOpen, Calculator, Image, List, FileText, Lightbulb } from 'lucide-react';

interface BlackboardItem {
  type: 'text' | 'equation' | 'diagram' | 'step-by-step' | 'definition' | 'example';
  label: string;
  content?: string;
  description?: string;
  steps?: string[];
}

interface BlackboardProps {
  content: string;
}

export function Blackboard({ content }: BlackboardProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [blackboardItems, setBlackboardItems] = useState<BlackboardItem[]>([]);

  useEffect(() => {
    if (content) {
      try {
        // Try to parse as structured blackboard data
        const parsedContent = JSON.parse(content);
        if (Array.isArray(parsedContent)) {
          setBlackboardItems(parsedContent);
        } else {
          // Fallback to plain text
          setBlackboardItems([{ type: 'text', label: 'Lesson Content', content }]);
        }
      } catch (error) {
        // Fallback to plain text if JSON parsing fails
        setBlackboardItems([{ type: 'text', label: 'Lesson Content', content }]);
      }
      
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

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'equation': return <Calculator className="w-4 h-4" />;
      case 'diagram': return <Image className="w-4 h-4" />;
      case 'step-by-step': return <List className="w-4 h-4" />;
      case 'definition': return <BookOpen className="w-4 h-4" />;
      case 'example': return <Lightbulb className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'equation': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'diagram': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'step-by-step': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'definition': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'example': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const renderMathContent = (content: string) => {
    // Check if content contains LaTeX
    const blockMathRegex = /\$\$([^$]+)\$\$/g;
    const inlineMathRegex = /\$([^$]+)\$/g;
    
    if (blockMathRegex.test(content)) {
      const parts = content.split(blockMathRegex);
      return parts.map((part, index) => {
        if (index % 2 === 0) {
          return part ? <span key={index} className="text-green-300">{part}</span> : null;
        } else {
          try {
            return <BlockMath key={index} math={part} />;
          } catch (error) {
            return <span key={index} className="text-red-400">[Math Error: {part}]</span>;
          }
        }
      });
    } else if (inlineMathRegex.test(content)) {
      const parts = content.split(inlineMathRegex);
      return parts.map((part, index) => {
        if (index % 2 === 0) {
          return part ? <span key={index} className="text-green-300">{part}</span> : null;
        } else {
          try {
            return <InlineMath key={index} math={part} />;
          } catch (error) {
            return <span key={index} className="text-red-400">[Math Error: {part}]</span>;
          }
        }
      });
    } else {
      return <span className="text-green-300">{content}</span>;
    }
  };

  const renderBlackboardItem = (item: BlackboardItem, index: number) => {
    return (
      <div key={index} className="mb-6 p-4 rounded-lg bg-slate-800/30 border border-slate-600/30">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={`${getItemColor(item.type)} border`}>
            {getItemIcon(item.type)}
            <span className="ml-1 capitalize">{item.type.replace('-', ' ')}</span>
          </Badge>
          <h3 className="text-lg font-semibold text-green-200">{item.label}</h3>
        </div>
        
        {item.content && (
          <div className="text-base leading-relaxed mb-2">
            {item.type === 'equation' ? (
              <div className="flex justify-center my-4">
                {renderMathContent(item.content)}
              </div>
            ) : (
              renderMathContent(item.content)
            )}
          </div>
        )}
        
        {item.description && (
          <div className="text-sm text-green-200/80 italic border-l-2 border-green-500/30 pl-3">
            {item.description}
          </div>
        )}
        
        {item.steps && (
          <ol className="list-decimal list-inside space-y-2 mt-3">
            {item.steps.map((step, stepIndex) => (
              <li key={stepIndex} className="text-green-300">
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>
    );
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
            <div className="space-y-2">
              {blackboardItems.length > 0 ? (
                blackboardItems.map((item, index) => renderBlackboardItem(item, index))
              ) : content ? (
                // Fallback to plain text rendering for non-structured content
                <div className="font-mono text-sm text-green-300 whitespace-pre-wrap">
                  {content}
                </div>
              ) : (
                <div className="text-center text-slate-400 mt-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Blackboard content will appear here during the lesson</p>
                </div>
              )}
            </div>
            
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