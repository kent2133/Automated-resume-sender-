const LOCAL_ORIGIN = "https://applyflow.local";

export function getSafeNextPath(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/setup",
) {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\r\n]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    if (parsed.pathname === "/auth" || parsed.pathname.startsWith("/auth/")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
