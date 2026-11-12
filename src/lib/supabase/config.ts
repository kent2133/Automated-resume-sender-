export type SupabaseConfigurationError = {
  code: "SUPABASE_NOT_CONFIGURED" | "SUPABASE_URL_INVALID";
  message: string;
  missing: string[];
};

export type SupabasePublicConfiguration =
  | {
      configured: true;
      url: string;
      publishableKey: string;
      error: null;
    }
  | {
      configured: false;
      url: null;
      publishableKey: null;
      error: SupabaseConfigurationError;
    };

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabasePublicConfiguration(): SupabasePublicConfiguration {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missing: string[] = [];

  if (!url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  if (!url || !publishableKey) {
    return {
      configured: false,
      url: null,
      publishableKey: null,
      error: {
        code: "SUPABASE_NOT_CONFIGURED",
        message: `Supabase is not configured. Add ${missing.join(" and ")} to the environment.`,
        missing,
      },
    };
  }

  if (!isHttpUrl(url)) {
    return {
      configured: false,
      url: null,
      publishableKey: null,
      error: {
        code: "SUPABASE_URL_INVALID",
        message: "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL.",
        missing: [],
      },
    };
  }

  return {
    configured: true,
    url,
    publishableKey,
    error: null,
  };
}
