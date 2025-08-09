import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  requestId?: string;
  operation?: string;
}

/**
 * Execute a Supabase operation with retry logic for network failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    requestId = 'unknown',
    operation: operationName = 'database operation'
  } = options;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // If this is a Supabase result object, check for errors
      if (result && typeof result === 'object' && 'error' in result) {
        const supabaseResult = result as any;
        
        // Check if it's a retryable error
        if (supabaseResult.error && isRetryableError(supabaseResult.error)) {
          logger.warn('RETRY', `${operationName} attempt ${attempt} failed with retryable error`, {
            error: supabaseResult.error.message,
            code: supabaseResult.error.code,
            attempt
          }, requestId);
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.info('RETRY', `Retrying ${operationName} in ${delay}ms`, {}, requestId);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }
      
      return result;
    } catch (networkError) {
      lastError = networkError;
      
      logger.warn('RETRY', `Network error on ${operationName} attempt ${attempt}`, {
        error: networkError instanceof Error ? networkError.message : String(networkError),
        attempt
      }, requestId);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.info('RETRY', `Retrying ${operationName} in ${delay}ms`, {}, requestId);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  // If we get here, all retries failed
  logger.error('RETRY', `${operationName} failed after ${maxRetries} attempts`, {
    lastError: lastError instanceof Error ? {
      name: lastError.name,
      message: lastError.message
    } : lastError
  }, requestId);
  
  throw lastError;
}

/**
 * Check if an error is retryable (network/timeout related)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  const errorObj = error as Record<string, unknown>;
  
  // Check for specific retryable error types
  if (errorObj.name === 'AuthRetryableFetchError') return true;
  if (errorObj.code === 'NETWORK_ERROR') return true;
  if (errorObj.code === 'TIMEOUT') return true;
  
  // Check for network-related error messages
  const message = (typeof errorObj.message === 'string' ? errorObj.message : '').toLowerCase();
  if (message.includes('network')) return true;
  if (message.includes('timeout')) return true;
  if (message.includes('connection')) return true;
  if (message.includes('fetch failed')) return true;
  
  return false;
}

/**
 * Wrapper for Supabase auth operations with retry logic
 */
export async function withAuthRetry<T>(
  supabase: SupabaseClient,
  operation: (client: SupabaseClient) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () => operation(supabase),
    { ...options, operation: options.operation || 'auth operation' }
  );
}

/**
 * Wrapper for Supabase database operations with retry logic
 */
export async function withDatabaseRetry<T>(
  supabase: SupabaseClient,
  operation: (client: SupabaseClient) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return withRetry(
    () => operation(supabase),
    { ...options, operation: options.operation || 'database operation' }
  );
}