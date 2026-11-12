import { getSupabasePublicConfiguration } from "@/lib/supabase/config";

export async function GET() {
  const configuration = getSupabasePublicConfiguration();

  if (!configuration.configured) {
    return Response.json({
      service: "ApplyFlow",
      status: "ok",
      databaseConfigured: false,
      databaseReachable: false,
      schemaReady: false,
    });
  }

  let databaseReady = false;

  try {
    const response = await fetch(new URL("/rest/v1/", configuration.url), {
      cache: "no-store",
      headers: {
        Accept: "application/openapi+json",
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
      schemaReady: databaseReady,
    },
    { status: databaseReady ? 200 : 503 },
  );
}
