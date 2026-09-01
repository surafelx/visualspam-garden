import { useState, useEffect, useMemo, useCallback } from "react";
import { threadById } from "../data.js";
import * as api from "../api.js";

/* Pulls the video id out of any of the URL shapes YouTube hands out. */
export function youtubeIdFrom(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
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

const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/* What kind of thing is on the end of this URL? */
export function kindOf(url) {
  const u = String(url || "");
  if (youtubeIdFrom(u) || /vimeo\.com/.test(u) || /\.(mp4|webm|mov)(\?|$)/i.test(u)) return "video";
  if (/\.(mp3|wav|ogg|m4a|flac|aac)(\?|$)/i.test(u)) return "audio";
  if (/\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(u)) return "image";
  return "link";
}

const KIND_ICON = { video: "▶", audio: "♪", image: "▣", link: "↗" };

/* A readable fallback title when we cannot ask the source for one. */
function titleFrom(url) {
  const vid = youtubeIdFrom(url);
  // /watch?v=… has nothing useful in its path, so name it by the video
  if (vid) return `youtube · ${vid}`;
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(last || u.hostname).replace(/[-_]+/g, " ").slice(0, 120);
  } catch {
    return url.slice(0, 120);
  }
}

/* Every link the essays already reference — media blocks and background
   music. These live in the essays, so the archive shows them rather than
   owning them, with one click to keep a copy of the reference. */
function linksInEssays(essays) {
  const out = [];
  essays.forEach((e) => {
    if (e.bgMusic) {
      out.push({ url: e.bgMusic, kind: kindOf(e.bgMusic), from: e.title, role: "background music" });
    }
    (e.blocks || []).forEach((b) => {
      if (b.url) out.push({ url: b.url, kind: kindOf(b.url), from: e.title, role: b.type });
    });
  });
  // the same asset can appear in several essays; show it once
  const seen = new Set();
  return out.filter((l) => (seen.has(l.url) ? false : seen.add(l.url)));
}

function EntryRow({ entry, regions, playing, onTogglePlay, open, onToggleDetails, onPatch, onRemove }) {
  const [note, setNote] = useState(entry.note || "");
  const [transcript, setTranscript] = useState(entry.transcript || "");
  const [title, setTitle] = useState(entry.title || "");

  useEffect(() => { setNote(entry.note || ""); }, [entry.note]);
  useEffect(() => { setTranscript(entry.transcript || ""); }, [entry.transcript]);
  useEffect(() => { setTitle(entry.title || ""); }, [entry.title]);

  const region = regions.find((r) => r.id === entry.regionId) || null;
  const plants = region?.plants || [];
  const plant = plants.find((p) => p.id === entry.plantId) || null;
  const fruits = plant?.fruits || [];
  const fruit = fruits.find((f) => f.id === entry.fruitId) || null;
  const where = [region?.label, plant?.name, fruit?.title].filter(Boolean).join(" → ");
  const playable = entry.kind === "video" || entry.kind === "audio";

  return (
    <li className="arc-item">
      <button
        className="arc-item-main"
        onClick={playable ? onTogglePlay : onToggleDetails}
        title={playable ? (playing ? "Hide player" : "Play") : "Details"}
      >
        {entry.thumbnail ? (
          <img className="arc-thumb" src={entry.thumbnail} alt="" loading="lazy" />
        ) : (
          <span className={`arc-thumb arc-thumb-icon arc-kind-${entry.kind}`}>{KIND_ICON[entry.kind]}</span>
        )}
        <span className="arc-item-text">
          <span className="arc-item-title">{entry.title}</span>
          <span className="arc-item-meta">
            {entry.channel || titleFrom(entry.url)}
            {where && <span className="arc-where"> · {where}</span>}
            {entry.note && <span className="arc-flag" title="Has a note"> ✎</span>}
            {entry.transcript && <span className="arc-flag" title="Has a transcript"> ▤</span>}
          </span>
        </span>
      </button>

      <button
        className={`arc-details-btn ${open ? "on" : ""}`}
        onClick={onToggleDetails}
        aria-expanded={open}
      >
        {open ? "close" : "details"}
      </button>
      <a className="arc-link" href={entry.url} target="_blank" rel="noopener noreferrer" title="Open">↗</a>
      <button className="arc-remove" onClick={onRemove} title="Remove">✕</button>

      {playing && playable && (
        <div className="arc-player">
          {entry.videoId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${entry.videoId}?autoplay=1`}
              title={entry.title}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : entry.kind === "audio" ? (
            <audio src={entry.url} controls autoPlay />
          ) : (
            <video src={entry.url} controls autoPlay />
          )}
        </div>
      )}

      {open && (
        <div className="arc-details">
          <label className="arc-label" htmlFor={`t-${entry._id}`}>title</label>
          <input
            id={`t-${entry._id}`}
            className="arc-input arc-input-boxed"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== entry.title && onPatch({ title: title.trim() })}
          />

          <div className="arc-detail-rows">
            <div className="arc-detail-row">
              <label className="arc-label">bed</label>
              <select
                className="arc-select"
                value={entry.regionId || "none"}
                onChange={(e) => onPatch({ regionId: e.target.value })}
              >
                <option value="none">no bed</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            {region && plants.length > 0 && (
              <div className="arc-detail-row">
                <label className="arc-label">plant</label>
                <select
                  className="arc-select"
                  value={entry.plantId || "none"}
                  onChange={(e) =>
                    onPatch({ plantId: e.target.value === "none" ? null : e.target.value, fruitId: null })
                  }
                >
                  <option value="none">none</option>
                  {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {plant && fruits.length > 0 && (
              <div className="arc-detail-row">
                <label className="arc-label">fruit</label>
                <select
                  className="arc-select"
                  value={entry.fruitId || "none"}
                  onChange={(e) => onPatch({ fruitId: e.target.value === "none" ? null : e.target.value })}
                >
                  <option value="none">none</option>
                  {fruits.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>
            )}
          </div>

          {region && plants.length === 0 && (
            <p className="arc-hint">this bed has no plants yet, so there is nothing to attach to.</p>
          )}

          <label className="arc-label" htmlFor={`n-${entry._id}`}>note</label>
          <textarea
            id={`n-${entry._id}`}
            className="arc-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (entry.note || "") && onPatch({ note })}
            placeholder="why you kept this, what it is for…"
            rows={2}
          />

          <div className="arc-detail-head">
            <label className="arc-label" htmlFor={`x-${entry._id}`}>transcript</label>
            <a className="arc-btn arc-btn-quiet" href={entry.url} target="_blank" rel="noopener noreferrer">
              open source ↗
            </a>
          </div>
          <p className="arc-hint">
            YouTube only lets an app pull captions for videos you own, so this cannot fetch them
            for you. Open the source, use its own transcript panel, and keep what you need here.
          </p>
          <textarea
            id={`x-${entry._id}`}
            className="arc-textarea arc-textarea-tall"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onBlur={() => transcript !== (entry.transcript || "") && onPatch({ transcript })}
            placeholder="paste a transcript, or your own notes from it…"
            rows={6}
          />
        </div>
      )}
    </li>
  );
}

const KINDS = [
  { id: "all", label: "everything" },
  { id: "video", label: "video" },
  { id: "audio", label: "audio" },
  { id: "image", label: "image" },
  { id: "link", label: "pages" },
];

export default function ArchiveView({ regions = [], settings = {} }) {
  const [entries, setEntries] = useState([]);
  const [essayLinks, setEssayLinks] = useState([]);
  const [kind, setKind] = useState("all");
  const [bed, setBed] = useState("none");
  const [addUrl, setAddUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(null);
  const [details, setDetails] = useState(null);
  const [showFound, setShowFound] = useState(false);

  const load = useCallback(() => {
    api.fetchTracks().then(setEntries).catch(() => setEntries([]));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    api.fetchEssays()
      .then((es) => setEssayLinks(linksInEssays(es)))
      .catch(() => setEssayLinks([]));
  }, []);

  const add = async (entry) => {
    try {
      await api.createTrack({ ...entry, regionId: bed === "none" ? null : bed });
      load();
    } catch {
      setError("Could not save that.");
    }
  };

  const addFromUrl = async (raw) => {
    const url = String(raw || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      setError("That needs to be a full http(s) link.");
      return;
    }
    setError("");
    const vid = youtubeIdFrom(url);
    let title = titleFrom(url);
    let channel = "";
    let thumbnail = vid ? thumbFor(vid) : "";

    if (vid) {
      // oEmbed needs no API key, so a pasted link still gets a real title
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${vid}`
          )}`
        );
        if (res.ok) {
          const meta = await res.json();
          title = meta.title || title;
          channel = meta.author_name || "";
        }
      } catch {
        /* offline or blocked — keep the derived title */
      }
    }
    await add({ url, kind: kindOf(url), videoId: vid || "", title, channel, thumbnail });
  };

  const submitUrl = async (e) => {
    e.preventDefault();
    await addFromUrl(addUrl);
    setAddUrl("");
  };

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    if (!settings.ytKey) {
      setError("Add a YouTube Data API key in Settings to search, or paste a link.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const url =
        "https://www.googleapis.com/youtube/v3/search" +
        `?part=snippet&type=video&maxResults=10` +
        `&q=${encodeURIComponent(query.trim())}&key=${encodeURIComponent(settings.ytKey)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `${res.status}`);
      setResults(
        (data.items || []).map((it) => ({
          url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
          kind: "video",
          videoId: it.id.videoId,
          title: it.snippet.title,
          channel: it.snippet.channelTitle,
          thumbnail: it.snippet.thumbnails?.medium?.url || thumbFor(it.id.videoId),
        }))
      );
    } catch (err) {
      setError(err.message || "Search failed.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const patch = async (id, p) => {
    if (p.regionId !== undefined) p.regionId = p.regionId === "none" ? null : p.regionId;
    await api.updateTrack(id, p).catch(() => setError("Could not save that change."));
    load();
  };

  const remove = async (id) => {
    await api.deleteTrack(id).catch(() => {});
    load();
  };

  const shown = useMemo(
    () => (kind === "all" ? entries : entries.filter((e) => e.kind === kind)),
    [entries, kind]
  );

  const grouped = useMemo(() => {
    const byBed = new Map();
    shown.forEach((t) => {
      const key = t.regionId || "none";
      if (!byBed.has(key)) byBed.set(key, []);
      byBed.get(key).push(t);
    });
    const out = regions
      .filter((r) => byBed.has(r.id))
      .map((r) => ({ id: r.id, label: r.label, color: threadById[r.thread]?.color, items: byBed.get(r.id) }));
    if (byBed.has("none")) out.push({ id: "none", label: "unfiled", items: byBed.get("none") });
    return out;
  }, [shown, regions]);

  const savedUrls = useMemo(() => new Set(entries.map((e) => e.url)), [entries]);
  const unsavedFound = essayLinks.filter((l) => !savedUrls.has(l.url));
  const counts = useMemo(() => {
    const c = { all: entries.length };
    KINDS.slice(1).forEach((k) => { c[k.id] = entries.filter((e) => e.kind === k.id).length; });
    return c;
  }, [entries]);

  return (
    <div className="archive">
      <header className="arc-head">
        <h1>archive</h1>
        <nav className="arc-kinds">
          {KINDS.map((k) => (
            <button
              key={k.id}
              className={`arc-kind ${kind === k.id ? "on" : ""}`}
              onClick={() => setKind(k.id)}
            >
              {k.label}
              <span className="arc-count">{counts[k.id] || 0}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="arc-add">
        <div className="arc-bedpick">
          <label className="arc-label" htmlFor="arc-bed">file new items under</label>
          <select id="arc-bed" className="arc-select" value={bed} onChange={(e) => setBed(e.target.value)}>
            <option value="none">no bed</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        <form className="arc-row" onSubmit={submitUrl}>
          <input
            className="arc-input"
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            placeholder="paste any link — video, audio, image, or a page"
          />
          <button className="arc-btn" type="submit" disabled={!addUrl.trim()}>add</button>
        </form>

        <form className="arc-row" onSubmit={search}>
          <input
            className="arc-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="or search youtube…"
          />
          <button className="arc-btn" type="submit" disabled={searching || !query.trim()}>
            {searching ? "searching…" : "search"}
          </button>
        </form>

        {error && <p className="arc-error">{error}</p>}
      </div>

      {results.length > 0 && (
        <ul className="arc-results">
          {results.map((r) => (
            <li key={r.videoId} className="arc-result">
              <img className="arc-thumb" src={r.thumbnail} alt="" loading="lazy" />
              <div className="arc-result-main">
                <span className="arc-item-title">{r.title}</span>
                <span className="arc-item-meta">{r.channel}</span>
              </div>
              <button
                className="arc-btn arc-btn-quiet"
                onClick={() => add(r)}
                disabled={savedUrls.has(r.url)}
              >
                {savedUrls.has(r.url) ? "saved" : "save"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {unsavedFound.length > 0 && (
        <section className="arc-found">
          <button className="arc-found-head" onClick={() => setShowFound((v) => !v)} aria-expanded={showFound}>
            {unsavedFound.length} link{unsavedFound.length === 1 ? "" : "s"} already in your essays
            <span className="arc-caret">{showFound ? "−" : "+"}</span>
          </button>
          {showFound && (
            <ul className="arc-found-list">
              {unsavedFound.map((l) => (
                <li key={l.url} className="arc-found-item">
                  <span className={`arc-thumb arc-thumb-icon arc-kind-${l.kind}`}>{KIND_ICON[l.kind]}</span>
                  <span className="arc-item-text">
                    <span className="arc-item-title">{titleFrom(l.url)}</span>
                    <span className="arc-item-meta">{l.role} · {l.from}</span>
                  </span>
                  <button className="arc-btn arc-btn-quiet" onClick={() => addFromUrl(l.url)}>keep</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="arc-saved">
        {grouped.length === 0 && <p className="arc-empty">nothing archived yet.</p>}
        {grouped.map((g) => (
          <section key={g.id} className="arc-group">
            <h2 className="arc-group-title">
              {g.color && <span className="arc-dot" style={{ background: g.color }} />}
              {g.label}
              <span className="arc-count">{g.items.length}</span>
            </h2>
            <ul className="arc-list">
              {g.items.map((t) => (
                <EntryRow
                  key={t._id}
                  entry={t}
                  regions={regions}
                  playing={playing === t._id}
                  onTogglePlay={() => setPlaying(playing === t._id ? null : t._id)}
                  open={details === t._id}
                  onToggleDetails={() => setDetails(details === t._id ? null : t._id)}
                  onPatch={(p) => patch(t._id, p)}
                  onRemove={() => remove(t._id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
