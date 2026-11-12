"use client";

import {
  ArrowLeft,
  Check,
  Download,
  FileText,
  LoaderCircle,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ResumeRow } from "@/lib/database.types";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  buildResumeStoragePath,
  MAX_RESUME_BYTES,
  RESUME_BUCKET,
} from "@/lib/supabase/resume-storage";

import styles from "./resumes.module.css";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function resumeMimeType(file: File) {
  if (ALLOWED_TYPES.has(file.type)) {
    return file.type;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function labelFromFileName(fileName: string) {
  return fileName.replace(/\.(pdf|docx?|PDF|DOCX?)$/, "").replace(/[-_]+/g, " ").trim();
}

export default function ResumesPage() {
  const supabaseResult = useMemo(() => getBrowserSupabaseClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(supabaseResult.configured);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    supabaseResult.configured ? null : supabaseResult.error.message,
  );

  const loadResumes = useCallback(
    async (id: string) => {
      if (!supabaseResult.configured) {
        setError(supabaseResult.error.message);
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabaseResult.client
        .from("resumes")
        .select("*")
        .eq("user_id", id)
        .order("is_default", { ascending: false })
        .order("updated_at", { ascending: false });

      if (loadError) {
        setError(loadError.message);
      } else {
        setResumes(data ?? []);
      }
      setLoading(false);
    },
    [supabaseResult],
  );

  useEffect(() => {
    if (!supabaseResult.configured) {
      return;
    }

    let active = true;
    void supabaseResult.client.auth.getUser().then(({ data, error: authError }) => {
      if (!active) {
        return;
      }
      if (authError || !data.user) {
        setError("Sign in before opening your private resume library.");
        setLoading(false);
        return;
      }
      setUserId(data.user.id);
      void loadResumes(data.user.id);
    });

    return () => {
      active = false;
    };
  }, [loadResumes, supabaseResult]);

  const uploadResume = async (file: File | null) => {
    if (!file || !userId || !supabaseResult.configured) {
      return;
    }

    setError(null);
    setMessage(null);
    const mimeType = resumeMimeType(file);
    if (!mimeType) {
      setError("Choose a PDF, DOC, or DOCX resume.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
      setError("Resume files must be larger than 0 bytes and no more than 10 MB.");
      return;
    }

    const resumeId = crypto.randomUUID();
    const storagePath = buildResumeStoragePath(userId, resumeId, file.name);
    setBusyId("upload");

    const { error: uploadError } = await supabaseResult.client.storage
      .from(RESUME_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setBusyId(null);
      return;
    }

    const { error: insertError } = await supabaseResult.client.from("resumes").insert({
      id: resumeId,
      user_id: userId,
      label: labelFromFileName(file.name) || "Resume",
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size_bytes: file.size,
      is_default: resumes.length === 0,
      metadata: { source: "ApplyFlow resume library" },
    });

    if (insertError) {
      await supabaseResult.client.storage.from(RESUME_BUCKET).remove([storagePath]);
      setError(insertError.message);
      setBusyId(null);
      return;
    }

    await loadResumes(userId);
    setMessage(`${file.name} was uploaded to private storage.`);
    setBusyId(null);
  };

  const makeDefault = async (resume: ResumeRow) => {
    if (!userId || !supabaseResult.configured || resume.is_default) {
      return;
    }
    setBusyId(resume.id);
    setError(null);
    setMessage(null);

    const { error: clearError } = await supabaseResult.client
      .from("resumes")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
    const { error: defaultError } = clearError
      ? { error: clearError }
      : await supabaseResult.client
          .from("resumes")
          .update({ is_default: true })
          .eq("user_id", userId)
          .eq("id", resume.id);

    if (defaultError) {
      const previousDefault = resumes.find((item) => item.is_default);
      if (!clearError && previousDefault) {
        await supabaseResult.client
          .from("resumes")
          .update({ is_default: true })
          .eq("user_id", userId)
          .eq("id", previousDefault.id);
      }
      setError(defaultError.message);
    } else {
      await loadResumes(userId);
      setMessage(`${resume.label} is now your default resume.`);
    }
    setBusyId(null);
  };

  const downloadResume = async (resume: ResumeRow) => {
    if (!supabaseResult.configured) {
      return;
    }
    setBusyId(resume.id);
    setError(null);
    const { data, error: signedUrlError } = await supabaseResult.client.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(resume.storage_path, 60, { download: resume.file_name });

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? "A private download link could not be created.");
    } else {
      window.location.assign(data.signedUrl);
    }
    setBusyId(null);
  };

  const deleteResume = async (resume: ResumeRow) => {
    if (!userId || !supabaseResult.configured) {
      return;
    }
    if (!window.confirm(`Delete ${resume.file_name} from private storage?`)) {
      return;
    }

    setBusyId(resume.id);
    setError(null);
    setMessage(null);
    const { error: storageError } = await supabaseResult.client.storage
      .from(RESUME_BUCKET)
      .remove([resume.storage_path]);
    if (storageError) {
      setError(storageError.message);
      setBusyId(null);
      return;
    }

    const { error: deleteError } = await supabaseResult.client
      .from("resumes")
      .delete()
      .eq("user_id", userId)
      .eq("id", resume.id);
    if (deleteError) {
      setError(deleteError.message);
      setBusyId(null);
      return;
    }

    const remaining = resumes.filter((item) => item.id !== resume.id);
    let promotionError: string | null = null;
    if (resume.is_default && remaining.length) {
      const { error: nextDefaultError } = await supabaseResult.client
        .from("resumes")
        .update({ is_default: true })
        .eq("user_id", userId)
        .eq("id", remaining[0].id);
      promotionError = nextDefaultError?.message ?? null;
    }
    await loadResumes(userId);
    if (promotionError) {
      setError(`${resume.file_name} was removed, but a new default could not be selected: ${promotionError}`);
    } else {
      setMessage(`${resume.file_name} was removed.`);
    }
    setBusyId(null);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}>
            <span>AF</span>
            ApplyFlow
          </Link>
          <Link href="/" className={styles.back}>
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroIcon}><ShieldCheck size={22} /></div>
          <p>Private resume storage</p>
          <h1>Keep every resume version ready.</h1>
          <span>
            Files remain in your private Supabase bucket. ApplyFlow only creates a short-lived download link when you request one.
          </span>
        </section>

        <section className={styles.manager}>
          <div className={styles.managerHeader}>
            <div>
              <span>Resume library</span>
              <h2>{loading ? "Loading files" : `${resumes.length} saved ${resumes.length === 1 ? "resume" : "resumes"}`}</h2>
            </div>
            <label className={styles.uploadButton} aria-disabled={Boolean(busyId)}>
              {busyId === "upload" ? <LoaderCircle className={styles.spin} size={17} /> : <Upload size={17} />}
              Upload resume
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={Boolean(busyId) || !userId}
                onChange={(event) => {
                  void uploadResume(event.target.files?.item(0) ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          <p className={styles.securityNote}>
            <ShieldCheck size={15} /> PDF, DOC, or DOCX only. Maximum file size is 10 MB.
          </p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? <p className={styles.success} role="status"><Check size={15} /> {message}</p> : null}

          {loading ? (
            <div className={styles.empty}><LoaderCircle className={styles.spin} size={24} /> Loading your private library</div>
          ) : resumes.length ? (
            <div className={styles.list}>
              {resumes.map((resume) => (
                <article className={styles.resumeCard} key={resume.id}>
                  <div className={styles.fileIcon}><FileText size={20} /></div>
                  <div className={styles.fileInfo}>
                    <div>
                      <strong>{resume.label}</strong>
                      {resume.is_default ? <span><Star size={12} /> Default</span> : null}
                    </div>
                    <p>{resume.file_name}</p>
                    <small>{formatBytes(resume.size_bytes)} - version {resume.version}</small>
                  </div>
                  <div className={styles.actions}>
                    {!resume.is_default ? (
                      <button type="button" disabled={Boolean(busyId)} onClick={() => void makeDefault(resume)}>
                        <Star size={15} /> Make default
                      </button>
                    ) : null}
                    <button type="button" disabled={Boolean(busyId)} onClick={() => void downloadResume(resume)}>
                      <Download size={15} /> Download
                    </button>
                    <button className={styles.deleteButton} type="button" disabled={Boolean(busyId)} onClick={() => void deleteResume(resume)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <FileText size={28} />
              <strong>No resumes stored yet</strong>
              <span>Upload your first tailored resume to make it available for reviewed applications.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
