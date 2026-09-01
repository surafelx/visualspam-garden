# Garden Archive — Chrome extension

Keeps any page, video, or track in your garden's archive without leaving the tab
you are on. It saves the **link**, the same as the archive inside the app.

## Install

1. Start the garden so the API is up (`npm run dev`, or your deployed server).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. **Load unpacked** → pick this `extension/` folder.
4. Open the extension's **settings** and set the API address:
   - local: `http://localhost:4000/api`
   - deployed: `https://your-host/api`

Saving a non-local address asks Chrome for permission to reach that host. The
settings page then calls the API and tells you how many beds it found, so you
know it is actually talking to your garden.

## Using it

**Toolbar button** — shows the current page, lets you pick a bed and add a note,
then saves. It remembers the last bed you used.

**Right-click** — three menu items, depending on what is under the cursor:

| Where you click | Saves |
| --- | --- |
| the page (or a selection) | the page URL |
| a link | the link's target |
| a video, audio, or image | that media's source |

A context-menu save goes to the bed the popup last used, and flashes a badge on
the toolbar icon: ✓ saved, ! failed.

YouTube links get their real title and channel via oEmbed, so a save from a
video page is named properly rather than "YouTube".

## Notes

- The garden's write endpoints are currently unauthenticated, so the extension
  posts straight to `/api/tracks` with no token. If you add auth to the API,
  this needs a matching header.
- Nothing is downloaded — only the URL and its metadata, matching the archive's
  behaviour in the app.
- There are no icons in the manifest, so Chrome shows its default puzzle piece.
  Drop `icon16/48/128.png` in here and add an `icons` block to change that.
