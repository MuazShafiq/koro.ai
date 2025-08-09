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
  chunksProcessed?: number;
}

if (!process.env.UNREAL_SPEECH_API_KEY) {
  throw new Error('UNREAL_SPEECH_API_KEY environment variable is required');
}

const UNREAL_SPEECH_API_URL = 'https://api.v6.unrealspeech.com/stream';
const API_KEY = process.env.UNREAL_SPEECH_API_KEY;

/**
 * Convert a single text chunk to speech using Unreal Speech API
 */
async function convertChunkToSpeech(
  text: string,
  voiceId: string,
  bitrate: string,
  speed: string,
  pitch: string,
  codec: string
): Promise<Buffer> {
  const payload = {
    Text: text.trim(),
    VoiceId: voiceId,
    Bitrate: bitrate,
    Speed: speed,
    Pitch: pitch,
    Codec: codec,
    Temperature: 0.25
  };

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

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Convert text to speech using Unreal Speech API with chunking support
 */
export async function convertTextToSpeech(
  request: TTSRequest
): Promise<TTSResponse> {
  try {
    const {
      text,
      voiceId = 'Scarlett',
      bitrate = '192k',
      speed = '0',
      pitch = '1',
      codec = 'libmp3lame'
    } = request;

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required for TTS conversion');
    }

    // Clean text for better TTS output
    const cleanedText = cleanTextForTTS(text);

    console.log('Converting text to speech with Unreal Speech API...');
    console.log(`Original text length: ${text.length}, Cleaned text length: ${cleanedText.length}`);

    // Split text into chunks if it exceeds 950 characters (safe limit under 1000)
    const chunks = splitTextForTTS(cleanedText, 950);
    console.log(`Split into ${chunks.length} chunks`);

    const audioBuffers: Buffer[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} characters)`);
      
      // Validate chunk size before API call
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
        
        // Add a small delay between requests to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        throw error;
      }
    }

    // Combine all audio buffers
    const combinedBuffer = Buffer.concat(audioBuffers);
    
    console.log(`TTS conversion successful. Combined audio size: ${combinedBuffer.length} bytes`);

    return {
      success: true,
      audioBuffer: combinedBuffer,
      chunksProcessed: chunks.length
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