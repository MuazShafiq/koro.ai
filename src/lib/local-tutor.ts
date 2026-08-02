import { findLocalSubject, findLocalTopic } from '@/lib/local-demo-data';
import {
  generateLocalAILessonPlan,
  generateLocalAITutorAnswer,
  getLocalAIStatus,
  localAIModel,
} from '@/lib/services/localAI';
import { getLocalResourceExcerpts } from '@/lib/local-resources';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

interface LocalLessonChunk {
  id: string;
  title: string;
  content: string;
  duration: number;
  type: string;
  order: number;
}

interface LocalTutorSession {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  status: 'active' | 'completed';
  currentPhase: 'assessment' | 'delivery' | 'interaction' | 'completed';
  currentChunkIndex: number;
  deliveredChunkIndexes: number[];
  interactionCount: number;
  assessmentAnswers: Array<{ question: string; answer: string }>;
  aiProvider: 'ollama' | 'deterministic';
  aiModel: string | null;
  lessonDescription: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'adaptive';
  resourceTitles: string[];
  chunks: LocalLessonChunk[];
  assessmentQuestions: Array<{
    id: string;
    question: string;
    purpose: string;
    audioUrl?: string;
    order: number;
  }>;
}

declare global {
  // Keep local sessions shared across Next.js route bundles in the same dev process.
  var __koroLocalTutorSessions: Map<string, LocalTutorSession> | undefined;
}

const localDataDirectory = path.join(process.cwd(), '.koro-data');
const localSessionsFile = path.join(localDataDirectory, 'sessions.json');

function loadPersistedSessions() {
  try {
    if (!existsSync(localSessionsFile)) return [];
    const parsed = JSON.parse(readFileSync(localSessionsFile, 'utf8'));
    return Array.isArray(parsed) ? parsed as LocalTutorSession[] : [];
  } catch (error) {
    console.warn('Could not load local tutor sessions:', error);
    return [];
  }
}

const sessions =
  globalThis.__koroLocalTutorSessions ||
  (globalThis.__koroLocalTutorSessions = new Map(
    loadPersistedSessions().map((session) => [session.id, session]),
  ));

for (const session of sessions.values()) {
  session.updatedAt ||= session.createdAt;
  session.completedAt ??= null;
  session.status ||= 'active';
  session.deliveredChunkIndexes ||= [];
  session.interactionCount ||= 0;
  session.assessmentAnswers ||= [];
  session.aiProvider ||= 'deterministic';
  session.aiModel ??= null;
  session.lessonDescription ||= `A short, interactive local lesson on ${session.topicName}.`;
  session.difficulty ||= 'adaptive';
  session.resourceTitles ||= [];
}

function persistSessions() {
  try {
    mkdirSync(localDataDirectory, { recursive: true });
    writeFileSync(
      localSessionsFile,
      JSON.stringify(Array.from(sessions.values()), null, 2),
      'utf8',
    );
  } catch (error) {
    console.warn('Could not persist local tutor sessions:', error);
  }
}

function lessonContent(subjectName: string, topicName: string): LocalLessonChunk[] {
  const topic = topicName.toLowerCase();

  if (topic.includes('kinematic')) {
    return [
      {
        id: 'chunk_1',
        title: 'Describing Motion',
        content:
          'Kinematics describes how objects move without first asking what causes the motion. The core quantities are position, displacement, velocity, and acceleration. Displacement is a change in position, while distance is the total path traveled.',
        duration: 4,
        type: 'concept',
        order: 1,
      },
      {
        id: 'chunk_2',
        title: 'Velocity and Acceleration',
        content:
          'Average velocity is displacement divided by elapsed time: $v = \\Delta x / \\Delta t$. Acceleration measures how quickly velocity changes: $a = \\Delta v / \\Delta t$. A negative acceleration does not always mean slowing down; direction matters.',
        duration: 5,
        type: 'equation',
        order: 2,
      },
      {
        id: 'chunk_3',
        title: 'A Worked Example',
        content:
          'Suppose a bicycle starts from rest and accelerates at 2 metres per second squared for 4 seconds. Using $v = u + at$, its final velocity is $0 + 2(4) = 8$ metres per second. The same units check helps catch mistakes.',
        duration: 5,
        type: 'example',
        order: 3,
      },
    ];
  }

  return [
    {
      id: 'chunk_1',
      title: `The Big Idea in ${topicName}`,
      content:
        `${topicName} is easier when we connect definitions to a concrete example. Start by identifying what changes, what stays constant, and which relationship links them. This gives us a reliable mental model before memorizing details.`,
      duration: 4,
      type: 'concept',
      order: 1,
    },
    {
      id: 'chunk_2',
      title: 'Build the Model',
      content:
        `For ${topicName}, write the known information first, state the goal in one sentence, and then choose the simplest rule that connects the two. Explain each step aloud; if a step cannot be explained, that is the part to revisit.`,
      duration: 5,
      type: 'step-by-step',
      order: 2,
    },
    {
      id: 'chunk_3',
      title: 'Check Your Understanding',
      content:
        `Try creating your own small ${subjectName} example for ${topicName}. Change one input and predict the result before calculating it. Comparing your prediction with the result is a powerful way to correct misconceptions.`,
      duration: 4,
      type: 'example',
      order: 3,
    },
  ];
}

export async function createLocalTutorSession(subjectId: string, topicId?: string | null) {
  const subject = findLocalSubject(subjectId);
  const topic = findLocalTopic(topicId);

  if (!subject) {
    return null;
  }

  const topicName = topic?.name || 'General Overview';
  const resourceExcerpts = getLocalResourceExcerpts(
    subjectId,
    topic?.id || null,
    `${subject.name} ${topicName}`,
  );
  const resourceTitles = Array.from(
    new Set(resourceExcerpts.map((excerpt) => excerpt.title)),
  );
  const id = `local-session-${crypto.randomUUID()}`;
  let chunks = lessonContent(subject.name, topicName);
  let assessmentQuestions = [
    {
      id: 'q_1',
      question: `In your own words, what do you already know about ${topicName}?`,
      purpose: 'Check prior knowledge',
      order: 1,
    },
    {
      id: 'q_2',
      question: `What part of ${topicName} feels least clear or most interesting to you?`,
      purpose: 'Choose the right level and emphasis',
      order: 2,
    },
  ];
  let aiProvider: LocalTutorSession['aiProvider'] = 'deterministic';
  let aiModel: string | null = null;
  let lessonDescription = `A short, interactive local lesson on ${topicName}.`;
  let difficulty: LocalTutorSession['difficulty'] = 'adaptive';

  try {
    const status = await getLocalAIStatus();
    if (status.available) {
      const generatedPlan = await generateLocalAILessonPlan(
        subject.name,
        topicName,
        resourceExcerpts,
      );
      chunks = generatedPlan.chunks.map((chunk, index) => ({
        id: `chunk_${index + 1}`,
        title: chunk.title,
        content: chunk.content,
        duration: chunk.duration,
        type: chunk.type,
        order: index + 1,
      }));
      assessmentQuestions = generatedPlan.assessmentQuestions.map((question, index) => ({
        id: `q_${index + 1}`,
        question: question.question,
        purpose: question.purpose,
        order: index + 1,
      }));
      aiProvider = 'ollama';
      aiModel = localAIModel();
      lessonDescription = generatedPlan.description;
      difficulty = generatedPlan.difficulty;
    } else {
      console.warn(`Local AI unavailable; using deterministic lesson plan: ${status.error}`);
    }
  } catch (error) {
    console.warn('Local AI lesson planning failed; using deterministic lesson plan:', error);
  }

  const session: LocalTutorSession = {
    id,
    subjectId,
    subjectName: subject.name,
    topicId: topic?.id || null,
    topicName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    status: 'active',
    currentPhase: 'assessment',
    currentChunkIndex: 0,
    deliveredChunkIndexes: [],
    interactionCount: 0,
    assessmentAnswers: [],
    aiProvider,
    aiModel,
    lessonDescription,
    difficulty,
    resourceTitles,
    chunks,
    assessmentQuestions,
  };
  sessions.set(id, session);
  persistSessions();
  return sessionResponse(session);
}

function sessionResponse(session: LocalTutorSession) {
  const progress = localProgress(session);
  return {
    sessionId: session.id,
    subject: { id: session.subjectId, name: session.subjectName },
    topic: session.topicId ? { id: session.topicId, name: session.topicName } : null,
    currentPhase: session.currentPhase,
    currentChunkIndex: session.currentChunkIndex,
    deliveredChunkIndexes: session.deliveredChunkIndexes,
    progress,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt,
    aiProvider: session.aiProvider,
    aiModel: session.aiModel,
    groundedInLocalResources: session.resourceTitles.length > 0,
    resourceTitles: session.resourceTitles,
    lessonOverview: {
      title: `${session.subjectName}: ${session.topicName}`,
      description: session.lessonDescription,
      estimatedDuration: session.chunks.reduce((sum, chunk) => sum + chunk.duration, 0),
      difficulty: session.difficulty,
    },
    lessonChunks: session.chunks,
    assessmentQuestions: session.assessmentQuestions,
    estimatedDuration: session.chunks.reduce((sum, chunk) => sum + chunk.duration, 0),
    welcomeAudioUrl: null,
  };
}

export function getLocalTutorSession(sessionId: string) {
  const session = sessions.get(sessionId);
  return session ? sessionResponse(session) : null;
}

export function exportLocalTutorSessions() {
  return Array.from(sessions.values()).map((session) => sessionResponse(session));
}

export function resetLocalTutorSessions() {
  sessions.clear();
  persistSessions();
}

export function assessLocalTutorSession(sessionId: string, answers: Array<{ answer?: string }>) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const usefulAnswers = answers.filter((answer) => (answer.answer || '').trim().length >= 10);
  const understandingLevel =
    usefulAnswers.length === answers.length ? 'developing' : usefulAnswers.length ? 'beginner' : 'new';
  session.currentPhase = 'delivery';
  session.assessmentAnswers = answers.map((answer, index) => ({
    question: session.assessmentQuestions[index]?.question || `Question ${index + 1}`,
    answer: answer.answer || '',
  }));
  session.updatedAt = new Date().toISOString();
  persistSessions();

  return {
    sessionId,
    evaluation: {
      understanding_level: understandingLevel,
      strengths: ['Willingness to explain current understanding'],
      areas_for_improvement: ['Connect each definition to a concrete example'],
      recommended_approach: 'Short explanations followed by worked examples',
    },
    refinedLessonPlan: { lesson_chunks: session.chunks },
    nextPhase: 'delivery',
    message: 'Assessment completed. Ready to begin lesson delivery.',
  };
}

export function deliverLocalTutorChunk(sessionId: string, chunkIndex: number) {
  const session = sessions.get(sessionId);
  const chunk = session?.chunks[chunkIndex];
  if (!session || !chunk) return null;

  session.currentPhase = 'interaction';
  session.currentChunkIndex = chunkIndex;
  if (!session.deliveredChunkIndexes.includes(chunkIndex)) {
    session.deliveredChunkIndexes.push(chunkIndex);
    session.deliveredChunkIndexes.sort((a, b) => a - b);
  }
  session.updatedAt = new Date().toISOString();
  persistSessions();
  return {
    chunkId: `${sessionId}-${chunk.id}`,
    content: chunk.content,
    audioUrl: null,
    chunkIndex,
    hasAudio: false,
    totalChunks: session.chunks.length,
    isLastChunk: chunkIndex === session.chunks.length - 1,
    conceptsTracked: 1,
    equationsTracked: (chunk.content.match(/\$/g) || []).length / 2,
    progressSummary: {
      progressPercentage: Math.round((session.deliveredChunkIndexes.length / session.chunks.length) * 100),
      deliveredConcepts: session.deliveredChunkIndexes.length,
      totalConcepts: session.chunks.length,
      equationsCount: (chunk.content.match(/\$/g) || []).length / 2,
    },
  };
}

export async function answerLocalTutorQuestion(sessionId: string, question: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const normalized = question.trim().toLowerCase();
  const currentChunk = session.chunks[session.currentChunkIndex];
  const wantsNext = /^(continue|next|go on|keep going)\b/.test(normalized);

  let answer: string;
  if (wantsNext && session.currentChunkIndex < session.chunks.length - 1) {
    answer = 'Use the Continue button to move to the next lesson section.';
  } else if (wantsNext) {
    answer =
      `You have reached the end of this local ${session.topicName} lesson. Complete the lesson when you are ready.`;
  } else {
    try {
      answer = await generateLocalAITutorAnswer({
        subjectName: session.subjectName,
        topicName: session.topicName,
        sectionTitle: currentChunk.title,
        sectionContent: currentChunk.content,
        assessmentContext: session.assessmentAnswers,
        resourceExcerpts: getLocalResourceExcerpts(
          session.subjectId,
          session.topicId,
          question,
        ),
        question,
      });
      session.aiProvider = 'ollama';
      session.aiModel = localAIModel();
    } catch (error) {
      console.warn('Local AI tutor response failed; using deterministic answer:', error);
      answer =
        `A useful way to think about that is to connect it back to ${currentChunk.title.toLowerCase()}. ` +
        `${currentChunk.content} For your question, "${question}", identify the known information first and then say what result you are trying to explain.`;
    }
  }
  session.interactionCount += 1;
  session.updatedAt = new Date().toISOString();
  persistSessions();

  return {
    interactionId: `local-interaction-${crypto.randomUUID()}`,
    answer,
    resourcesUsed: session.resourceTitles.length > 0
      ? session.resourceTitles
      : ['Built-in local lesson notes'],
    lessonAdaptation: wantsNext ? 'Waiting for formal chunk advancement.' : 'Reinforced the current concept.',
    aiProvider: session.aiProvider,
    aiModel: session.aiModel,
    audioUrl: null,
    hasAudio: false,
    timestamp: new Date().toISOString(),
  };
}

function localProgress(session: LocalTutorSession) {
  const delivered = session.deliveredChunkIndexes.length;
  const total = session.chunks.length;
  return {
    progressPercentage: total > 0 ? Math.round((delivered / total) * 100) : 0,
    totalConcepts: total,
    deliveredConcepts: delivered,
    pendingConcepts: Math.max(0, total - delivered),
    equationsCount: session.chunks
      .filter((_, index) => session.deliveredChunkIndexes.includes(index))
      .reduce((count, chunk) => count + (chunk.content.match(/\$/g) || []).length / 2, 0),
    resourceSectionsCovered: delivered,
    avgEngagementScore: Math.min(100, 70 + session.interactionCount * 5),
  };
}

export function getLocalTutorProgress(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return {
    sessionId,
    progress: localProgress(session),
    currentPhase: session.currentPhase,
    currentChunkIndex: session.currentChunkIndex,
    status: session.status,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt,
  };
}

export function validateLocalTutorCompletion(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const progress = localProgress(session);
  const isReadyForCompletion = progress.deliveredConcepts === progress.totalConcepts;
  if (isReadyForCompletion && session.status !== 'completed') {
    session.status = 'completed';
    session.currentPhase = 'completed';
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;
    persistSessions();
  }

  return {
    sessionId,
    isReadyForCompletion,
    status: session.status,
    completedAt: session.completedAt,
    validationResults: {
      chunkCompletion: {
        current: progress.totalConcepts > 0
          ? progress.deliveredConcepts / progress.totalConcepts
          : 0,
        required: 1,
        met: isReadyForCompletion,
      },
    },
    missingRequirements: isReadyForCompletion
      ? []
      : [`Complete ${progress.pendingConcepts} more lesson section${progress.pendingConcepts === 1 ? '' : 's'}`],
    recommendations: isReadyForCompletion
      ? []
      : ['Continue through the remaining lesson sections'],
    progressSummary: {
      conceptsDelivered: progress.deliveredConcepts,
      totalConcepts: progress.totalConcepts,
      progressPercentage: progress.progressPercentage,
      equationsCount: progress.equationsCount,
    },
    sessionMetrics: {
      chunksDelivered: progress.deliveredConcepts,
      totalChunks: progress.totalConcepts,
      totalInteractions: session.interactionCount,
    },
  };
}

export function generateLocalBlackboard(script: string) {
  const equation = script.match(/\$([^$]+)\$/);
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    blackboard: [
      {
        type: 'definition' as const,
        label: 'Core idea',
        content: sentences[0] || script,
      },
      ...(equation
        ? [{
            type: 'equation' as const,
            label: 'Key relationship',
            content: `$${equation[1]}$`,
          }]
        : []),
      ...(sentences.length > 1
        ? [{
            type: 'step-by-step' as const,
            label: 'Remember',
            steps: sentences.slice(1, 4),
          }]
        : []),
    ],
  };
}
