/* Shared between the popup, the options page and the service worker. */

export const DEFAULT_API = "http://localhost:4000/api";

export async function getConfig() {
  const { apiBase } = await chrome.storage.sync.get({ apiBase: DEFAULT_API });
  return { apiBase: String(apiBase || DEFAULT_API).replace(/\/+$/, "") };
}

export function setConfig(apiBase) {
  return chrome.storage.sync.set({ apiBase: String(apiBase || "").replace(/\/+$/, "") });
}

/* Kept in step with kindOf() in src/components/ArchiveView.jsx. */
export function youtubeIdFrom(input) {
  const raw = String(input || "");
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return m[1];
  }
  return null;
}

export function kindOf(url) {
  const u = String(url || "");
  if (youtubeIdFrom(u) || /vimeo\.com/.test(u) || /\.(mp4|webm|mov)(\?|$)/i.test(u)) return "video";
  if (/\.(mp3|wav|ogg|m4a|flac|aac)(\?|$)/i.test(u)) return "audio";
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u)) return "image";
  return "link";
}

const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/* YouTube's oEmbed needs no key, so a saved video gets its real title and
   channel even when the page title is something like "YouTube". */
async function youtubeMeta(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCategories() {
  const { apiBase } = await getConfig();
  const res = await fetch(`${apiBase}/categories`);
  if (!res.ok) throw new Error(`categories: ${res.status}`);
  return res.json();
}

export async function fetchBeds() {
  const { apiBase } = await getConfig();
  const res = await fetch(`${apiBase}/regions`);
  if (!res.ok) throw new Error(`beds: ${res.status}`);
  return res.json();
}

/* Builds the archive entry and posts it. Returns the saved entry. */
export async function saveLink({ url, title, regionId = null, categoryId = null, note = "" }) {
  const { apiBase } = await getConfig();
  const videoId = youtubeIdFrom(url) || "";
  let finalTitle = (title || "").trim();
  let channel = "";

  if (videoId) {
    const meta = await youtubeMeta(videoId);
    if (meta) {
      finalTitle = meta.title || finalTitle;
      channel = meta.author_name || "";
    }
  }
  if (!finalTitle) {
    try {
      finalTitle = new URL(url).hostname;
    } catch {
      finalTitle = url;
    }
  }

  const res = await fetch(`${apiBase}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      kind: kindOf(url),
      videoId,
      title: finalTitle,
      channel,
      thumbnail: videoId ? thumbFor(videoId) : "",
      regionId: regionId || null,
      categoryId: categoryId || null,
      note,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `save failed: ${res.status}`);
  }
  return res.json();
}
