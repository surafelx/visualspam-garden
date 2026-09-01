import { fetchBeds, saveLink, kindOf, getConfig } from "./lib/garden.js";

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => {
  $("status").textContent = msg;
  $("status").className = `status ${cls}`;
};

let tab = null;

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    status("No page to save here.", "err");
    $("save").disabled = true;
    return;
  }

  $("title").textContent = tab.title || tab.url;
  $("url").textContent = tab.url;
  $("kind").textContent = kindOf(tab.url);

  if (!/^https?:/i.test(tab.url)) {
    status("Only http(s) pages can be archived.", "err");
    $("save").disabled = true;
    return;
  }

  // remember the last bed used, so saving a run of things is one click each
  const { lastBed } = await chrome.storage.sync.get({ lastBed: "none" });
  try {
    const beds = await fetchBeds();
    for (const b of beds) {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.label;
      $("bed").appendChild(opt);
    }
    $("bed").value = beds.some((b) => b.id === lastBed) ? lastBed : "none";
  } catch {
    const { apiBase } = await getConfig();
    status(`Cannot reach ${apiBase}. Check settings and that the garden is running.`, "err");
  }
}

$("save").addEventListener("click", async () => {
  const bed = $("bed").value;
  $("save").disabled = true;
  status("Saving…");
  try {
    await saveLink({
      url: tab.url,
      title: tab.title,
      regionId: bed === "none" ? null : bed,
      note: $("note").value.trim(),
    });
    await chrome.storage.sync.set({ lastBed: bed });
    status("Kept in your archive.", "ok");
    setTimeout(() => window.close(), 900);
  } catch (err) {
    status(err.message || "Could not save.", "err");
    $("save").disabled = false;
  }
});

$("options").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
