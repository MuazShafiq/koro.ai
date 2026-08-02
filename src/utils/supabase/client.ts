import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { isLocalMode } from "@/lib/local-mode";
import { createLocalSupabaseClient } from "./local-client";
import { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = (): SupabaseClient<Database> => {
  if (isLocalMode()) {
    return createLocalSupabaseClient() as unknown as SupabaseClient<Database>;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_KORO_LOCAL_MODE=true for the free local demo.',
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};
