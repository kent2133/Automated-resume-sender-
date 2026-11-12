import type { SitePolicy } from "../shared/contracts";

export const AUTOMATION_DENIED_HOSTNAMES = ["onlinejobs.ph", "www.onlinejobs.ph"] as const;

export const ONLINEJOBS_MANUAL_COMPANION_MESSAGE =
  "Manual companion mode - OnlineJobs.ph terms prohibit automated means without express permission, so ApplyFlow will not scan or change this page. Prepare materials here, then enter, upload, review, and submit them yourself.";

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, "");
}

export function getSitePolicy(rawUrl: string): SitePolicy {
  const url = new URL(rawUrl);
  const hostname = normalizeHostname(url.hostname);
  const automationAllowed = !AUTOMATION_DENIED_HOSTNAMES.some(
    (denied) => denied === hostname || hostname.endsWith(`.${denied}`),
  );

  return {
    url: url.href,
    hostname,
    mode: automationAllowed ? "review-first" : "manual-companion",
    automationAllowed,
    message: automationAllowed
      ? "Review-first assistance is available on this page."
      : ONLINEJOBS_MANUAL_COMPANION_MESSAGE,
  };
}

export function assertPageAutomationAllowed(rawUrl: string): SitePolicy {
  const policy = getSitePolicy(rawUrl);
  if (!policy.automationAllowed) throw new Error(policy.message);
  return policy;
}
