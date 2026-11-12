# ApplyFlow Chrome extension

This Manifest V3 extension scans only the active tab after the user opens the side panel. It matches safe job application fields, blocks sensitive fields, highlights review targets, attaches a user-selected PDF resume to an eligible native uploader, and never presses a final Submit button.

## OnlineJobs.ph manual companion mode

`onlinejobs.ph` and `www.onlinejobs.ph` are on an explicit automation denylist because OnlineJobs.ph terms prohibit automated means without express permission. On either origin, ApplyFlow does not scan, highlight, fill, attach a resume, or otherwise change the page. The service worker refuses page access before content-script injection, and the content script independently rejects page requests as a second safety gate.

The side panel remains useful without accessing the page. It shows manual companion mode and provides a copyable set of locally prepared profile and answer snippets. The user must enter answers, upload files, review the application, and press Submit manually. Profile editing and local saving continue to work, and review-first behavior on other sites is unchanged.

## Local development

1. Run `npm install`.
2. Run `npm run check`.
3. Open `chrome://extensions`, enable Developer mode, and choose Load unpacked.
4. Select the generated `dist` folder.
5. Open a job application form and click the ApplyFlow extension action.

The included candidate profile is fictional. Replace it in the side panel before real use. Resume attachment always begins with a file the user explicitly chooses in the side panel. PDFs are checked for their file extension, content type, file header, and 5 MB size limit. The selected bytes are sent only to the active tab, used to reconstruct the chosen file, and discarded after attachment. Custom, hidden, ambiguous, or inaccessible uploaders remain manual.

The side panel can import and export a version 1 ApplyFlow private profile JSON file. Use the dashboard setup page to prepare the same format, then import it once in the extension. The profile is saved in Chrome local storage and is never bundled into the public extension source. Salary, work authorization, sponsorship, passport, and other sensitive decisions remain visible for manual review instead of being automatically entered.

## Permissions

- `activeTab` - access only the page the user explicitly activates
- `scripting` - inject the scanner after the user opens ApplyFlow
- `sidePanel` - provide the review interface
- `storage` - save the candidate profile locally in Chrome

Host access is limited to local development and the placeholder ApplyFlow production origin. Job sites are accessed only through the temporary active tab grant.
