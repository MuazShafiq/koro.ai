export interface BlackboardContentItem {
  type: 'text' | 'equation' | 'diagram' | 'step-by-step' | 'definition' | 'example';
  label: string;
  content?: string;
  description?: string;
  steps?: string[];
}

function cleanSentence(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function generateDeterministicBlackboard(
  script: string,
): { blackboard: BlackboardContentItem[] } {
  const normalized = script.replace(/\s+/g, ' ').trim();
  if (!normalized) return { blackboard: [] };

  const items: BlackboardContentItem[] = [];
  const equationMatches = normalized.match(
    /(?:^|[.;]\s*)([A-Za-zΔ][A-Za-z0-9Δ_()\s/^-]{0,24}=\s*[^.;!?]{1,90})/g,
  ) || [];

  for (const [index, match] of equationMatches.slice(0, 3).entries()) {
    const equation = cleanSentence(match.replace(/^[.;]\s*/, ''));
    if (!equation) continue;
    items.push({
      type: 'equation',
      label: `Key equation ${index + 1}`,
      content: equation,
    });
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(cleanSentence)
    .filter(sentence => sentence.length >= 25 && sentence.length <= 320);

  const definition = sentences.find(sentence =>
    /\b(is defined as|means|refers to|is the rate|is a measure|describes)\b/i.test(sentence),
  );
  if (definition) {
    items.push({
      type: 'definition',
      label: 'Key definition',
      content: definition,
    });
  }

  const example = sentences.find(sentence =>
    /\b(for example|suppose|consider|imagine|if an? object|let us)\b/i.test(sentence),
  );
  if (example) {
    items.push({
      type: 'example',
      label: 'Worked idea',
      content: example,
    });
  }

  if (items.length === 0) {
    const keyIdea = sentences[0] || normalized.slice(0, 280);
    items.push({
      type: 'text',
      label: 'Key idea',
      content: keyIdea,
    });
  }

  return { blackboard: items.slice(0, 5) };
}
