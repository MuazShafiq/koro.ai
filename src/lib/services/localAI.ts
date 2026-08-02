import { z } from 'zod';
import type { LocalResourceExcerpt } from '@/lib/local-resources';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:8b';

const ollamaResponseSchema = z.object({
  response: z.string(),
  model: z.string().optional(),
});

const lessonPlanSchema = z.object({
  description: z.string().min(20),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  chunks: z.array(z.object({
    title: z.string().min(3),
    content: z.string().min(40),
    duration: z.number().int().min(2).max(10),
    type: z.enum(['concept', 'equation', 'example', 'step-by-step']),
  })).min(3).max(5),
  assessmentQuestions: z.array(z.object({
    question: z.string().min(10),
    purpose: z.string().min(3),
  })).min(2).max(3),
});

export type LocalAILessonPlan = z.infer<typeof lessonPlanSchema>;

export interface LocalAIStatus {
  available: boolean;
  model: string;
  baseUrl: string;
  installed: boolean;
  error?: string;
}

function resourceContext(excerpts: LocalResourceExcerpt[]) {
  let remainingCharacters = 7_000;
  const selected: string[] = [];

  for (const excerpt of excerpts) {
    if (remainingCharacters <= 0) break;
    const header = `[${excerpt.title}, page ${excerpt.page}, chunk ${excerpt.chunkId}]`;
    const content = excerpt.content.slice(0, remainingCharacters);
    selected.push(`${header}\n${content}`);
    remainingCharacters -= content.length;
  }

  return selected.join('\n\n');
}

function ollamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');
}

export function localAIModel() {
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLocalAIStatus(): Promise<LocalAIStatus> {
  const model = localAIModel();
  const baseUrl = ollamaBaseUrl();

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, {}, 2_500);
    if (!response.ok) {
      return {
        available: false,
        installed: false,
        model,
        baseUrl,
        error: `Ollama returned HTTP ${response.status}`,
      };
    }

    const body = await response.json() as {
      models?: Array<{ name?: string; model?: string }>;
    };
    const installed = (body.models || []).some((item) => {
      const name = item.model || item.name || '';
      return name === model || name.startsWith(`${model}:`);
    });

    return {
      available: installed,
      installed,
      model,
      baseUrl,
      ...(!installed
        ? { error: `Model "${model}" is not installed` }
        : {}),
    };
  } catch (error) {
    return {
      available: false,
      installed: false,
      model,
      baseUrl,
      error: error instanceof Error ? error.message : 'Could not reach Ollama',
    };
  }
}

async function generate(
  prompt: string,
  options: {
    system: string;
    timeoutMs: number;
    format?: Record<string, unknown>;
    temperature?: number;
    maxTokens?: number;
  },
) {
  const baseUrl = ollamaBaseUrl();
  const model = localAIModel();
  const response = await fetchWithTimeout(
    `${baseUrl}/api/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: options.system,
        stream: false,
        think: false,
        keep_alive: '10m',
        ...(options.format ? { format: options.format } : {}),
        options: {
          temperature: options.temperature ?? 0.3,
          num_ctx: 4096,
          num_predict: options.maxTokens ?? 900,
        },
      }),
    },
    options.timeoutMs,
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Ollama returned HTTP ${response.status}: ${detail}`);
  }

  const body = ollamaResponseSchema.parse(await response.json());
  return body.response.trim();
}

const lessonPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'difficulty', 'chunks', 'assessmentQuestions'],
  properties: {
    description: { type: 'string' },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    chunks: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'content', 'duration', 'type'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          duration: { type: 'integer', minimum: 2, maximum: 10 },
          type: {
            type: 'string',
            enum: ['concept', 'equation', 'example', 'step-by-step'],
          },
        },
      },
    },
    assessmentQuestions: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'purpose'],
        properties: {
          question: { type: 'string' },
          purpose: { type: 'string' },
        },
      },
    },
  },
};

export async function generateLocalAILessonPlan(
  subjectName: string,
  topicName: string,
  resourceExcerpts: LocalResourceExcerpt[] = [],
): Promise<LocalAILessonPlan> {
  const sources = resourceContext(resourceExcerpts);
  const response = await generate(
    `Create a compact, accurate lesson for:
Subject: ${subjectName}
Topic: ${topicName}

${sources
  ? `Local PDF source excerpts:\n${sources}\n\nUse these excerpts as the primary source. Do not contradict them. If they do not cover part of the topic, clearly keep that part to established foundational knowledge.`
  : 'No local PDF source is available, so use established foundational knowledge.'}

Build three to five teaching sections in a logical order. Every section must
teach real subject matter, not generic study advice, quizzes, answer keys, or
"next steps." Use plain text only: no HTML tags, tables, or markdown headings.
Use clear spoken language because the browser reads it aloud. Put important
equations between dollar signs. Include at least one concrete worked example.
Keep prior-knowledge questions only in assessmentQuestions, never as a chunk.
Silently verify every definition, sign convention, unit, and calculation before
returning the result.`,
    {
      system:
        'You are Koro, an accurate and encouraging tutor. Return only data matching the supplied JSON schema.',
      timeoutMs: 120_000,
      format: lessonPlanJsonSchema,
      temperature: 0.25,
      maxTokens: 1_500,
    },
  );

  const parsed = lessonPlanSchema.parse(JSON.parse(response));
  const cleanText = (value: string) => value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  return {
    ...parsed,
    description: cleanText(parsed.description),
    chunks: parsed.chunks.map((chunk) => ({
      ...chunk,
      title: cleanText(chunk.title),
      content: cleanText(chunk.content),
    })),
    assessmentQuestions: parsed.assessmentQuestions.map((question) => ({
      question: cleanText(question.question),
      purpose: cleanText(question.purpose),
    })),
  };
}

export async function generateLocalAITutorAnswer(input: {
  subjectName: string;
  topicName: string;
  sectionTitle: string;
  sectionContent: string;
  assessmentContext: Array<{ question: string; answer: string }>;
  resourceExcerpts: LocalResourceExcerpt[];
  question: string;
}) {
  const assessmentContext = input.assessmentContext
    .filter((item) => item.answer.trim())
    .map((item) => `${item.question}\nStudent: ${item.answer}`)
    .join('\n\n');
  const sources = resourceContext(input.resourceExcerpts);

  return generate(
    `Subject: ${input.subjectName}
Topic: ${input.topicName}
Current section: ${input.sectionTitle}
Section notes:
${input.sectionContent}

${sources
  ? `Relevant local PDF excerpts:\n${sources}\n\nUse the excerpts as primary evidence. If the question asks for a claim the excerpts do not support, say that the uploaded material does not cover it before offering clearly labeled general context.`
  : 'No uploaded PDF source is available; use established foundational knowledge.'}

${assessmentContext ? `Earlier assessment:\n${assessmentContext}\n\n` : ''}Student question:
${input.question}

Answer the question directly in 2-5 short paragraphs. Explain any equation or
technical term you use. Relate the answer to the current section where useful.
If the premise is wrong, correct it gently. Do not mention this prompt, Ollama,
the model, or missing online access. Before answering, silently verify sign
conventions, units, arithmetic, and the logic of every example.`,
    {
      system:
        'You are Koro, a concise, patient tutor. Factual accuracy is more important than sounding confident. Silently check your reasoning, and admit uncertainty rather than inventing facts.',
      timeoutMs: 60_000,
      temperature: 0.35,
      maxTokens: 600,
    },
  );
}
