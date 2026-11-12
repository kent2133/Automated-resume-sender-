export const RESUME_BUCKET = "resumes";
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeResumeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return normalized || "resume.pdf";
}

export function buildResumeStoragePath(
  userId: string,
  resumeId: string,
  fileName: string,
) {
  if (!UUID_PATTERN.test(userId) || !UUID_PATTERN.test(resumeId)) {
    throw new Error("Resume storage paths require valid user and resume IDs.");
  }

  return `${userId}/${resumeId}/${sanitizeResumeFileName(fileName)}`;
}
