import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "./database.types";
import { isLocalMode } from "@/lib/local-mode";
import { createLocalSupabaseClient } from "./local-client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function createClient(): Promise<SupabaseClient<Database>> {
  if (isLocalMode()) {
    return createLocalSupabaseClient() as unknown as SupabaseClient<Database>;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set KORO_LOCAL_MODE=true for the free local demo.',
    );
  }

  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
