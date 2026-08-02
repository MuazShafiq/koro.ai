import OpenAI from 'openai';

type AIProvider = 'cloudflare' | 'openai';

export function hostedAIProvider(): AIProvider {
  if (process.env.AI_PROVIDER === 'openai') return 'openai';
  return 'cloudflare';
}

export function hostedAIModel() {
  if (hostedAIProvider() === 'cloudflare') {
    return process.env.CLOUDFLARE_AI_MODEL ||
      '@cf/meta/llama-3.1-8b-instruct-fast';
  }
  return process.env.OPENAI_MODEL || 'gpt-4o';
}

export function hasHostedAIConfig() {
  if (hostedAIProvider() === 'cloudflare') {
    return Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_AI_TOKEN,
    );
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

export function createHostedAIClient() {
  if (hostedAIProvider() === 'cloudflare') {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'missing-account';
    return new OpenAI({
      apiKey: process.env.CLOUDFLARE_AI_TOKEN || 'missing-token',
      baseURL:
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
    });
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'missing-openai-key',
  });
}

export const hostedAI = createHostedAIClient();
