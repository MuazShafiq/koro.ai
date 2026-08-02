export type ContentType = 'welcome' | 'assessment' | 'lesson' | 'interaction' | 'general';

export interface TTSRequest {
  text: string;
  voiceId?: string;
  bitrate?: string;
  speed?: string;
  pitch?: string;
  codec?: string;
  contentType?: ContentType;
  context?: string;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  error?: string;
  chunksProcessed?: number;
  enhancedText?: string;
  estimatedDuration?: number;
}

const CLOUDFLARE_AURA_MODEL = '@cf/deepgram/aura-1';
const CLOUDFLARE_MELO_MODEL = '@cf/myshell-ai/melotts';

async function readAudioResponse(response: Response): Promise<Buffer> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
    return Buffer.from(await response.arrayBuffer());
  }

  const payload = await response.json() as {
    result?: { audio?: string } | string;
    audio?: string;
  };
  const encodedAudio = typeof payload.result === 'string'
    ? payload.result
    : payload.result?.audio || payload.audio;
  if (!encodedAudio) throw new Error('Cloudflare TTS returned no audio data');
  return Buffer.from(encodedAudio.replace(/^data:audio\/[^;]+;base64,/, ''), 'base64');
}

/**
 * Convert a single text chunk to speech using Cloudflare Workers AI.
 */
async function convertChunkToSpeech(
  text: string,
  _voiceId: string,
  _bitrate: string,
  _speed: string,
  _pitch: string,
  _codec: string
): Promise<Buffer> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_AI_TOKEN;
  if (!accountId || !token) {
    throw new Error('Cloudflare TTS credentials are not configured');
  }

  const endpoint = (model: string) =>
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Aura is substantially more reliable than MeloTTS for long-running REST
  // requests and returns a directly playable MP3.
  const auraResponse = await fetch(endpoint(CLOUDFLARE_AURA_MODEL), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: text.trim(),
      speaker: 'asteria',
      encoding: 'mp3',
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (auraResponse.ok) return readAudioResponse(auraResponse);

  const auraError = await auraResponse.text();
  console.warn('Cloudflare Aura TTS failed; trying MeloTTS fallback:', {
    status: auraResponse.status,
    error: auraError.slice(0, 500),
  });

  const meloResponse = await fetch(endpoint(CLOUDFLARE_MELO_MODEL), {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: text.trim(), lang: 'en' }),
    signal: AbortSignal.timeout(15000),
  });
  if (!meloResponse.ok) {
    const meloError = await meloResponse.text();
    throw new Error(
      `Cloudflare TTS failed: Aura ${auraResponse.status}; Melo ${meloResponse.status} ${meloError.slice(0, 200)}`,
    );
  }
  return readAudioResponse(meloResponse);
}

/**
 * Convert text to speech using Cloudflare Workers AI with chunking support.
 */
export async function convertTextToSpeech(
  request: TTSRequest
): Promise<TTSResponse> {
  try {
    const {
      text,
      voiceId = 'asteria',
      bitrate = '192k',
      speed = '0',
      pitch = '1',
      codec = 'libmp3lame',
    } = request;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for TTS conversion');
    }

    const cleanedText = cleanTextForTTS(text);

    // Normal lesson scripts fit in one request. Chunking remains as a fallback
    // for restored sessions created before the lesson-size limit was added.
    const chunks = splitTextForTTS(cleanedText, 900);
    const estimatedDuration = estimateAudioDuration(text);

    const audioBuffers: Buffer[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk.length > 1000) {
        throw new Error(`Chunk ${i + 1} exceeds 1000 character limit: ${chunk.length} characters`);
      }
      
      try {
        const chunkBuffer = await convertChunkToSpeech(
          chunk,
          voiceId,
          bitrate,
          speed,
          pitch,
          codec
        );
        
        if (chunkBuffer.length === 0) {
          throw new Error(`Received empty audio response for chunk ${i + 1}`);
        }
        
        audioBuffers.push(chunkBuffer);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw error;
      }
    }

    const combinedBuffer = Buffer.concat(audioBuffers);

    return {
      success: true,
      audioBuffer: combinedBuffer,
      chunksProcessed: chunks.length,
      estimatedDuration: estimatedDuration
    };
  } catch (error) {
    console.error('Error in convertTextToSpeech:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown TTS conversion error'
    };
  }
}

/**
 * Validate API key availability and configuration
 */
export function validateApiKey(): { isValid: boolean; error?: string } {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_AI_TOKEN) {
    return {
      isValid: false,
      error: 'Cloudflare Workers AI credentials are not configured'
    };
  }
  return { isValid: true };
}

/**
 * Get the voices exposed by the configured Cloudflare model.
 */
export async function getAvailableVoices(): Promise<string[]> {
  return ['Aura Asteria'];
}

/**
 * Validate voice ID
 */
export async function isValidVoiceId(voiceId: string): Promise<boolean> {
  return Boolean(voiceId);
}

/**
 * Clean text for better TTS output
 */
export function cleanTextForTTS(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Code
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    
    // Clean up special characters
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, 'and')
    .replace(/&lt;/g, 'less than')
    .replace(/&gt;/g, 'greater than')
    
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '. ') // Convert double newlines to periods
    .replace(/\n/g, ' ') // Convert single newlines to spaces
    
    // Add pauses for better speech flow
    .replace(/\. /g, '. ... ') // Add pause after sentences
    .replace(/: /g, ': ... ') // Add pause after colons
    
    .trim();
}

/**
 * Estimate audio duration based on text length
 * Rough estimation: ~150 words per minute average speaking rate
 */
export function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const wordsPerMinute = 150;
  return Math.ceil((wordCount / wordsPerMinute) * 60); // Return duration in seconds
}

/**
 * Split long text into chunks for TTS processing
 */
export function splitTextForTTS(text: string, maxChunkSize: number = 3000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
