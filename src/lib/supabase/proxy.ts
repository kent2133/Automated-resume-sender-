import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";

const PROTECTED_ROUTE_PREFIXES = [
  "/setup",
  "/account",
  "/resumes",
  "/jobs/new",
  "/api/private",
];

function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function createSignInRedirect(request: NextRequest, response?: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/sign-in";
  url.search = "";
  url.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  const redirectResponse = NextResponse.redirect(url);

  if (response) {
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);

      if (value) {
        redirectResponse.headers.set(header, value);
      }
    }
  }

  redirectResponse.headers.set("Cache-Control", "private, no-store");
  return redirectResponse;
}

export async function updateSession(request: NextRequest) {
  const configuration = getSupabasePublicConfiguration();
  const protectedRoute = isProtectedRoute(request.nextUrl.pathname);

  if (!configuration.configured) {
    if (protectedRoute) {
      const response = createSignInRedirect(request);
      response.headers.set("X-ApplyFlow-Auth", "not-configured");
      return response;
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    configuration.url,
    configuration.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headersToSet).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  if (protectedRoute && !data?.claims) {
    return createSignInRedirect(request, supabaseResponse);
  }

  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  return supabaseResponse;
}
