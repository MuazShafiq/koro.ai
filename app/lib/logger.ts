import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create subdirectories for different log types
const logDirs = {
  tutor: path.join(logsDir, 'tutor'),
  openai: path.join(logsDir, 'openai'),
  unreal: path.join(logsDir, 'unreal-speech'),
  database: path.join(logsDir, 'database'),
  errors: path.join(logsDir, 'errors')
};

Object.values(logDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'DEBUG' | 'WARN';
  category: string;
  message: string;
  data?: any;
  requestId?: string;
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? `\n${JSON.stringify(entry.data, null, 2)}` : '';
    const requestIdStr = entry.requestId ? ` [${entry.requestId}]` : '';
    return `[${entry.timestamp}] ${entry.level}${requestIdStr} [${entry.category}] ${entry.message}${dataStr}\n\n`;
  }

  private writeToFile(category: keyof typeof logDirs, entry: LogEntry): void {
    try {
      const dateStr = this.getDateString();
      const filename = `${category}-${dateStr}.log`;
      const filepath = path.join(logDirs[category], filename);
      const logContent = this.formatLogEntry(entry);
      
      fs.appendFileSync(filepath, logContent);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogEntry['level'], category: string, message: string, data?: any, requestId?: string): void {
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      category,
      message,
      data,
      requestId
    };

    // Console logging with emoji indicators
    const emoji = {
      INFO: '📝',
      ERROR: '❌',
      DEBUG: '🔍',
      WARN: '⚠️'
    };
    
    const consoleMessage = `${emoji[level]} [${entry.timestamp}] [${category}]${requestId ? ` [${requestId}]` : ''} ${message}`;
    
    if (level === 'ERROR') {
      console.error(consoleMessage, data || '');
    } else if (level === 'WARN') {
      console.warn(consoleMessage, data || '');
    } else {
      console.log(consoleMessage, data || '');
    }

    // File logging
    if (category.includes('openai') || category.includes('OpenAI')) {
      this.writeToFile('openai', entry);
    } else if (category.includes('unreal') || category.includes('audio')) {
      this.writeToFile('unreal', entry);
    } else if (category.includes('database') || category.includes('supabase')) {
      this.writeToFile('database', entry);
    } else if (level === 'ERROR') {
      this.writeToFile('errors', entry);
    } else {
      this.writeToFile('tutor', entry);
    }
  }

  info(category: string, message: string, data?: any, requestId?: string): void {
    this.log('INFO', category, message, data, requestId);
  }

  error(category: string, message: string, data?: any, requestId?: string): void {
    this.log('ERROR', category, message, data, requestId);
  }

  debug(category: string, message: string, data?: any, requestId?: string): void {
    this.log('DEBUG', category, message, data, requestId);
  }

  warn(category: string, message: string, data?: any, requestId?: string): void {
    this.log('WARN', category, message, data, requestId);
  }

  // Specialized logging methods for common use cases
  openai(message: string, data?: any, requestId?: string): void {
    this.info('OpenAI', message, data, requestId);
  }

  unrealSpeech(message: string, data?: any, requestId?: string): void {
    this.info('UnrealSpeech', message, data, requestId);
  }

  database(message: string, data?: any, requestId?: string): void {
    this.info('Database', message, data, requestId);
  }

  lesson(message: string, data?: any, requestId?: string): void {
    this.info('Lesson', message, data, requestId);
  }

  auth(message: string, data?: any, requestId?: string): void {
    this.info('Auth', message, data, requestId);
  }

  storage(message: string, data?: any, requestId?: string): void {
    this.info('Storage', message, data, requestId);
  }
}

export const logger = new Logger();
export default logger;