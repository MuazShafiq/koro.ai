export interface TTSRequest {
  text: string;
  voiceId?: string;
  bitrate?: string;
  speed?: string;
  pitch?: string;
  codec?: string;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  audioBuffer?: Buffer;
  error?: string;
}

if (!process.env.UNREAL_SPEECH_API_KEY) {
  throw new Error('UNREAL_SPEECH_API_KEY environment variable is required');
}

const UNREAL_SPEECH_API_URL = 'https://api.v6.unrealspeech.com/stream';
const API_KEY = process.env.UNREAL_SPEECH_API_KEY;

/**
 * Convert text to speech using Unreal Speech API
 */
export async function convertTextToSpeech(
  request: TTSRequest
): Promise<TTSResponse> {
  try {
    const {
      text,
      voiceId = 'Scarlett', // Default voice
      bitrate = '192k',
      speed = '0',
      pitch = '1',
      codec = 'libmp3lame'
    } = request;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for TTS conversion');
    }

    // Check text length (Unreal Speech has limits)
    if (text.length > 500000) { // 500KB limit
      throw new Error('Text content is too long for TTS conversion');
    }

    // Prepare request payload
    const payload = {
      Text: text.trim(),
      VoiceId: voiceId,
      Bitrate: bitrate,
      Speed: speed,
      Pitch: pitch,
      Codec: codec,
      Temperature: 0.25 // For more natural speech
    };

    console.log('Converting text to speech with Unreal Speech API...');
    
    const response = await fetch(UNREAL_SPEECH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unreal Speech API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 401) {
        throw new Error('Unreal Speech API authentication failed. Please check your API key.');
      } else if (response.status === 429) {
        throw new Error('Unreal Speech API rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error('Invalid request to Unreal Speech API. Please check your parameters.');
      } else {
        throw new Error(`Unreal Speech API error: ${response.status} ${response.statusText}`);
      }
    }

    // Get audio buffer from response
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    if (audioBuffer.length === 0) {
      throw new Error('Received empty audio response from Unreal Speech API');
    }

    console.log(`TTS conversion successful. Audio size: ${audioBuffer.length} bytes`);

    return {
      success: true,
      audioBuffer
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
 * Get available voices from Unreal Speech
 */
export async function getAvailableVoices(): Promise<string[]> {
  // Unreal Speech available voices (as of current API)
  return [
    'Scarlett',
    'Dan',
    'Liv',
    'Will',
    'Amy'
  ];
}

/**
 * Validate voice ID
 */
export async function isValidVoiceId(voiceId: string): Promise<boolean> {
  const availableVoices = await getAvailableVoices();
  return availableVoices.includes(voiceId);
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