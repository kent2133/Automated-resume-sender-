import { describe, expect, it } from "vitest";
import { isPanelRequest, isSitePolicy } from "../shared/contracts";
import {
  assertPageAutomationAllowed,
  AUTOMATION_DENIED_HOSTNAMES,
  getSitePolicy,
} from "./site-policy";

describe("OnlineJobs.ph site policy", () => {
  it("keeps an explicit denylist for the root and www origins", () => {
    expect(AUTOMATION_DENIED_HOSTNAMES).toEqual(["onlinejobs.ph", "www.onlinejobs.ph"]);
  });

  it.each([
    "https://onlinejobs.ph/",
    "http://onlinejobs.ph/jobs/123",
    "https://www.onlinejobs.ph/apply?job=123",
    "https://jobs.onlinejobs.ph/apply?job=123",
    "https://ONLINEJOBS.PH.:8443/apply",
  ])("uses manual companion mode for %s", (url) => {
    expect(getSitePolicy(url)).toMatchObject({
      mode: "manual-companion",
      automationAllowed: false,
      message: expect.stringContaining("enter, upload, review, and submit them yourself"),
    });
    expect(() => assertPageAutomationAllowed(url)).toThrow("Manual companion mode");
  });

  it.each([
    "https://example.com/application",
    "https://onlinejobs.ph.example.com/application",
    "https://notonlinejobs.ph/application",
  ])("preserves review-first behavior for %s", (url) => {
    expect(getSitePolicy(url)).toMatchObject({ mode: "review-first", automationAllowed: true });
    expect(() => assertPageAutomationAllowed(url)).not.toThrow();
  });

  it("validates the side-panel policy request and response", () => {
    expect(isPanelRequest({ type: "GET_SITE_POLICY" })).toBe(true);
    expect(isSitePolicy(getSitePolicy("https://onlinejobs.ph/apply"))).toBe(true);
  });
});
