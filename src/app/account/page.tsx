import Link from "next/link";
import { redirect } from "next/navigation";

import { getServerSupabaseClient } from "@/lib/supabase/server";

import { signOutAction } from "../auth/actions";
import styles from "../auth/auth.module.css";
import { AuthShell } from "../auth/auth-shell";

export const instant = false;

export default async function AccountPage() {
  const result = await getServerSupabaseClient();

  if (!result.configured) {
    redirect("/auth/sign-in?error=config&next=/account");
  }

  const { data } = await result.client.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth/sign-in?next=/account");
  }

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Verified ApplyFlow account";

  return (
    <AuthShell
      eyebrow="Authenticated session"
      title="Your account is ready."
      description="This verified session can access your account-owned records and private resume storage."
      footer={
        <p>
          ApplyFlow verifies your session before rendering private routes and relies on database row level security for every owned record.
        </p>
      }
    >
      <div className={styles.accountMeta}>
        <span>Signed in as</span>
        <strong>{email}</strong>
      </div>
      <div className={styles.accountActions}>
        <Link href="/setup" className={styles.primary}>
          Open profile setup
        </Link>
        <Link href="/resumes" className={styles.secondaryLink}>
          Manage resumes
        </Link>
        <Link href="/jobs/new" className={styles.secondaryLink}>
          Add a job
        </Link>
        <Link href="/" className={styles.secondaryLink}>
          Open workspace
        </Link>
      </div>
      <form action={signOutAction}>
        <button type="submit" className={styles.signOut}>
          Sign out securely
        </button>
      </form>
    </AuthShell>
  );
}
