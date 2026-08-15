import { createAuthClient } from '@neondatabase/auth';
import { SupabaseAuthAdapter } from '@neondatabase/auth/vanilla/adapters';
import { createClient as createNeonClient } from '@neondatabase/neon-js';
import { Database } from "./database.types";

const authUrl =
  typeof window === 'undefined'
    ? 'http://localhost:3000/api/auth'
    : `${window.location.origin}/api/auth`;
const dataApiUrl =
  process.env.NEXT_PUBLIC_NEON_DATA_API_URL ??
  'https://not-configured.apirest.invalid/neondb/rest/v1';

export const createClient = () => {
  const auth = createAuthClient(authUrl, {
    adapter: SupabaseAuthAdapter(),
  });
  const data = createNeonClient<Database>({
    dataApi: {
      url: dataApiUrl,
      getToken: async () => {
        const response = await fetch(`${authUrl}/token`, {
          credentials: 'include',
        });

        if (!response.ok) return null;
        const result = (await response.json()) as { token?: string };
        return result.token ?? null;
      },
    },
  });

  return Object.assign(data, { auth });
};

export type BrowserDataClient = ReturnType<typeof createClient>;
