import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
});

const FETCH_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 15 * 60 * 1000;

// url -> { at, items }
const cache = new Map();

const text = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return String(v["#text"] ?? "");
  return String(v);
};

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/* Atom links come as one object or a list of them, each with a rel. */
function linkFrom(entry) {
  const raw = entry.link;
  if (typeof raw === "string") return raw;
  const links = asArray(raw);
  const alternate =
    links.find((l) => l?.["@rel"] === "alternate" && l?.["@href"]) ||
    links.find((l) => l?.["@href"]);
  if (alternate) return alternate["@href"];
  return text(raw);
}

/* Strip tags and collapse whitespace — feed summaries carry markup we do not
   want to render, and we only show a one-line excerpt anyway. */
const NAMED = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(str) {
  return String(str)
    // numeric, decimal and hex — feeds are full of &#x27; and &#8217;
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, n) => NAMED[n]);
}

function plain(html, limit = 280) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "visualspam-garden/1.0 (+feed reader)" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/* Reads RSS 2.0 and Atom. Returns { title, siteUrl, items }. */
export function parseFeed(xml) {
  const doc = parser.parse(xml);

  // RSS
  if (doc.rss?.channel) {
    const ch = doc.rss.channel;
    return {
      title: plain(text(ch.title), 200),
      siteUrl: text(ch.link),
      items: asArray(ch.item).map((it) => ({
        title: plain(text(it.title), 200) || "(untitled)",
        url: text(it.link) || text(it.guid),
        at: text(it.pubDate) || text(it["dc:date"]) || null,
        excerpt: plain(text(it.description)),
      })),
    };
  }

  // Atom
  if (doc.feed) {
    const f = doc.feed;
    return {
      title: plain(text(f.title), 200),
      siteUrl: linkFrom(f),
      items: asArray(f.entry).map((e) => ({
        title: plain(text(e.title), 200) || "(untitled)",
        url: linkFrom(e),
        at: text(e.published) || text(e.updated) || null,
        excerpt: plain(text(e.summary) || text(e.content) || text(e["media:group"]?.["media:description"])),
      })),
    };
  }

  throw new Error("not an RSS or Atom feed");
}

/* Fetches and parses a feed, honouring a short in-memory cache so opening the
   page repeatedly does not hammer anyone's server. */
export async function loadFeed(url, { force = false } = {}) {
  const hit = cache.get(url);
  if (!force && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const data = parseFeed(await fetchText(url));
  cache.set(url, { at: Date.now(), data });
  return data;
}

/* A YouTube channel or playlist URL rarely is the feed URL, so map the common
   shapes onto the XML feed YouTube publishes. */
export function normaliseFeedUrl(input) {
  const url = String(input || "").trim();
  const channel = url.match(/youtube\.com\/channel\/([\w-]+)/);
  if (channel) {
    return { url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channel[1]}`, kind: "youtube" };
  }
  const playlist = url.match(/[?&]list=([\w-]+)/);
  if (playlist && /youtube\.com/.test(url)) {
    return { url: `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlist[1]}`, kind: "youtube" };
  }
  if (/youtube\.com\/feeds\/videos\.xml/.test(url)) return { url, kind: "youtube" };
  return { url, kind: "rss" };
}

/* Most people know a site, not its feed URL. Look for the feed the page
   advertises, then fall back to the paths publishers conventionally use. */
const COMMON_PATHS = ["/feed", "/rss", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml"];

export async function discoverFeed(siteUrl) {
  // if it already parses as a feed, it is one
  try {
    await loadFeed(siteUrl, { force: true });
    return siteUrl;
  } catch {
    /* not a feed — go looking */
  }

  let html;
  try {
    html = await fetchText(siteUrl);
  } catch (err) {
    throw new Error(`could not reach that site: ${err.message}`);
  }

  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of links) {
    if (!/rel=["']?alternate/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const resolved = new URL(href, siteUrl).toString();
    try {
      await loadFeed(resolved, { force: true });
      return resolved;
    } catch {
      /* advertised but unreadable — keep looking */
    }
  }

  for (const path of COMMON_PATHS) {
    const candidate = new URL(path, siteUrl).toString();
    try {
      await loadFeed(candidate, { force: true });
      return candidate;
    } catch {
      /* try the next one */
    }
  }

  throw new Error("no feed found on that site");
}

export function clearCache(url) {
  if (url) cache.delete(url);
  else cache.clear();
}
