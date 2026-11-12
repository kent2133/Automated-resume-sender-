import { NextResponse, type NextRequest } from "next/server";

import { getSafeNextPath } from "@/lib/auth/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const next = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const result = await getServerSupabaseClient();

  if (result.configured && code) {
    const { error } = await result.client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (!error) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  }

  const errorUrl = new URL("/auth/sign-in", request.nextUrl.origin);
  errorUrl.searchParams.set(
    "error",
    result.configured ? "callback" : "config",
  );
  errorUrl.searchParams.set("next", next);
  return NextResponse.redirect(errorUrl);
}
