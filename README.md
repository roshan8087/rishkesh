# Rishikesh Trip Itinerary

A mobile-first itinerary website. The page is a self-contained `index.html`; Google Apps Script connects it to a Google Sheet so edits can be shared across visitors. The original 9-page PDF is in `public/itinerary/rishikesh-itinerary-original.pdf`.

## Set up shared Google Sheets storage

1. Create a Google Sheet for the itinerary and copy its ID from the URL. The ID is the text between `/d/` and `/edit`.
2. Open the Apps Script project used by the existing web app deployment and replace its `Code.gs` with `google-apps-script/Code.gs`. If there is no existing project, create one and paste the file there.
3. In **Project Settings → Script Properties**, add:
   - Property: `SPREADSHEET_ID`
   - Value: your Google Sheet ID
4. Save the project. Choose `setup` in the function list and run it once. Review and approve Google's requested permissions. Before creating or updating anything, `setup` makes timestamped copies of existing Sheet tabs. It preserves the `Itinerary Data` content and adds `Activity History`, `Recently Deleted`, and `Editor History`.
5. Choose **Deploy → Manage deployments**, edit the existing web app deployment, and select **New version**. If this is a new Apps Script project, choose **Deploy → New deployment → Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Deploy, copy the web app URL ending in `/exec`, and put it in `index.html`:

   ```js
   const APPS_SCRIPT_URL = "YOUR_DEPLOYED_WEB_APP_URL";
   ```

7. Upload the project source to GitHub and enable **Settings → Pages → GitHub Actions**. Include `index.html`, `.github/workflows/deploy.yml`, `public/itinerary/rishikesh-itinerary-original.pdf`, `public/itinerary/page-6-image-1.jpeg`, `google-apps-script/Code.gs`, and this README. Do not upload `.vite`, `node_modules`, or `dist`; they are local/generated files. Existing shared itinerary data remains the starting point. Changes are saved to the Sheet when **SAVE** is pressed. The page checks for updates about every 30 seconds and applies non-overlapping edits without replacing other visitors' changes.

The Sheet is the shared source of truth. `Itinerary Data` stores revisioned JSON chunks; use the website to edit it. `Activity History` records every edit and its previous/new values. `Recently Deleted` holds recoverable content until it is restored or a visitor confirms permanent deletion. `Editor History` stores each browser identity's separate undo/redo stack snapshot, which can also be reconstructed from committed activity records. Apps Script uses `LockService`, item-level revision checks, and a revision marker to serialize updates and reject same-item conflicts while retaining unrelated changes. Do not edit the Sheet tabs directly; manual edits bypass revision and activity tracking.

The site asks for an editor name before enabling edits and stores the name plus a generated ID in that browser's `localStorage`. Names and browser IDs are labels only, not authentication: anyone who can reach the public Apps Script deployment can impersonate an identity or modify public itinerary data. Do not store secrets or private information in the itinerary or Sheet. `localStorage` is also used only for a browser-local backup; if the Apps Script URL is missing or unavailable, the page clearly indicates that edits are not being shared.

Run the Apps Script logic tests locally with `node --test google-apps-script/Code.test.js`. They use an in-memory Sheets mock and do not access the live spreadsheet.

Instagram post, reel, and TV links added to a section link or place are shown with Instagram's public embed player. Private posts, profile URLs, or embeds Instagram does not serve remain normal links; public embeddability is controlled by Instagram.

## Public editing warning

The **Anyone** deployment makes the Apps Script endpoint publicly writable: any visitor can add, change, or delete itinerary content. The page and the trip details on it are public too. Do not put passwords, private credentials, or information you do not want public in the itinerary or Sheet. The Google Sheet itself does not need to be shared with editors; the script writes to it as its owner.

## GitHub Pages

The workflow publishes `index.html`, the original PDF, and the local payment QR photo. The Apps Script file remains in the repository as setup source and must also be copied and deployed in Google Apps Script; GitHub Pages does not deploy `.gs` files.
