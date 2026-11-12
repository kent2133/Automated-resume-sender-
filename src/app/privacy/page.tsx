import { Database, FileLock2, ScanSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import styles from "../info.module.css";

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>AF</span>
            ApplyFlow
          </Link>
          <Link href="/" className={styles.backLink}>Back to dashboard</Link>
        </header>

        <section className={styles.hero}>
          <p className={styles.eyebrow}>Privacy by design</p>
          <h1>Your career data stays under your control.</h1>
          <p>
            ApplyFlow prepares applications with data you approve. It does not invent answers, store employer passwords, bypass verification, or submit unknown forms in the background.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.cardIcon}><FileLock2 size={18} /></span>
            <h2>Private resume storage</h2>
            <p>Resume files belong in a private Supabase bucket protected by row level security. Public repository files never contain your resume.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><Database size={18} /></span>
            <h2>Account-owned records</h2>
            <p>Profiles, answers, jobs, and applications are isolated by user ID. The database denies access unless the authenticated user owns the record.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><ScanSearch size={18} /></span>
            <h2>Review before action</h2>
            <p>The extension shows what it plans to fill, why each field matched, and what still needs your attention before anything is sent.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><ShieldCheck size={18} /></span>
            <h2>Protected questions</h2>
            <p>Demographic, disability, veteran, legal consent, salary, and work authorization questions always remain reviewable and are never inferred.</p>
          </article>
          <article className={styles.wideCard}>
            <h2>What ApplyFlow will not do</h2>
            <ul>
              <li>It will not bypass CAPTCHA, multi-factor authentication, or anti-bot controls.</li>
              <li>It will not collect browser cookies, employer credentials, or unrelated browsing activity.</li>
              <li>It will not apply to duplicate jobs or change a saved answer without showing the change.</li>
              <li>It will not make a final submission from the generic form adapter.</li>
            </ul>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>ApplyFlow portfolio build</span>
          <span>Philippines based</span>
        </footer>
      </div>
    </main>
  );
}
