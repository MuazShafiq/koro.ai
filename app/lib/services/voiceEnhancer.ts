import tutorVoiceSOP from '../tutor-voice-sop.json';

export type ContentType = 'welcome' | 'assessment' | 'lesson' | 'interaction' | 'general';

export interface VoiceEnhancementOptions {
  contentType: ContentType;
  targetDuration?: number;
  emphasizeKeyTerms?: boolean;
  addNaturalPauses?: boolean;
}

export interface EnhancedTextResult {
  enhancedText: string;
  estimatedDuration: number;
  contentType: ContentType;
  enhancements: string[];
}

/**
 * Main function to enhance text for TTS based on content type and voice SOP
 */
export function enhanceTextForVoice(
  text: string,
  options: VoiceEnhancementOptions
): EnhancedTextResult {
  const { contentType, targetDuration, emphasizeKeyTerms = true, addNaturalPauses = true } = options;
  
  // Start with cleaned and normalized text
  let enhancedText = cleanAndNormalizeText(text);
  const enhancements: string[] = [];
  
  // Apply content-specific structure
  enhancedText = applyContentStructure(enhancedText, contentType);
  enhancements.push(`Applied ${contentType} content structure`);
  
  // Apply speaking style based on SOP
  enhancedText = applySpeakingStyle(enhancedText, contentType);
  enhancements.push('Applied speaking style guidelines');
  
  // Apply speech enhancements
  if (addNaturalPauses) {
    enhancedText = applySpeechEnhancements(enhancedText, contentType);
    enhancements.push('Added natural pauses and emphasis');
  }
  
  // Apply language style improvements
  enhancedText = applyLanguageStyle(enhancedText, contentType);
  enhancements.push('Applied language style improvements');
  
  // Estimate duration
  const estimatedDuration = estimateEnhancedDuration(enhancedText);
  
  return {
    enhancedText,
    estimatedDuration,
    contentType,
    enhancements
  };
}

/**
 * Clean and normalize text for TTS processing
 */
export function cleanAndNormalizeText(text: string): string {
  // Remove markdown formatting
  let cleaned = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/#{1,6}\s*/g, '') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Images
    .replace(/^[-*+]\s+/gm, '') // List items
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .replace(/^>\s+/gm, '') // Blockquotes
    .replace(/\|.*\|/g, '') // Tables
    .replace(/---+/g, '') // Horizontal rules
    .replace(/\\(.)/g, '$1'); // Escaped characters
  
  // Clean up special characters that might cause TTS issues
  cleaned = cleaned
    .replace(/[\u2018\u2019]/g, "'") // Smart quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Em/en dashes
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[\u00A0]/g, ' ') // Non-breaking space
    .replace(/[^\w\s.,!?;:()\-'"]/g, '') // Remove other special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return cleaned;
}

/**
 * Apply content-specific structure based on SOP guidelines
 */
export function applyContentStructure(text: string, contentType: ContentType): string {
  const sop = tutorVoiceSOP.voice_delivery_instructions;
  
  switch (contentType) {
    case 'welcome':
      // Ensure warm greeting and smooth transition
      if (!text.toLowerCase().includes('hello') && !text.toLowerCase().includes('hi') && !text.toLowerCase().includes('welcome')) {
        text = `Hello! ${text}`;
      }
      break;
      
    case 'assessment':
      // Ensure clear question format
      if (!text.includes('?')) {
        text = `${text}?`;
      }
      // Add encouragement if not present
      if (!text.toLowerCase().includes('feel free') && !text.toLowerCase().includes('don\'t worry')) {
        text = `${text} Feel free to share your thoughts.`;
      }
      break;
      
    case 'lesson':
      // Ensure clear topic introduction
      const sentences = text.split(/[.!?]+/).filter(s => s.trim());
      if (sentences.length > 0 && !sentences[0].toLowerCase().includes('let\'s') && !sentences[0].toLowerCase().includes('today')) {
        text = `Let's explore this topic. ${text}`;
      }
      break;
      
    case 'interaction':
      // Acknowledge and provide focused response
      if (!text.toLowerCase().includes('great question') && !text.toLowerCase().includes('that\'s') && !text.toLowerCase().includes('excellent')) {
        text = `That's a great question! ${text}`;
      }
      break;
  }
  
  return text;
}

/**
 * Apply speaking style based on SOP guidelines
 */
export function applySpeakingStyle(text: string, contentType: ContentType): string {
  const sop = tutorVoiceSOP.voice_delivery_instructions.speaking_style;
  
  // Add natural conversation markers
  let enhanced = text;
  
  // For longer content, add natural breaks
  if (text.length > 200) {
    enhanced = enhanced.replace(/([.!?])\s+([A-Z])/g, '$1 ... $2');
  }
  
  // Add emphasis markers for key concepts (simple heuristic)
  const keyTerms = ['important', 'key', 'remember', 'notice', 'understand', 'concept', 'principle'];
  keyTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    enhanced = enhanced.replace(regex, `*${term}*`);
  });
  
  return enhanced;
}

/**
 * Apply speech enhancements like pauses and emphasis
 */
export function applySpeechEnhancements(text: string, contentType: ContentType): string {
  const sop = tutorVoiceSOP.voice_delivery_instructions.voice_parameters.speech_enhancements;
  
  let enhanced = text;
  
  // Add pauses after important transitions
  enhanced = enhanced
    .replace(/\b(however|therefore|meanwhile|furthermore|additionally)\b/gi, '... $1')
    .replace(/\b(first|second|third|finally|lastly)\b/gi, '$1 ...')
    .replace(/\b(for example|such as|in other words)\b/gi, '... $1 ...');
  
  // Add pauses before questions
  enhanced = enhanced.replace(/([.!])\s*([^.!?]*\?)/g, '$1 ... $2');
  
  // Add emphasis to lists
  enhanced = enhanced.replace(/(\d+\.|[a-z]\))/g, '... $1');
  
  return enhanced;
}

/**
 * Apply language style improvements
 */
export function applyLanguageStyle(text: string, contentType: ContentType): string {
  const sop = tutorVoiceSOP.voice_delivery_instructions.content_guidelines.language_style;
  
  let enhanced = text;
  
  // Vary sentence length by adding natural breaks
  const sentences = enhanced.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 2) {
    // Add variety in pacing
    enhanced = sentences.map((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 80 && index < sentences.length - 1) {
        return `${trimmed}. ...`;
      }
      return `${trimmed}.`;
    }).join(' ');
  }
  
  // Add smooth transitions
  const transitions = ['Now', 'Next', 'Also', 'Additionally', 'Furthermore'];
  if (contentType === 'lesson' && sentences.length > 3) {
    const midPoint = Math.floor(sentences.length / 2);
    const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];
    enhanced = enhanced.replace(/\.\s+([A-Z])/, `. ${randomTransition}, $1`);
  }
  
  // Encourage open-ended thinking
  if (contentType === 'lesson' || contentType === 'interaction') {
    if (!enhanced.includes('?') && !enhanced.toLowerCase().includes('think about')) {
      enhanced += ' What do you think about this?';
    }
  }
  
  return enhanced;
}

/**
 * Estimate duration of enhanced text
 */
export function estimateEnhancedDuration(text: string): number {
  // Average speaking rate: ~150 words per minute for educational content
  // Account for pauses and emphasis
  const words = text.split(/\s+/).length;
  const pauseCount = (text.match(/\.\.\./g) || []).length;
  const emphasisCount = (text.match(/\*.*?\*/g) || []).length;
  
  // Base duration
  const baseDuration = (words / 150) * 60; // seconds
  
  // Add time for pauses (0.5 seconds each)
  const pauseTime = pauseCount * 0.5;
  
  // Add time for emphasis (slight slowdown)
  const emphasisTime = emphasisCount * 0.2;
  
  return Math.round(baseDuration + pauseTime + emphasisTime);
}

/**
 * Detect content type from text content
 */
export function detectContentType(text: string): ContentType {
  const lowerText = text.toLowerCase();
  
  // Welcome detection
  if (lowerText.includes('hello') || lowerText.includes('welcome') || lowerText.includes('hi there') || lowerText.includes('good morning')) {
    return 'welcome';
  }
  
  // Assessment detection
  if (lowerText.includes('?') && (lowerText.includes('tell me') || lowerText.includes('what do you') || lowerText.includes('how familiar'))) {
    return 'assessment';
  }
  
  // Interaction detection
  if (lowerText.includes('great question') || lowerText.includes('that\'s') || lowerText.includes('excellent point')) {
    return 'interaction';
  }
  
  // Lesson detection (longer content with educational markers)
  if (text.length > 200 && (lowerText.includes('let\'s') || lowerText.includes('we\'ll') || lowerText.includes('understand'))) {
    return 'lesson';
  }
  
  return 'general';
}