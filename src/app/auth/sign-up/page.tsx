import Link from "next/link";
import { redirect } from "next/navigation";

import { getSafeNextPath } from "@/lib/auth/navigation";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import { getServerSupabaseClient } from "@/lib/supabase/server";

import { signUpAction } from "../actions";
import styles from "../auth.module.css";
import { AuthShell } from "../auth-shell";

export const instant = false;

const errorMessages: Record<string, string> = {
  config: "Account creation is not configured for this deployment yet.",
  email: "Enter a valid email address.",
  password: "Use a password with at least 8 characters.",
  password_match: "The two passwords do not match.",
  signup: "The account could not be created. Try again or sign in if you already registered.",
};

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const query = await searchParams;
  const next = getSafeNextPath(getSingleValue(query.next));
  const configuration = getSupabasePublicConfiguration();
  const errorCode = getSingleValue(query.error);

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

  return (
    <AuthShell
      eyebrow="Private workspace setup"
      title="Create your account."
      description="Use one verified email to protect your profile, saved answers, resumes, jobs, and application history."
      footer={
        <p>
          Already registered?{" "}
          <Link href={`/auth/sign-in?${new URLSearchParams({ next }).toString()}`}>
            Sign in instead
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

      <form action={signUpAction} className={styles.form}>
        <input type="hidden" name="next" value={next} />
        <label className={styles.field}>
          <span>Full name</span>
          <input
            type="text"
            name="fullName"
            autoComplete="name"
            maxLength={120}
            disabled={!configuration.configured}
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            required
            aria-describedby="password-hint"
            disabled={!configuration.configured}
          />
        </label>
        <p id="password-hint" className={styles.hint}>
          Use at least 8 characters and a password you do not reuse elsewhere.
        </p>
        <label className={styles.field}>
          <span>Confirm password</span>
          <input
            type="password"
            name="passwordConfirmation"
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!configuration.configured}
          />
        </label>
        <button
          type="submit"
          className={styles.primary}
          disabled={!configuration.configured}
        >
          Create private account
        </button>
      </form>
    </AuthShell>
  );
}
