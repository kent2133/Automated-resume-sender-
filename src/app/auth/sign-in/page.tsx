import Link from "next/link";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/navigation";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

import { signInAction } from "../actions";
import styles from "../auth.module.css";
import { AuthShell } from "../auth-shell";

export const instant = false;

const errorMessages: Record<string, string> = {
  callback: "The confirmation link could not be completed. Request a new link or sign in again.",
  config: "Account access is not configured for this deployment yet.",
  credentials: "Could not sign in. Check your email and password, then try again.",
  email: "Enter a valid email address.",
  password: "Enter your password.",
};

const noticeMessages: Record<string, string> = {
  check_email: "Check your inbox and confirm your email before signing in.",
  confirmed: "Your email is confirmed. You can now sign in.",
  signed_out: "You have been signed out safely.",
};

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
    notice?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const query = await searchParams;
  const next = getSafeNextPath(getSingleValue(query.next));
  const configuration = getSupabasePublicConfiguration();
  const errorCode = getSingleValue(query.error);
  const noticeCode = getSingleValue(query.notice);

  if (configuration.configured) {
    const result = await getServerSupabaseClient();

    if (result.configured) {
      const { data } = await result.client.auth.getClaims();

      if (data?.claims) {
        redirect(next);
      }
    }
  }

  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const noticeMessage = noticeCode ? noticeMessages[noticeCode] : null;

  return (
    <AuthShell
      eyebrow="Secure account access"
      title="Welcome back."
      description="Sign in to open your private profile, resume library, and application workspace."
      footer={
        <p>
          New to ApplyFlow?{" "}
          <Link href={`/auth/sign-up?${new URLSearchParams({ next }).toString()}`}>
            Create a private account
          </Link>
        </p>
      }
    >
      {!configuration.configured ? (
        <p className={styles.configuration} role="status">
          Supabase authentication is unavailable because this deployment is missing its public project URL or publishable key.
        </p>
      ) : null}
      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {noticeMessage ? (
        <p className={styles.message} role="status">
          {noticeMessage}
        </p>
      ) : null}

      <form action={signInAction} className={styles.form}>
        <input type="hidden" name="next" value={next} />
        <label className={styles.field}>
          <span>Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            disabled={!configuration.configured}
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            disabled={!configuration.configured}
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          disabled={!configuration.configured}
        >
          Sign in to ApplyFlow
        </button>
      </form>
    </AuthShell>
  );
}
