"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

import {
  getSupabasePublicConfiguration,
  type SupabaseConfigurationError,
} from "./config";

export type BrowserSupabaseClientResult =
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

let browserClient: SupabaseClient<Database> | null = null;

export function getBrowserSupabaseClient(): BrowserSupabaseClientResult {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration.configured) {
    return {
      configured: false,
      client: null,
      error: configuration.error,
    };
  }

  browserClient ??= createBrowserClient<Database>(
    configuration.url,
    configuration.publishableKey,
  );

  return {
    configured: true,
    client: browserClient,
    error: null,
  };
}

export function createClient() {
  return getBrowserSupabaseClient().client;
}
