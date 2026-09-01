import { saveLink } from "./lib/garden.js";

const MENU_PAGE = "garden-save-page";
const MENU_LINK = "garden-save-link";
const MENU_MEDIA = "garden-save-media";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PAGE,
      title: "Keep this page in Garden",
      contexts: ["page", "selection"],
    });
    chrome.contextMenus.create({
      id: MENU_LINK,
      title: "Keep this link in Garden",
      contexts: ["link"],
    });
    chrome.contextMenus.create({
      id: MENU_MEDIA,
      title: "Keep this media in Garden",
      contexts: ["video", "audio", "image"],
    });
  });
});

/* A badge is the only feedback available from a context-menu click. */
async function flash(text, colour) {
  await chrome.action.setBadgeBackgroundColor({ color: colour });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = null;
  let title = tab?.title || "";

  if (info.menuItemId === MENU_LINK) {
    url = info.linkUrl;
    title = info.selectionText || "";
  } else if (info.menuItemId === MENU_MEDIA) {
    url = info.srcUrl;
    title = "";
  } else if (info.menuItemId === MENU_PAGE) {
    url = info.pageUrl || tab?.url;
  }
  if (!url || !/^https?:/i.test(url)) return flash("!", "#b05040");

  try {
    // saves to whichever bed the popup last used, so the two agree
    const { lastBed } = await chrome.storage.sync.get({ lastBed: "none" });
    await saveLink({ url, title, regionId: lastBed === "none" ? null : lastBed });
    await flash("✓", "#4c9a63");
  } catch {
    await flash("!", "#b05040");
  }
});
