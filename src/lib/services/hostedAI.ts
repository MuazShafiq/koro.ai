import OpenAI from 'openai';

const CLOUDFLARE_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export function hostedAIProvider() {
  return 'cloudflare';
}

export function hostedAIModel() {
  return CLOUDFLARE_MODEL;
}

export function hasHostedAIConfig() {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_AI_TOKEN,
  );
}

export function createHostedAIClient() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || 'missing-account';
  return new OpenAI({
    apiKey: process.env.CLOUDFLARE_AI_TOKEN || 'missing-token',
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`,
  });
}

export const hostedAI = createHostedAIClient();
