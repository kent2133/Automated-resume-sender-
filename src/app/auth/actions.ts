"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/navigation";
import { getServerSupabaseClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthErrorCode =
  | "callback"
  | "config"
  | "credentials"
  | "email"
  | "password"
  | "password_match"
  | "signup";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getPassword(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectToAuthError(
  page: "sign-in" | "sign-up",
  error: AuthErrorCode,
  next: string,
): never {
  const query = new URLSearchParams({ error, next });
  redirect(`/auth/${page}?${query.toString()}`);
}

function parseHttpOrigin(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`,
    );

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

async function getRequestOrigin() {
  const configuredOrigin =
    parseHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    parseHttpOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const requestHeaders = await headers();
  const origin = parseHttpOrigin(requestHeaders.get("origin"));

  if (origin && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)) {
    return origin;
  }

  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";

  const localOrigin = parseHttpOrigin(host ? `${protocol}://${host}` : null);
  return localOrigin && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(localOrigin).hostname)
    ? localOrigin
    : null;
}

export async function signInAction(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"));
  const email = getField(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");

  if (!EMAIL_PATTERN.test(email)) {
    redirectToAuthError("sign-in", "email", next);
  }

  if (!password) {
    redirectToAuthError("sign-in", "password", next);
  }

  const result = await getServerSupabaseClient();

  if (!result.configured) {
    redirectToAuthError("sign-in", "config", next);
  }

  const { error } = await result.client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectToAuthError("sign-in", "credentials", next);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const next = getSafeNextPath(formData.get("next"));
  const fullName = getField(formData, "fullName").slice(0, 120);
  const email = getField(formData, "email").toLowerCase();
  const password = getPassword(formData, "password");
  const passwordConfirmation = getPassword(formData, "passwordConfirmation");

  if (!EMAIL_PATTERN.test(email)) {
    redirectToAuthError("sign-up", "email", next);
  }

  if (password.length < 8) {
    redirectToAuthError("sign-up", "password", next);
  }

  if (password !== passwordConfirmation) {
    redirectToAuthError("sign-up", "password_match", next);
  }

  const result = await getServerSupabaseClient();

  if (!result.configured) {
    redirectToAuthError("sign-up", "config", next);
  }

  const origin = await getRequestOrigin();
  const callbackUrl = origin
    ? `${origin}/auth/callback?${new URLSearchParams({ next }).toString()}`
    : undefined;
  const { data, error } = await result.client.auth.signUp({
    email,
    password,
    options: {
      data: fullName ? { full_name: fullName } : undefined,
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    redirectToAuthError("sign-up", "signup", next);
  }

  if (data.session) {
    redirect(next);
  }

  const query = new URLSearchParams({ notice: "check_email", next });
  redirect(`/auth/sign-in?${query.toString()}`);
}

export async function signOutAction() {
  const result = await getServerSupabaseClient();

  if (result.configured) {
    await result.client.auth.signOut({ scope: "local" });
  }

  redirect("/auth/sign-in?notice=signed_out");
}
