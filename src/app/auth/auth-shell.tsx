import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./auth.module.css";

type AuthShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  footer: ReactNode;
  title: string;
};

export function AuthShell({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthShellProps) {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="ApplyFlow home">
          <span className={styles.brandMark}>AF</span>
          <span>ApplyFlow</span>
        </Link>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          Dashboard preview
        </Link>
      </header>

      <section className={styles.shell}>
        <aside className={styles.context}>
          <span className={styles.contextIcon} aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <p>Private workspace</p>
          <h2>Your career records stay connected to your account.</h2>
          <ul>
            <li>Row level security isolates each account.</li>
            <li>Resume files remain in private storage.</li>
            <li>Applications stay review-first and traceable.</li>
          </ul>
        </aside>

        <div className={styles.card}>
          <div className={styles.cardIcon} aria-hidden="true">
            <LockKeyhole size={20} />
          </div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.description}>{description}</p>
          {children}
          <div className={styles.footer}>{footer}</div>
        </div>
      </section>
    </main>
  );
}
