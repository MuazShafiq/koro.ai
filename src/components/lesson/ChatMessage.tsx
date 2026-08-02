'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  User, 
  Brain, 
  Info,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface ChatMessageProps {
  message: Message;
  onPlayAudio?: (audioUrl: string) => void;
}

export function ChatMessage({ message, onPlayAudio }: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayAudio = () => {
    if (message.audioUrl && onPlayAudio) {
      onPlayAudio(message.audioUrl);
    }
  };

  const getMessageIcon = () => {
    switch (message.type) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'ai':
        return <Brain className="h-4 w-4" />;
      case 'system':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return {
          container: 'ml-8 bg-blue-500 text-white',
          avatar: 'bg-blue-600 text-white',
          alignment: 'flex-row-reverse'
        };
      case 'ai':
        return {
          container: 'mr-8 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
          avatar: 'bg-green-600 text-white',
          alignment: 'flex-row'
        };
      case 'system':
        return {
          container: 'mx-8 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800',
          avatar: 'bg-amber-600 text-white',
          alignment: 'flex-row'
        };
      default:
        return {
          container: 'bg-slate-100 dark:bg-slate-800',
          avatar: 'bg-slate-600 text-white',
          alignment: 'flex-row'
        };
    }
  };

  const styles = getMessageStyles();

  return (
    <div 
      className={`flex items-start space-x-3 ${styles.alignment}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${styles.avatar}`}>
        {getMessageIcon()}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <Card className={`p-3 ${styles.container} shadow-sm`}>
          {/* Message Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium opacity-75">
                {message.type === 'user' ? 'You' : message.type === 'ai' ? 'AI Tutor' : 'System'}
              </span>
              {message.audioUrl && (
                <div className="flex items-center space-x-1">
                  <Volume2 className="h-3 w-3 opacity-60" />
                  <span className="text-xs opacity-60">Audio</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Audio Play Button */}
              {message.audioUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayAudio}
                  className={`h-6 w-6 p-0 opacity-0 transition-opacity ${
                    isHovered ? 'opacity-100' : ''
                  } hover:bg-white/20`}
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              
              {/* Timestamp */}
              <span className="text-xs opacity-60">
                {format(message.timestamp, 'HH:mm')}
              </span>
            </div>
          </div>

          {/* Message Text */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Message Footer */}
          {message.type === 'ai' && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <div className="flex items-center justify-between text-xs opacity-60">
                <span>AI Response</span>
                {message.audioUrl && (
                  <span>🔊 Audio available</span>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Delivery Status */}
        <div className="flex items-center justify-end mt-1 space-x-1">
          {message.type === 'user' && (
            <>
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-muted-foreground">Delivered</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
