# Rishikesh Trip Itinerary

A mobile-first itinerary website. The page is a self-contained `index.html`; Google Apps Script connects it to a Google Sheet so edits can be shared across visitors. The original 9-page PDF is in `public/itinerary/rishikesh-itinerary-original.pdf`.

## Set up shared Google Sheets storage

1. Create a Google Sheet for the itinerary and copy its ID from the URL. The ID is the text between `/d/` and `/edit`.
2. Open [Google Apps Script](https://script.google.com/), create a project, and paste in `google-apps-script/Code.gs`.
3. In **Project Settings → Script Properties**, add:
   - Property: `SPREADSHEET_ID`
   - Value: your Google Sheet ID
4. Save the project. Choose `setup` in the function list and run it once. Review and approve Google's requested permissions. This creates the `Itinerary Data` tab.
5. Choose **Deploy → New deployment → Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Deploy, copy the web app URL ending in `/exec`, and put it in `index.html`:

   ```js
   const APPS_SCRIPT_URL = "YOUR_DEPLOYED_WEB_APP_URL";
   ```

7. Upload the project source to GitHub and enable **Settings → Pages → GitHub Actions**. Include `index.html`, `.github/workflows/deploy.yml`, `public/itinerary/rishikesh-itinerary-original.pdf`, `public/itinerary/page-6-image-1.jpeg`, `google-apps-script/Code.gs`, and this README. Do not upload `.vite`, `node_modules`, or `dist`; they are local/generated files. The first person to press **SAVE** publishes the initial itinerary to the Sheet. Later visits load the shared Sheet; changes are saved there when **SAVE** is pressed. The page checks for updates about every 30 seconds and detects conflicting saves.

The Sheet is the shared source of truth. `localStorage` is only used for a browser-local backup; if the Apps Script URL is missing or unavailable, the page clearly indicates that edits are not being shared.
The `Itinerary Data` tab stores the shared itinerary as JSON chunks; use the website to edit it. Google Sheets version history can be used to recover older sheet versions.

## Public editing warning

The **Anyone** deployment makes the Apps Script endpoint publicly writable: any visitor can add, change, or delete itinerary content. The page and the trip details on it are public too. Do not put passwords, private credentials, or information you do not want public in the itinerary or Sheet. The Google Sheet itself does not need to be shared with editors; the script writes to it as its owner.

## GitHub Pages

The workflow publishes `index.html`, the original PDF, and the local payment QR photo. The Apps Script file remains in the repository as setup source and must also be copied and deployed in Google Apps Script; GitHub Pages does not deploy `.gs` files.
