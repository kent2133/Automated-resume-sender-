export function GET() {
  return Response.json({
    service: "ApplyFlow",
    status: "ok",
    databaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  });
}
