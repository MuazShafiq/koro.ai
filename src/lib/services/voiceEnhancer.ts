import tutorVoiceSOP from '../tutor-voice-sop.json';

/**
 * Content types for different voice delivery styles
 */
export type ContentType = 'welcome' | 'assessment' | 'lesson' | 'interaction';

/**
 * Enhanced text processing result
 */
export interface EnhancedTextResult {
  enhancedText: string;
  estimatedDuration: number;
  contentType: ContentType;
}

/**
 * Apply voice delivery instructions from tutor-voice-sop.json to enhance text for TTS
 */
export function enhanceTextForVoice(
  text: string,
  contentType: ContentType = 'interaction'
): EnhancedTextResult {
  const sop = tutorVoiceSOP.voice_delivery_instructions;
  
  // Start with cleaned text
  let enhancedText = cleanAndNormalizeText(text);
  
  // Apply content-specific structure rules
  enhancedText = applyContentStructure(enhancedText, contentType, sop);
  
  // Apply speaking style enhancements
  enhancedText = applySpeakingStyle(enhancedText, sop);
  
  // Apply speech enhancements (pauses, emphasis, intonation)
  enhancedText = applySpeechEnhancements(enhancedText, sop);
  
  // Apply language style improvements
  enhancedText = applyLanguageStyle(enhancedText, sop);
  
  // Estimate duration based on enhanced text
  const estimatedDuration = estimateEnhancedDuration(enhancedText, contentType, sop);
  
  return {
    enhancedText,
    estimatedDuration,
    contentType
  };
}

/**
 * Clean and normalize text for voice processing
 */
function cleanAndNormalizeText(text: string): string {
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
    .trim();
}

/**
 * Apply content-specific structure rules based on SOP guidelines
 */
function applyContentStructure(
  text: string,
  contentType: ContentType,
  sop: any
): string {
  const structureRules = sop.content_guidelines.structure_rules;
  
  switch (contentType) {
    case 'welcome':
      // Apply welcome structure: warm greeting + expectations + transition
      return applyWelcomeStructure(text, structureRules.welcome);
    
    case 'assessment':
      // Apply assessment structure: clear question + explanation + encouragement
      return applyAssessmentStructure(text, structureRules.assessment);
    
    case 'lesson':
      // Apply lesson structure: introduction + digestible parts + engagement
      return applyLessonStructure(text, structureRules.lesson_delivery);
    
    case 'interaction':
      // Apply interaction structure: acknowledge + answer + context
      return applyInteractionStructure(text, structureRules.interactions);
    
    default:
      return text;
  }
}

/**
 * Apply welcome message structure
 */
function applyWelcomeStructure(text: string, rules: string[]): string {
  // Add warm greeting tone markers
  let enhanced = text;
  
  // Ensure warm, encouraging tone
  if (!enhanced.match(/^(Hello|Hi|Welcome|Great)/i)) {
    enhanced = `Hello! ${enhanced}`;
  }
  
  // Add transition pause before moving to assessment
  if (!enhanced.endsWith('...')) {
    enhanced += '... Let\'s begin!';
  }
  
  return enhanced;
}

/**
 * Apply assessment question structure
 */
function applyAssessmentStructure(text: string, rules: string[]): string {
  let enhanced = text;
  
  // Ensure question ends with encouraging tone
  if (enhanced.includes('?') && !enhanced.match(/please|feel free|don\'t worry/i)) {
    enhanced = enhanced.replace('?', '? Take your time.');
  }
  
  return enhanced;
}

/**
 * Apply lesson delivery structure
 */
function applyLessonStructure(text: string, rules: string[]): string {
  let enhanced = text;
  
  // Add topic introduction if not present
  if (!enhanced.match(/^(Now|Let\'s|Today|In this)/i)) {
    enhanced = `Now, ${enhanced.charAt(0).toLowerCase()}${enhanced.slice(1)}`;
  }
  
  // Add engagement hooks at the end
  if (!enhanced.match(/\?\s*$/) && !enhanced.includes('think about')) {
    enhanced += '... What do you think about this?';
  }
  
  return enhanced;
}

/**
 * Apply interaction response structure
 */
function applyInteractionStructure(text: string, rules: string[]): string {
  let enhanced = text;
  
  // Add acknowledgment if not present
  if (!enhanced.match(/^(That\'s|Great|Good|I see|Excellent)/i)) {
    enhanced = `That's a great question! ${enhanced}`;
  }
  
  return enhanced;
}

/**
 * Apply speaking style enhancements based on SOP guidelines
 */
function applySpeakingStyle(text: string, sop: any): string {
  const speakingStyle = sop.speaking_style;
  let enhanced = text;
  
  // Apply pace (moderate with natural pauses)
  enhanced = addNaturalPauses(enhanced);
  
  // Apply tone (warm and encouraging)
  enhanced = enhanceWarmTone(enhanced);
  
  // Apply clarity (emphasis on key concepts)
  enhanced = emphasizeKeyConcepts(enhanced);
  
  // Apply enthusiasm (genuine excitement)
  enhanced = addEnthusiasm(enhanced);
  
  return enhanced;
}

/**
 * Add natural pauses for better comprehension
 */
function addNaturalPauses(text: string): string {
  return text
    // Add pauses after sentences
    .replace(/\. /g, '. ... ')
    // Add pauses after questions
    .replace(/\? /g, '? ... ')
    // Add pauses after colons
    .replace(/: /g, ': ... ')
    // Add pauses after commas in lists
    .replace(/, /g, ', .. ')
    // Add longer pauses for topic transitions
    .replace(/\. ... (Now|Next|Let\'s|So)/g, '. ... ... $1');
}

/**
 * Enhance warm and encouraging tone
 */
function enhanceWarmTone(text: string): string {
  return text
    // Replace neutral phrases with warmer alternatives
    .replace(/\bOkay\b/g, 'Wonderful')
    .replace(/\bFine\b/g, 'Great')
    .replace(/\bCorrect\b/g, 'Excellent')
    .replace(/\bWrong\b/g, 'Not quite, but that\'s okay')
    // Add encouraging words
    .replace(/\bYou should\b/g, 'You might want to')
    .replace(/\bYou must\b/g, 'It would be helpful if you');
}

/**
 * Emphasize key concepts through text markers
 */
function emphasizeKeyConcepts(text: string): string {
  // Add emphasis to important terms (this will be interpreted by TTS as stress)
  return text
    .replace(/\b(important|key|crucial|essential|remember|note)\b/gi, '*$1*')
    .replace(/\b(always|never|must|should)\b/gi, '*$1*')
    // Add slight pauses before emphasized concepts
    .replace(/\*(\w+)\*/g, '.. *$1*');
}

/**
 * Add genuine enthusiasm to the text
 */
function addEnthusiasm(text: string): string {
  return text
    // Add enthusiasm to positive statements
    .replace(/\b(great|excellent|wonderful|amazing|fantastic)\b/gi, '$1!')
    // Add excitement to discoveries
    .replace(/\b(discover|learn|understand|see)\b/gi, '$1')
    // Add energy to questions
    .replace(/What do you think\?/g, 'What do you think? I\'m curious to hear your thoughts!');
}

/**
 * Apply speech enhancements (pauses, emphasis, intonation)
 */
function applySpeechEnhancements(text: string, sop: any): string {
  const enhancements = sop.voice_parameters.speech_enhancements;
  let enhanced = text;
  
  // Apply pause markers as specified in SOP
  enhanced = enhanced
    .replace(/\.\.\./g, '...') // Short pauses
    .replace(/\. \.\.\./g, '. ... ...') // Longer pauses for emphasis
    
    // Apply emphasis through natural stress patterns
    .replace(/\*(.*?)\*/g, '$1') // Remove asterisks but keep the emphasis intent
    
    // Apply question intonation markers
    .replace(/\?/g, '?') // Rising intonation for questions
    
    // Apply list separation with brief pauses
    .replace(/, /g, ', .. ');
  
  return enhanced;
}

/**
 * Apply language style improvements
 */
function applyLanguageStyle(text: string, sop: any): string {
  const languageStyle = sop.content_guidelines.language_style;
  let enhanced = text;
  
  // Ensure varied sentence length
  enhanced = varySeentenceLength(enhanced);
  
  // Add smooth transitions
  enhanced = addSmoothTransitions(enhanced);
  
  // Make questions more open-ended
  enhanced = enhanceQuestions(enhanced);
  
  return enhanced;
}

/**
 * Vary sentence length for better flow
 */
function varySeentenceLength(text: string): string {
  // Split long sentences and add connecting words
  return text.replace(/([^.!?]{60,}?)\s+(and|but|so|because|however)/g, '$1. ... $2');
}

/**
 * Add smooth transitions between ideas
 */
function addSmoothTransitions(text: string): string {
  return text
    .replace(/\. (Now|Next)/g, '. ... Now')
    .replace(/\. (So|Therefore)/g, '. ... So')
    .replace(/\. (But|However)/g, '. ... But');
}

/**
 * Enhance questions to be more open-ended and engaging
 */
function enhanceQuestions(text: string): string {
  return text
    .replace(/Do you understand\?/g, 'How does this make sense to you?')
    .replace(/Is that clear\?/g, 'What questions do you have about this?')
    .replace(/Any questions\?/g, 'What would you like to explore further?');
}

/**
 * Estimate duration based on enhanced text and content type
 */
function estimateEnhancedDuration(
  text: string,
  contentType: ContentType,
  sop: any
): number {
  const targets = sop.content_guidelines.length_targets;
  const wordCount = text.split(/\s+/).length;
  
  // Adjust words per minute based on content type and pauses
  let wordsPerMinute = 150; // Base rate
  
  // Account for pauses and emphasis
  const pauseCount = (text.match(/\.\.\./g) || []).length;
  const emphasisCount = (text.match(/\*/g) || []).length;
  
  // Slower delivery for educational content
  switch (contentType) {
    case 'welcome':
      wordsPerMinute = 140; // Slightly slower for warmth
      break;
    case 'assessment':
      wordsPerMinute = 130; // Slower for clarity
      break;
    case 'lesson':
      wordsPerMinute = 135; // Moderate pace for comprehension
      break;
    case 'interaction':
      wordsPerMinute = 145; // Natural conversation pace
      break;
  }
  
  // Add time for pauses (0.5 seconds per pause marker)
  const pauseTime = pauseCount * 0.5;
  
  // Calculate base duration
  const baseDuration = (wordCount / wordsPerMinute) * 60;
  
  return Math.ceil(baseDuration + pauseTime);
}

/**
 * Get content type from context or message type
 */
export function detectContentType(text: string, context?: string): ContentType {
  if (context) {
    if (context.includes('welcome') || context.includes('greeting')) {
      return 'welcome';
    }
    if (context.includes('assessment') || context.includes('question')) {
      return 'assessment';
    }
    if (context.includes('lesson') || context.includes('chunk')) {
      return 'lesson';
    }
  }
  
  // Detect from text content
  if (text.match(/^(Hello|Hi|Welcome|Great to)/i)) {
    return 'welcome';
  }
  
  if (text.includes('?') && text.length < 200) {
    return 'assessment';
  }
  
  if (text.length > 300) {
    return 'lesson';
  }
  
  return 'interaction';
}