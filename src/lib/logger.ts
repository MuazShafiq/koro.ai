type LogLevel = 'info' | 'error' | 'debug' | 'warn';

type LogData = unknown;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  requestId?: string;
  data?: LogData;
}

/**
 * Serverless-safe structured logging. Vercel captures stdout/stderr, so local
 * filesystem log files only create unbounded data locally and disappear after
 * a deployed function invocation.
 */
class Logger {
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: LogData,
    requestId?: string,
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(requestId ? { requestId } : {}),
      ...(data === undefined ? {} : { data }),
    };
    const line = JSON.stringify(entry);

    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else if (level === 'debug') console.debug(line);
    else console.info(line);
  }

  info(category: string, message: string, data?: LogData, requestId?: string) {
    this.log('info', category, message, data, requestId);
  }

  error(category: string, message: string, data?: LogData, requestId?: string) {
    this.log('error', category, message, data, requestId);
  }

  debug(category: string, message: string, data?: LogData, requestId?: string) {
    this.log('debug', category, message, data, requestId);
  }

  warn(category: string, message: string, data?: LogData, requestId?: string) {
    this.log('warn', category, message, data, requestId);
  }

  ai(message: string, data?: LogData, requestId?: string) {
    this.info('AI', message, data, requestId);
  }

  speech(message: string, data?: LogData, requestId?: string) {
    this.info('Speech', message, data, requestId);
  }

  database(message: string, data?: LogData, requestId?: string) {
    this.info('Database', message, data, requestId);
  }

  lesson(message: string, data?: LogData, requestId?: string) {
    this.info('Lesson', message, data, requestId);
  }

  auth(message: string, data?: LogData, requestId?: string) {
    this.info('Auth', message, data, requestId);
  }

  storage(message: string, data?: LogData, requestId?: string) {
    this.info('Storage', message, data, requestId);
  }
}

export const logger = new Logger();
export default logger;
