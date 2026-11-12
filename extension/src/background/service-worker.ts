import {
  isPanelRequest,
  type ContentRequest,
  type DemoProfile,
  type PanelRequest,
  type RuntimeResponse,
} from "../shared/contracts";
import { DEMO_PROFILE } from "../core/profile";
import { assertPageAutomationAllowed, getSitePolicy } from "../core/site-policy";

const PROFILE_KEY = "applyflowProfile";

async function prepareSidePanel(): Promise<void> {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  void prepareSidePanel();
  void chrome.storage.local.get(PROFILE_KEY).then((stored) => {
    if (!stored[PROFILE_KEY]) void chrome.storage.local.set({ [PROFILE_KEY]: DEMO_PROFILE });
  });
});

chrome.runtime.onStartup.addListener(() => {
  void prepareSidePanel();
});

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("Open a standard web page, then try again");
  if (!tab.url?.startsWith("http://") && !tab.url?.startsWith("https://")) {
    throw new Error("Chrome internal pages cannot be scanned");
  }
  return tab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" } satisfies ContentRequest);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content-script.js"],
    });
  }
}

async function sendToPage(request: ContentRequest): Promise<unknown> {
  const tab = await getActiveTab();
  // Every page-bound request must pass this gate before content-script injection.
  assertPageAutomationAllowed(tab.url!);
  await ensureContentScript(tab.id!);
  const response: RuntimeResponse = await chrome.tabs.sendMessage(tab.id!, request);
  if (!response?.ok) throw new Error(response?.error ?? "The page did not respond");
  return response.data;
}

async function handleRequest(request: PanelRequest): Promise<unknown> {
  switch (request.type) {
    case "GET_PROFILE": {
      const stored = await chrome.storage.local.get(PROFILE_KEY);
      return (stored[PROFILE_KEY] as DemoProfile | undefined) ?? DEMO_PROFILE;
    }
    case "GET_SITE_POLICY": {
      const tab = await getActiveTab();
      return getSitePolicy(tab.url!);
    }
    case "SAVE_PROFILE":
      await chrome.storage.local.set({ [PROFILE_KEY]: request.profile });
      return request.profile;
    case "SCAN_PAGE":
    case "CLEAR_HIGHLIGHTS":
      return sendToPage(request);
    case "FILL_FIELDS":
      return sendToPage(request);
    case "ATTACH_RESUME": {
      try {
        return await sendToPage(request);
      } finally {
        request.bytes.fill(0);
      }
    }
    case "HIGHLIGHT_FIELD":
      return sendToPage(request);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isPanelRequest(message)) {
    sendResponse({ ok: false, error: "Invalid ApplyFlow message" } satisfies RuntimeResponse);
    return false;
  }

  void handleRequest(message)
    .then((data) => sendResponse({ ok: true, data } satisfies RuntimeResponse))
    .catch((error: unknown) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "ApplyFlow could not complete this action",
      } satisfies RuntimeResponse),
    );
  return true;
});
