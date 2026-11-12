import { getSupabasePublicConfiguration } from "@/lib/supabase/config";

export async function GET() {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration.configured) {
    return Response.json({
      service: "ApplyFlow",
      status: "ok",
      databaseConfigured: false,
      databaseReachable: false,
      schemaProtected: true,
    });
  }

  let databaseReady = false;

  try {
    const response = await fetch(new URL("/auth/v1/health", configuration.url), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        apikey: configuration.publishableKey,
      },
      signal: AbortSignal.timeout(5_000),
    });
    databaseReady = response.ok;
  } catch {
    databaseReady = false;
  }

  return Response.json(
    {
      service: "ApplyFlow",
      status: databaseReady ? "ok" : "degraded",
      databaseConfigured: true,
      databaseReachable: databaseReady,
      schemaProtected: true,
    },
    { status: databaseReady ? 200 : 503 },
  );
}
