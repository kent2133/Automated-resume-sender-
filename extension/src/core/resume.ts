import { MAX_RESUME_FILE_BYTES } from "../shared/contracts";

export interface ResumeMetadata {
  name: string;
  type: string;
  size: number;
}

export function validateResumeMetadata(file: ResumeMetadata): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) return "Choose a PDF resume";
  if (file.type && file.type.toLowerCase() !== "application/pdf") return "Choose a file with the PDF content type";
  if (file.size <= 0) return "The selected PDF is empty";
  if (file.size > MAX_RESUME_FILE_BYTES) return "The PDF must be 5 MB or smaller";
  return null;
}

export function hasPdfSignature(bytes: ArrayLike<number>): boolean {
  const searchLimit = Math.min(bytes.length - 4, 1024);
  for (let index = 0; index < searchLimit; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

export function validateResumeBytes(bytes: ArrayLike<number>): string | null {
  if (bytes.length <= 0) return "The selected PDF is empty";
  if (bytes.length > MAX_RESUME_FILE_BYTES) return "The PDF must be 5 MB or smaller";
  if (!hasPdfSignature(bytes)) return "The selected file does not contain a valid PDF header";
  return null;
}
