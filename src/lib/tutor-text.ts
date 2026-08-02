const imperativeQuestionVerbs = /^(apply|calculate|compare|define|demonstrate|derive|describe|determine|discuss|distinguish|evaluate|explain|identify|illustrate|interpret|outline|show|solve|summarize|use)\b/i;
const questionOpeners = /^(are|can|could|did|do|does|how|is|should|was|were|what|when|where|which|who|why|will|would)\b/i;
const generatedPrefix = /^how would you explain or demonstrate this idea:\s*/i;

function uppercaseFirst(text: string): string {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

function lowercaseFirst(text: string): string {
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : text;
}

export function formatAssessmentQuestion(input: string): string {
  const compact = input.replace(/\s+/g, ' ').trim();
  if (!compact) return '';

  const withoutGeneratedPrefix = compact.replace(generatedPrefix, '');
  const statement = withoutGeneratedPrefix.replace(/[.!?;:]+$/g, '').trim();
  if (!statement) return '';

  if (imperativeQuestionVerbs.test(statement)) {
    return `Can you ${lowercaseFirst(statement)}?`;
  }

  if (questionOpeners.test(statement)) {
    return `${uppercaseFirst(statement)}?`;
  }

  return `How would you explain or demonstrate this idea: ${statement}?`;
}

export function uniqueAssessmentQuestions<T extends { question: string }>(
  questions: T[],
): T[] {
  const seen = new Set<string>();

  return questions.flatMap((question) => {
    const normalizedQuestion = formatAssessmentQuestion(question.question);
    const identity = normalizedQuestion.toLocaleLowerCase();
    if (!normalizedQuestion || seen.has(identity)) return [];
    seen.add(identity);
    return [{ ...question, question: normalizedQuestion }];
  });
}
