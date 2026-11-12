import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";

import {
  getSupabasePublicConfiguration,
  type SupabaseConfigurationError,
} from "./config";

export type ServerSupabaseClientResult =
  | {
      configured: true;
      client: SupabaseClient<Database>;
      error: null;
    }
  | {
      configured: false;
      client: null;
      error: SupabaseConfigurationError;
    };

export async function getServerSupabaseClient(): Promise<ServerSupabaseClientResult> {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration.configured) {
    return {
      configured: false,
      client: null,
      error: configuration.error,
    };
  }

  const cookieStore = await cookies();
  const client = createServerClient<Database>(
    configuration.url,
    configuration.publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. A Next.js proxy can refresh them.
          }
        },
      },
    },
  );

  return {
    configured: true,
    client,
    error: null,
  };
}

export async function createClient() {
  return (await getServerSupabaseClient()).client;
}
