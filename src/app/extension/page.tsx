import { FileCheck2, Puzzle, ScanLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import styles from "../info.module.css";

export default function ExtensionPage() {
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
          <p className={styles.eyebrow}>Companion extension</p>
          <h1>Fill the real form without surrendering control.</h1>
          <p>
            The ApplyFlow Assistant works beside the job page you already opened. It scans visible fields, proposes approved answers, attaches the selected resume, and stops before the final employer submission.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.cardIcon}><Puzzle size={18} /></span>
            <h2>Install locally</h2>
            <p>Build the extension, open Chrome extensions, enable Developer mode, then load the generated extension folder as unpacked.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><ShieldCheck size={18} /></span>
            <h2>Permission only when used</h2>
            <p>ApplyFlow uses temporary active-tab access after you open the assistant. It does not request permanent access to every website.</p>
          </article>
          <article className={styles.wideCard}>
            <h2>How one assisted application works</h2>
            <ol className={styles.steps}>
              <li><div><strong>Open a job application</strong><span>Sign in normally and navigate to the form yourself.</span></div></li>
              <li><div><strong>Scan the current step</strong><span>The extension reads visible labels, required fields, and supported file inputs.</span></div></li>
              <li><div><strong>Review the field plan</strong><span>High-confidence safe fields are ready, sensitive questions are flagged, and unknowns stay empty.</span></div></li>
              <li><div><strong>Fill approved fields</strong><span>Your selected values are inserted and verified against the actual controls.</span></div></li>
              <li><div><strong>Review and submit yourself</strong><span>ApplyFlow highlights what remains, but you control the employer site&apos;s final Submit action.</span></div></li>
            </ol>
            <p className={styles.notice}>The extension pauses for CAPTCHA, login prompts, legal consent, cross-origin uploaders, and unresolved required questions.</p>
          </article>
          <article className={styles.wideCard}>
            <h2>Compatibility is decided site by site</h2>
            <ul>
              <li>Standard employer forms with native inputs can use review-first scanning, safe field filling, and a selected PDF attachment.</li>
              <li>Custom uploaders, embedded third-party forms, and unknown required questions stay manual until a dedicated adapter is tested.</li>
              <li>OnlineJobs.ph uses manual companion mode because its terms prohibit automated means without express permission.</li>
            </ul>
            <p className={styles.notice}>On OnlineJobs.ph, ApplyFlow can prepare copyable answers and a checklist, but it does not read or change the page.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><ScanLine size={18} /></span>
            <h2>Explainable matching</h2>
            <p>Each proposed answer includes its source and confidence, such as an exact email autocomplete match or a reviewed work authorization answer.</p>
          </article>
          <article className={styles.card}>
            <span className={styles.cardIcon}><FileCheck2 size={18} /></span>
            <h2>Resume verification</h2>
            <p>After attachment, ApplyFlow verifies the filename and size shown by the form and discards temporary file bytes.</p>
          </article>
        </section>

        <footer className={styles.footer}>
          <Link href="/privacy">Read the privacy design</Link>
          <span>Manifest V3 assistant</span>
        </footer>
      </div>
    </main>
  );
}
