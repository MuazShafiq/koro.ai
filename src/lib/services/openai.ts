import OpenAI from 'openai';
import { Resource } from '../supabase/resources';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LessonGenerationRequest {
  subjectName: string;
  topicName: string;
  resources: Resource[];
  userLevel?: string;
  duration?: number; // in minutes
}

export interface GeneratedLesson {
  title: string;
  content: string;
  objectives: string[];
  keyPoints: string[];
  estimatedDuration: number;
}

/**
 * Generate lesson content using OpenAI GPT-3.5-turbo
 */
export async function generateLessonContent(
  request: LessonGenerationRequest
): Promise<GeneratedLesson> {
  try {
    const { subjectName, topicName, resources, userLevel = 'intermediate', duration = 30 } = request;

    // Prepare context from resources
    const resourceContext = resources
      .map(resource => {
        const content = resource.content_text || `Resource: ${resource.title} - ${resource.description}`;
        return `**${resource.title}**\n${content}`;
      })
      .join('\n\n');

    const systemPrompt = `You are an expert AI tutor specializing in creating engaging, educational lesson plans. Your role is to generate comprehensive, well-structured lessons that are:

1. Age-appropriate and tailored to the specified learning level
2. Interactive and engaging
3. Based on provided educational resources
4. Structured with clear learning objectives
5. Designed to promote understanding and retention

Always respond in JSON format with the following structure:
{
  "title": "Lesson title",
  "content": "Full lesson content in markdown format",
  "objectives": ["Learning objective 1", "Learning objective 2"],
  "keyPoints": ["Key point 1", "Key point 2"],
  "estimatedDuration": number_in_minutes
}`;

    const userPrompt = `Create a comprehensive ${duration}-minute lesson plan for:

**Subject:** ${subjectName}
**Topic:** ${topicName}
**Learning Level:** ${userLevel}
**Target Duration:** ${duration} minutes

**Available Educational Resources:**
${resourceContext || 'No specific resources provided - use your general knowledge.'}

**Requirements:**
- Create an engaging introduction that hooks the learner
- Break down complex concepts into digestible sections
- Include practical examples and real-world applications
- Add interactive elements or questions for engagement
- Provide a clear summary and next steps
- Ensure the content is appropriate for ${userLevel} level learners
- Structure the lesson to fit within ${duration} minutes when read aloud

**Important:** Respond ONLY with valid JSON. Do not include any text before or after the JSON object.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No content received from OpenAI');
    }

    try {
      const lessonData = JSON.parse(responseContent) as GeneratedLesson;
      
      // Validate required fields
      if (!lessonData.title || !lessonData.content) {
        throw new Error('Invalid lesson structure received from OpenAI');
      }

      // Ensure arrays exist
      lessonData.objectives = lessonData.objectives || [];
      lessonData.keyPoints = lessonData.keyPoints || [];
      lessonData.estimatedDuration = lessonData.estimatedDuration || duration;

      return lessonData;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw response:', responseContent);
      throw new Error('Failed to parse lesson content from OpenAI response');
    }
  } catch (error) {
    console.error('Error generating lesson content:', error);
    
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('OpenAI API authentication failed. Please check your API key.');
      } else {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
    }
    
    throw error;
  }
}

/**
 * Generate a follow-up question based on lesson content
 */
export async function generateFollowUpQuestion(
  lessonContent: string,
  topicName: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an AI tutor. Generate a thoughtful follow-up question based on the lesson content to encourage deeper thinking and engagement.'
        },
        {
          role: 'user',
          content: `Based on this lesson about "${topicName}":\n\n${lessonContent}\n\nGenerate one engaging follow-up question that encourages the student to think deeper about the topic. The question should be open-ended and promote critical thinking.`
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    });

    return completion.choices[0]?.message?.content || 'What aspects of this topic would you like to explore further?';
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    return 'What aspects of this topic would you like to explore further?';
  }
}

/**
 * Estimate token count for content (rough estimation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Check if content exceeds token limits
 */
export function validateContentLength(content: string, maxTokens: number = 4000): boolean {
  const estimatedTokens = estimateTokenCount(content);
  return estimatedTokens <= maxTokens;
}