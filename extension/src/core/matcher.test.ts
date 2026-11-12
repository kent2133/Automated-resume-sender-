import { describe, expect, it } from "vitest";
import { matchField } from "./matcher";
import { detectSensitiveField } from "./sensitive";

describe("matchField", () => {
  it("matches an email field from native metadata", () => {
    expect(matchField({ label: "Contact", type: "email" })).toMatchObject({
      profileKey: "email",
      confidence: 0.97,
    });
  });

  it("matches a LinkedIn field without confusing it with a generic website", () => {
    expect(matchField({ label: "LinkedIn profile URL", type: "url" }).profileKey).toBe("linkedinUrl");
  });

  it("keeps resume upload manual", () => {
    expect(matchField({ label: "Upload resume", type: "file" })).toMatchObject({
      manualOnly: true,
      confidence: 1,
    });
  });

  it("does not fill consent checkboxes", () => {
    expect(matchField({ label: "I agree", type: "checkbox" }).confidence).toBe(0);
  });
});

describe("detectSensitiveField", () => {
  it("blocks password fields", () => {
    expect(detectSensitiveField({ type: "password" }).blocked).toBe(true);
  });

  it("blocks government identifiers", () => {
    expect(detectSensitiveField({ label: "Social Security Number" })).toMatchObject({
      blocked: true,
    });
  });

  it("allows ordinary contact fields", () => {
    expect(detectSensitiveField({ label: "Email address", type: "email" }).blocked).toBe(false);
  });
});
