import { describe, expect, it } from "vitest";
import { MAX_RESUME_FILE_BYTES } from "../shared/contracts";
import { hasPdfSignature, validateResumeBytes, validateResumeMetadata } from "./resume";

describe("resume validation", () => {
  it("accepts a PDF within the size limit", () => {
    expect(
      validateResumeMetadata({ name: "Alex-Rivera-Resume.pdf", type: "application/pdf", size: 1024 }),
    ).toBeNull();
  });

  it("rejects non-PDF files", () => {
    expect(validateResumeMetadata({ name: "resume.docx", type: "application/octet-stream", size: 1024 })).toBe(
      "Choose a PDF resume",
    );
  });

  it("rejects files over 5 MB", () => {
    expect(
      validateResumeMetadata({
        name: "resume.pdf",
        type: "application/pdf",
        size: MAX_RESUME_FILE_BYTES + 1,
      }),
    ).toBe("The PDF must be 5 MB or smaller");
  });

  it("checks the PDF file signature", () => {
    const validHeader = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
    const validHeaderAfterComment = [0x20, 0x20, ...validHeader];
    expect(hasPdfSignature(validHeader)).toBe(true);
    expect(hasPdfSignature(validHeaderAfterComment)).toBe(true);
    expect(validateResumeBytes(validHeader)).toBeNull();
    expect(validateResumeBytes([0x4e, 0x4f, 0x54, 0x50, 0x44, 0x46])).toBe(
      "The selected file does not contain a valid PDF header",
    );
  });
});
