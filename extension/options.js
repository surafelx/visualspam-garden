import { getConfig, setConfig, DEFAULT_API } from "./lib/garden.js";

const $ = (id) => document.getElementById(id);
const status = (msg, cls = "") => {
  $("status").textContent = msg;
  $("status").className = `status ${cls}`;
};

getConfig().then(({ apiBase }) => { $("api").value = apiBase || DEFAULT_API; });

$("save").addEventListener("click", async () => {
  const value = $("api").value.trim().replace(/\/+$/, "");
  let origin;
  try {
    origin = new URL(value).origin;
  } catch {
    return status("That is not a valid address.", "err");
  }

  // localhost is in host_permissions already; anything else has to be asked for
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!isLocal) {
    const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
    if (!granted) return status("Chrome denied access to that address.", "err");
  }

  await setConfig(value);

  // prove it actually answers before calling it saved
  try {
    const res = await fetch(`${value}/regions`);
    if (!res.ok) throw new Error(String(res.status));
    const beds = await res.json();
    status(`Saved. Reached your garden — ${beds.length} bed${beds.length === 1 ? "" : "s"}.`, "ok");
  } catch {
    status("Saved, but nothing answered there yet.", "err");
  }
});
