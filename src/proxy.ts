import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/setup/:path*",
    "/account/:path*",
    "/resumes/:path*",
    "/jobs/new/:path*",
    "/api/private/:path*",
    "/auth/:path*",
  ],
};
