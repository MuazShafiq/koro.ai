import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { logger } from '../../../lib/logger';
import { createClient } from '../../../utils/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BlackboardItem {
  type: 'text' | 'equation' | 'diagram' | 'step-by-step' | 'definition' | 'example';
  label: string;
  content?: string;
  description?: string;
  steps?: string[];
}

interface BlackboardResponse {
  blackboard: BlackboardItem[];
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('BLACKBOARD-GENERATE', 'Starting blackboard content generation', {}, requestId);
  
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('BLACKBOARD-GENERATE', 'Authentication failed', { authError }, requestId);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 401 }
      );
    }
    
    logger.info('BLACKBOARD-GENERATE', 'User authenticated', { userId: user.id }, requestId);

    // Parse request body
    const { script } = await request.json();
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: 'Script is required and must be a string' },
        { status: 400 }
      );
    }

    logger.openai('Generating blackboard content', {
      userId: user.id,
      scriptLength: script.length
    });

    // Prepare the detailed prompt for GPT-4o
    const systemPrompt = `You are acting as a digital teaching assistant for a voice-first AI tutor. You will be provided with a lesson script designed for spoken delivery. Your task is to analyze the script like a human teacher and make an intelligent judgment about whether any content should appear visually on the blackboard.

**CRITICAL JUDGMENT CRITERIA:**
First, determine if the script contains educational content worthy of blackboard display. If the script is:
- A simple confirmation ("Yes", "That's correct", "Good job")
- A brief acknowledgment ("I understand", "Let me help you")
- Small talk or conversational filler
- Questions without educational content
- Generic responses without teaching value

Then return an EMPTY blackboard array: {"blackboard": []}

**ONLY display content when the script contains:**
- Key definitions that students should remember
- Important equations or formulas
- Diagrams or graphical concepts that aid understanding
- Step-by-step procedures or processes
- Examples with calculations or demonstrations
- Conceptual frameworks or models
- Lists of important points or principles

Given the lesson script, identify selective, pedagogically valuable content a teacher would write on a classroom board during a lesson. Avoid including filler content, narration, or generic conversation. The goal is visual clarity and educational value, not full transcript duplication.

Be selective and purposeful - not every response needs blackboard content. Only extract content when it genuinely enhances student learning and comprehension.

Return your response as a JSON object with a "blackboard" array containing objects with the following structure:
- type: "text" | "equation" | "diagram" | "step-by-step" | "definition" | "example"
- label: A descriptive label for the content
- content: The actual content (for text, equation, definition, example types)
- description: A description of visual elements (for diagram type)
- steps: An array of step strings (for step-by-step type)

Example output format:
{
  "blackboard": [
    {
      "type": "equation",
      "label": "Newton's Second Law",
      "content": "F = ma"
    },
    {
      "type": "example",
      "label": "Example Calculation",
      "content": "Force = 2 kg × 3 m/s² = 6 N"
    },
    {
      "type": "diagram",
      "label": "Free Body Diagram",
      "description": "Inclined plane with a block and force vectors: gravity (down), normal (perpendicular), friction (opposite motion)."
    },
    {
      "type": "definition",
      "label": "Acceleration",
      "content": "Acceleration = Change in velocity / Time"
    }
  ]
}`;

    // Call OpenAI GPT-4o
    let completion;
    try {
      logger.info('BLACKBOARD-GENERATE', 'Calling OpenAI API', { 
        model: 'gpt-4o',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        scriptLength: script.length 
      }, requestId);
      
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze this lesson script and extract blackboard-worthy content:\n\n${script}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });
      
      logger.info('BLACKBOARD-GENERATE', 'OpenAI API call successful', {
        model: completion.model,
        usage: completion.usage
      }, requestId);
    } catch (openaiError) {
      logger.error('BLACKBOARD-GENERATE', 'OpenAI API call failed', {
        error: openaiError instanceof Error ? openaiError.message : String(openaiError),
        stack: openaiError instanceof Error ? openaiError.stack : undefined
      }, requestId);
      throw openaiError;
    }

    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let blackboardData: BlackboardResponse;
    try {
      // Log the raw response for debugging
      logger.info('BLACKBOARD-GENERATE', `Raw OpenAI response for user ${user.id}`, {
        content: responseContent,
        contentLength: responseContent.length,
        contentType: typeof responseContent
      }, requestId);
      
      // Clean the response content - remove markdown code blocks if present
      let cleanedContent = responseContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        logger.info('BLACKBOARD-GENERATE', 'Removed markdown code blocks from response', {
          originalLength: responseContent.length,
          cleanedLength: cleanedContent.length
        }, requestId);
      }
      
      blackboardData = JSON.parse(cleanedContent);
    } catch (parseError) {
      logger.error('BLACKBOARD-GENERATE', 'Failed to parse OpenAI response as JSON', {
        userId: user.id,
        error: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined,
        rawContent: responseContent,
        contentLength: responseContent.length,
        contentPreview: responseContent.substring(0, 500)
      }, requestId);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate the response structure
    if (!blackboardData.blackboard || !Array.isArray(blackboardData.blackboard)) {
      throw new Error('Invalid blackboard data structure');
    }

    logger.openai('Blackboard content generated successfully', {
      userId: user.id,
      itemCount: blackboardData.blackboard.length
    });

    return NextResponse.json(blackboardData);

  } catch (error) {
    logger.error('BLACKBOARD-GENERATE', 'Error generating blackboard content', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, requestId);

    return NextResponse.json(
      { error: 'Failed to generate blackboard content' },
      { status: 500 }
    );
  }
}