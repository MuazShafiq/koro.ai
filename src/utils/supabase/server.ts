import {
  createClient as createNeonClient,
  type NeonPostgrestClient,
} from '@neondatabase/neon-js';
import { auth } from '@/lib/auth/server';
import { Database } from "./database.types";

const dataApiUrl =
  process.env.NEON_DATA_API_URL ??
  process.env.NEXT_PUBLIC_NEON_DATA_API_URL ??
  'https://not-configured.apirest.invalid/neondb/rest/v1';

type AuthError = { message: string } | null;
type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};
type AuthSession = {
  user: AuthUser;
};

export type ServerDataClient = NeonPostgrestClient<Database> & {
  auth: {
    getSession: () => Promise<{
      data: { session: AuthSession | null };
      error: AuthError;
    }>;
    getUser: () => Promise<{
      data: { user: AuthUser | null };
      error: AuthError;
    }>;
  };
};

function normalizeError(error: unknown): AuthError {
  if (!error) return null;
  if (typeof error === 'object' && 'message' in error) {
    return { message: String(error.message) };
  }
  return { message: 'Authentication request failed' };
}

async function getSessionData() {
  const result = await auth.getSession();
  return {
    session: result.data?.user ? { user: result.data.user } : null,
    user: result.data?.user ?? null,
    error: normalizeError(result.error),
  };
}

export async function createClient(): Promise<ServerDataClient> {
  const tokenResult = await auth.token();
  const accessToken = tokenResult.data?.token ?? null;
  const dataClient = createNeonClient<Database>({
    dataApi: {
      url: dataApiUrl,
      getToken: async () => accessToken,
    },
  });

  return Object.assign(dataClient, {
    auth: {
      async getSession() {
        const { session, error } = await getSessionData();
        return { data: { session }, error };
      },
      async getUser() {
        const { user, error } = await getSessionData();
        return { data: { user }, error };
      },
    },
  }) as ServerDataClient;
}
