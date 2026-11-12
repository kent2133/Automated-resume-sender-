import { describe, expect, it } from "vitest";
import { DEMO_PROFILE } from "../core/profile";
import {
  createCandidateProfileDocument,
  isCandidateProfileDocument,
  migrateCandidateProfile,
} from "./contracts";

describe("candidate profile documents", () => {
  it("round-trips the versioned private profile format", () => {
    const document = createCandidateProfileDocument(DEMO_PROFILE);
    expect(isCandidateProfileDocument(JSON.parse(JSON.stringify(document)))).toBe(true);
  });

  it("rejects incomplete versioned profiles", () => {
    expect(isCandidateProfileDocument({ schemaVersion: 1, profile: { firstName: "Alex" } })).toBe(false);
  });

  it("migrates the original local profile without guessing new values", () => {
    const legacy = {
      firstName: "Sam",
      lastName: "Lee",
      fullName: "Sam Lee",
      email: "sam@example.com",
      phone: "123",
      location: "Philippines",
      portfolioUrl: "",
      linkedinUrl: "",
      githubUrl: "",
      yearsExperience: "2",
      desiredSalary: "",
      workAuthorization: "Review each time",
      coverLetter: "Hello",
      resumeFileName: "resume.pdf",
    };

    const migrated = migrateCandidateProfile(legacy, DEMO_PROFILE);
    expect(migrated).toMatchObject({ firstName: "Sam", targetRoles: DEMO_PROFILE.targetRoles });
  });
});
