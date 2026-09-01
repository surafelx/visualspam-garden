import { fetchBeds, fetchCategories, saveLink, kindOf, getConfig } from "./lib/garden.js";

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
  const { lastBed, lastCategory } = await chrome.storage.sync.get({
    lastBed: "none",
    lastCategory: "none",
  });

  try {
    const cats = await fetchCategories();
    // parents carry their children beneath them, indented
    cats.filter((c) => !c.parentId).forEach((parent) => {
      const group = document.createElement("optgroup");
      group.label = parent.name;
      const own = document.createElement("option");
      own.value = parent._id;
      own.textContent = parent.name;
      group.appendChild(own);
      cats
        .filter((c) => String(c.parentId) === String(parent._id))
        .forEach((kid) => {
          const opt = document.createElement("option");
          opt.value = kid._id;
          opt.textContent = `  ${kid.name}`;
          group.appendChild(opt);
        });
      $("category").appendChild(group);
    });
    $("category").value = cats.some((c) => c._id === lastCategory) ? lastCategory : "none";
  } catch {
    /* categories are optional — a save without one still works */
  }

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
    const category = $("category").value;
    await saveLink({
      url: tab.url,
      title: tab.title,
      regionId: bed === "none" ? null : bed,
      categoryId: category === "none" ? null : category,
      note: $("note").value.trim(),
    });
    await chrome.storage.sync.set({ lastBed: bed, lastCategory: category });
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
