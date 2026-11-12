import { detectSensitiveField } from "../core/sensitive";
import { matchField } from "../core/matcher";
import { validateResumeBytes } from "../core/resume";
import { getSitePolicy } from "../core/site-policy";
import {
  isContentRequest,
  type ContentRequest,
  type DemoProfile,
  type FillReport,
  type ProfileKey,
  type ResumeAttachReport,
  type RuntimeResponse,
  type ScanReport,
  type ScannedField,
} from "../shared/contracts";

type FillableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const ID_ATTRIBUTE = "data-applyflow-field-id";
const READY_CLASS = "applyflow-match-ready";
const BLOCKED_CLASS = "applyflow-match-blocked";
const ACTIVE_CLASS = "applyflow-match-active";
const STYLE_ID = "applyflow-field-styles";
let fieldSequence = 0;

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${READY_CLASS} { outline: 2px solid #b7ff2a !important; outline-offset: 2px !important; }
    .${BLOCKED_CLASS} { outline: 2px dashed #ff9d75 !important; outline-offset: 2px !important; }
    .${ACTIVE_CLASS} { outline: 4px solid #55e7ff !important; outline-offset: 4px !important; animation: applyflowPulse 1s ease-in-out 2; }
    @keyframes applyflowPulse { 50% { box-shadow: 0 0 0 8px rgba(85, 231, 255, 0.2); } }
  `;
  document.documentElement.appendChild(style);
}

function getElements(): FillableElement[] {
  return Array.from(
    document.querySelectorAll<FillableElement>(
      "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']), textarea, select",
    ),
  )
    .filter(
      (element) =>
        !element.disabled &&
        (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) || !element.readOnly),
    );
}

function getFieldId(element: FillableElement): string {
  const existing = element.getAttribute(ID_ATTRIBUTE);
  if (existing) return existing;
  fieldSequence += 1;
  const id = `af-${Date.now().toString(36)}-${fieldSequence}`;
  element.setAttribute(ID_ATTRIBUTE, id);
  return id;
}

function getLabel(element: FillableElement): string {
  const labels = "labels" in element ? Array.from(element.labels ?? []) : [];
  const explicit = labels.map((label) => label.textContent?.trim()).filter(Boolean).join(" ");
  if (explicit) return explicit;

  const parentLabel = element.closest("label")?.textContent?.trim();
  return (
    parentLabel ||
    element.getAttribute("aria-label") ||
    element.getAttribute("placeholder") ||
    element.getAttribute("name") ||
    element.id ||
    "Unlabelled field"
  ).replace(/\s+/g, " ");
}

function scanElement(element: FillableElement): ScannedField {
  const label = getLabel(element);
  const inputType = element instanceof HTMLInputElement ? element.type || "text" : element.tagName.toLowerCase();
  const descriptor = {
    label,
    name: element.getAttribute("name") ?? undefined,
    autocomplete: element.getAttribute("autocomplete") ?? undefined,
    placeholder: element.getAttribute("placeholder") ?? undefined,
    type: inputType,
    tagName: element.tagName.toLowerCase(),
  };
  const sensitive = detectSensitiveField(descriptor);
  const match = matchField(descriptor);

  if (sensitive.blocked) {
    return {
      id: getFieldId(element),
      label,
      tagName: element.tagName.toLowerCase() as ScannedField["tagName"],
      inputType,
      required: element.required,
      status: "blocked",
      confidence: 0,
      reason: "Manual entry required",
      sensitiveReason: sensitive.reason,
    };
  }

  if (match.manualOnly) {
    return {
      id: getFieldId(element),
      label,
      tagName: element.tagName.toLowerCase() as ScannedField["tagName"],
      inputType,
      required: element.required,
      status: "manual",
      confidence: match.confidence,
      reason: match.reason,
    };
  }

  const ready = Boolean(match.profileKey) && match.confidence >= 0.75;
  return {
    id: getFieldId(element),
    label,
    tagName: element.tagName.toLowerCase() as ScannedField["tagName"],
    inputType,
    required: element.required,
    status: ready ? "ready" : "unmatched",
    profileKey: ready ? match.profileKey : undefined,
    confidence: match.confidence,
    reason: match.reason,
  };
}

function applyPageHighlights(fields: ScannedField[]): void {
  ensureStyles();
  for (const element of getElements()) {
    element.classList.remove(READY_CLASS, BLOCKED_CLASS, ACTIVE_CLASS);
  }
  for (const field of fields) {
    const element = document.querySelector<FillableElement>(`[${ID_ATTRIBUTE}="${CSS.escape(field.id)}"]`);
    if (field.status === "ready" || field.status === "filled") element?.classList.add(READY_CLASS);
    if (field.status === "blocked") element?.classList.add(BLOCKED_CLASS);
  }
}

function scanPage(): ScanReport {
  const fields = getElements().map(scanElement);
  applyPageHighlights(fields);
  return {
    url: location.href,
    title: document.title || location.hostname,
    fields,
    readyCount: fields.filter((field) => field.status === "ready").length,
    manualCount: fields.filter((field) => field.status === "manual" || field.status === "unmatched").length,
    blockedCount: fields.filter((field) => field.status === "blocked").length,
  };
}

function setNativeValue(element: FillableElement, value: string): boolean {
  if (element instanceof HTMLSelectElement) {
    const normalized = value.toLowerCase();
    const option = Array.from(element.options).find(
      (candidate) =>
        candidate.value.toLowerCase() === normalized || candidate.text.toLowerCase() === normalized,
    );
    if (!option) return false;
    element.value = option.value;
  } else {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function fillFields(profile: DemoProfile): FillReport {
  const fields = getElements().map(scanElement);
  let filledCount = 0;

  const nextFields = fields.map((field) => {
    if (field.status !== "ready" || !field.profileKey) return field;
    const element = document.querySelector<FillableElement>(`[${ID_ATTRIBUTE}="${CSS.escape(field.id)}"]`);
    const value = profile[field.profileKey as ProfileKey];
    if (!element || !value || !setNativeValue(element, value)) return field;
    filledCount += 1;
    return { ...field, status: "filled" as const, reason: `${field.reason}. Filled for review` };
  });

  applyPageHighlights(nextFields);
  return {
    fields: nextFields,
    filledCount,
    skippedCount: nextFields.length - filledCount,
    message: `Filled ${filledCount} safe ${filledCount === 1 ? "field" : "fields"}. Review every answer and submit the application yourself.`,
  };
}

function isVisibleNativeFileInput(element: HTMLInputElement): boolean {
  const style = getComputedStyle(element);
  const bounds = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number.parseFloat(style.opacity || "1") > 0 &&
    bounds.width >= 20 &&
    bounds.height >= 20 &&
    element.getClientRects().length > 0
  );
}

function acceptsPdf(element: HTMLInputElement): boolean {
  const accept = element.accept.trim().toLowerCase();
  if (!accept) return true;
  return accept
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === ".pdf" || value === "application/pdf" || value === "application/*");
}

function getAccessibleFileLabel(element: HTMLInputElement): string | null {
  const associatedLabels = Array.from(element.labels ?? [])
    .map((label) => label.textContent?.trim())
    .filter((label): label is string => Boolean(label));
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  const labelledBy = element
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .filter((label): label is string => Boolean(label));
  const labels = [...associatedLabels, ...(ariaLabel ? [ariaLabel] : []), ...(labelledBy ?? [])];
  return labels.length > 0 ? labels.join(" ") : null;
}

function getEligibleResumeInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>("input[type='file']")).filter((element) => {
    if (element.disabled || !isVisibleNativeFileInput(element) || !acceptsPdf(element)) return false;
    const label = getAccessibleFileLabel(element);
    if (!label) return false;
    return /resume|curriculum vitae|\bcv\b/i.test(`${label} ${element.name}`);
  });
}

function attachResume(fileName: string, bytes: number[]): ResumeAttachReport {
  const validationError = validateResumeBytes(bytes);
  if (validationError) throw new Error(validationError);

  const inputs = getEligibleResumeInputs();
  if (inputs.length === 0) {
    bytes.fill(0);
    return {
      attached: false,
      fileName,
      message: "No accessible native PDF resume input was found. Use the page uploader manually.",
    };
  }
  if (inputs.length > 1) {
    bytes.fill(0);
    return {
      attached: false,
      fileName,
      message: "More than one resume input was found. Choose the correct uploader manually.",
    };
  }

  const input = inputs[0]!;
  const fieldId = getFieldId(input);
  const fileBytes = new Uint8Array(bytes);

  try {
    const file = new File([fileBytes], fileName, { type: "application/pdf", lastModified: Date.now() });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));

    const attachedName = input.files?.item(0)?.name;
    if (attachedName !== fileName) {
      input.value = "";
      throw new Error("The page did not accept the selected PDF. Use the uploader manually.");
    }

    ensureStyles();
    input.classList.add(READY_CLASS, ACTIVE_CLASS);
    return {
      attached: true,
      fileName: attachedName,
      fieldId,
      message: `${attachedName} was attached for review. ApplyFlow will not submit the application.`,
    };
  } finally {
    fileBytes.fill(0);
    bytes.fill(0);
  }
}

function highlightField(fieldId: string): boolean {
  ensureStyles();
  document.querySelectorAll(`.${ACTIVE_CLASS}`).forEach((element) => element.classList.remove(ACTIVE_CLASS));
  const element = document.querySelector<FillableElement>(`[${ID_ATTRIBUTE}="${CSS.escape(fieldId)}"]`);
  if (!element) return false;
  element.classList.add(ACTIVE_CLASS);
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus({ preventScroll: true });
  return true;
}

function clearHighlights(): boolean {
  document.querySelectorAll(`.${READY_CLASS}, .${BLOCKED_CLASS}, .${ACTIVE_CLASS}`).forEach((element) =>
    element.classList.remove(READY_CLASS, BLOCKED_CLASS, ACTIVE_CLASS),
  );
  return true;
}

if (!window.__applyflowContentLoaded) {
  window.__applyflowContentLoaded = true;
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    // Keep this check ahead of dispatch so future content actions inherit the denylist.
    const policy = getSitePolicy(location.href);
    if (!policy.automationAllowed) {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "ATTACH_RESUME" &&
        "bytes" in message &&
        Array.isArray(message.bytes)
      ) {
        message.bytes.fill(0);
      }
      sendResponse({ ok: false, error: policy.message } satisfies RuntimeResponse);
      return false;
    }

    if (!isContentRequest(message)) {
      sendResponse({ ok: false, error: "Invalid page request" } satisfies RuntimeResponse);
      return false;
    }

    try {
      let data: unknown;
      switch ((message as ContentRequest).type) {
        case "PING":
          data = true;
          break;
        case "SCAN_PAGE":
          data = scanPage();
          break;
        case "FILL_FIELDS":
          data = fillFields((message as Extract<ContentRequest, { type: "FILL_FIELDS" }>).profile);
          break;
        case "ATTACH_RESUME": {
          const request = message as Extract<ContentRequest, { type: "ATTACH_RESUME" }>;
          data = attachResume(request.fileName, request.bytes);
          break;
        }
        case "HIGHLIGHT_FIELD":
          data = highlightField((message as Extract<ContentRequest, { type: "HIGHLIGHT_FIELD" }>).fieldId);
          break;
        case "CLEAR_HIGHLIGHTS":
          data = clearHighlights();
          break;
      }
      sendResponse({ ok: true, data } satisfies RuntimeResponse);
    } catch (error: unknown) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "The page could not be scanned",
      } satisfies RuntimeResponse);
    }
    return false;
  });
}

declare global {
  interface Window {
    __applyflowContentLoaded?: boolean;
  }
}
