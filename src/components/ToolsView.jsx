import { useState, useEffect, useMemo, useCallback } from "react";
import { threadById } from "../data.js";
import * as api from "../api.js";

/* Pulls the video id out of any of the URL shapes YouTube hands out. */
function videoIdFrom(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
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

function MusicTool({ regions, ytKey }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [tracks, setTracks] = useState([]);
  const [bed, setBed] = useState("none");
  const [playing, setPlaying] = useState(null);
  const [pasteUrl, setPasteUrl] = useState("");

  const loadTracks = useCallback(() => {
    api.fetchTracks().then(setTracks).catch(() => setTracks([]));
  }, []);
  useEffect(loadTracks, [loadTracks]);

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    if (!ytKey) {
      setError("Add a YouTube Data API key in Settings to search, or paste a link below.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      const url =
        "https://www.googleapis.com/youtube/v3/search" +
        `?part=snippet&type=video&videoCategoryId=10&maxResults=10` +
        `&q=${encodeURIComponent(query.trim())}&key=${encodeURIComponent(ytKey)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `${res.status}`);
      setResults(
        (data.items || []).map((it) => ({
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

  const save = async (track) => {
    try {
      await api.createTrack({ ...track, regionId: bed === "none" ? null : bed });
      loadTracks();
    } catch {
      setError("Could not save that track.");
    }
  };

  const savePasted = async (e) => {
    e.preventDefault();
    const id = videoIdFrom(pasteUrl);
    if (!id) {
      setError("That does not look like a YouTube link.");
      return;
    }
    setError("");
    // oEmbed needs no API key, so a pasted link still gets a real title
    // instead of showing the raw URL back at you.
    let title = pasteUrl.trim();
    let channel = "";
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${id}`
        )}`
      );
      if (res.ok) {
        const meta = await res.json();
        title = meta.title || title;
        channel = meta.author_name || "";
      }
    } catch {
      // offline or blocked — fall back to the URL as the title
    }
    await save({ videoId: id, title, channel, thumbnail: thumbFor(id) });
    setPasteUrl("");
  };

  const remove = async (id) => {
    await api.deleteTrack(id).catch(() => {});
    loadTracks();
  };

  const moveToBed = async (id, regionId) => {
    await api.updateTrack(id, { regionId: regionId === "none" ? null : regionId }).catch(() => {});
    loadTracks();
  };

  // group the saved tracks under the bed they belong to
  const grouped = useMemo(() => {
    const byBed = new Map();
    tracks.forEach((t) => {
      const key = t.regionId || "none";
      if (!byBed.has(key)) byBed.set(key, []);
      byBed.get(key).push(t);
    });
    const out = regions
      .filter((r) => byBed.has(r.id))
      .map((r) => ({ id: r.id, label: r.label, color: threadById[r.thread]?.color, items: byBed.get(r.id) }));
    if (byBed.has("none")) out.push({ id: "none", label: "unfiled", color: undefined, items: byBed.get("none") });
    return out;
  }, [tracks, regions]);

  const isSaved = (videoId) =>
    tracks.some((t) => t.videoId === videoId && (t.regionId || "none") === bed);

  return (
    <div className="tool">
      <div className="tool-head">
        <h2 className="tool-title">music</h2>
        <p className="tool-sub">
          find a track on YouTube and keep it with a bed. saves the link, plays through YouTube.
        </p>
      </div>

      <div className="tool-bedpick">
        <label className="tool-label" htmlFor="tool-bed">save to</label>
        <select
          id="tool-bed"
          className="tool-select"
          value={bed}
          onChange={(e) => setBed(e.target.value)}
        >
          <option value="none">no bed</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      <form className="tool-search" onSubmit={search}>
        <input
          className="tool-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search youtube for music…"
        />
        <button className="tool-btn" type="submit" disabled={searching || !query.trim()}>
          {searching ? "searching…" : "search"}
        </button>
      </form>

      {error && <p className="tool-error">{error}</p>}

      {results.length > 0 && (
        <ul className="tool-results">
          {results.map((r) => (
            <li key={r.videoId} className="tool-result">
              <img className="tool-thumb" src={r.thumbnail} alt="" loading="lazy" />
              <div className="tool-result-main">
                <span className="tool-result-title">{r.title}</span>
                <span className="tool-result-channel">{r.channel}</span>
              </div>
              <button
                className="tool-btn tool-btn-quiet"
                onClick={() => save(r)}
                disabled={isSaved(r.videoId)}
              >
                {isSaved(r.videoId) ? "saved" : "save"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="tool-paste" onSubmit={savePasted}>
        <label className="tool-label" htmlFor="tool-paste">or paste a link</label>
        <div className="tool-paste-row">
          <input
            id="tool-paste"
            className="tool-input"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
          />
          <button className="tool-btn" type="submit" disabled={!pasteUrl.trim()}>add</button>
        </div>
      </form>

      <div className="tool-saved">
        {grouped.length === 0 && <p className="tool-empty">nothing saved yet.</p>}
        {grouped.map((g) => (
          <section key={g.id} className="tool-group">
            <h3 className="tool-group-title">
              {g.color && <span className="tool-dot" style={{ background: g.color }} />}
              {g.label}
              <span className="tool-count">{g.items.length}</span>
            </h3>
            <ul className="tool-track-list">
              {g.items.map((t) => (
                <li key={t._id} className="tool-track">
                  <button
                    className="tool-track-main"
                    onClick={() => setPlaying(playing === t._id ? null : t._id)}
                    title={playing === t._id ? "Hide player" : "Play"}
                  >
                    <img className="tool-thumb tool-thumb-sm" src={t.thumbnail || thumbFor(t.videoId)} alt="" loading="lazy" />
                    <span className="tool-track-text">
                      <span className="tool-track-title">{t.title}</span>
                      {t.channel && <span className="tool-track-channel">{t.channel}</span>}
                    </span>
                  </button>
                  <select
                    className="tool-select tool-select-sm"
                    value={t.regionId || "none"}
                    onChange={(e) => moveToBed(t._id, e.target.value)}
                    title="Move to bed"
                  >
                    <option value="none">no bed</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                  <a
                    className="tool-link"
                    href={`https://www.youtube.com/watch?v=${t.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on YouTube"
                  >
                    ↗
                  </a>
                  <button className="tool-remove" onClick={() => remove(t._id)} title="Remove">✕</button>
                  {playing === t._id && (
                    <div className="tool-player">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${t.videoId}?autoplay=1`}
                        title={t.title}
                        allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

const TOOLS = [{ id: "music", label: "music" }];

export default function ToolsView({ regions = [], settings = {} }) {
  const [tool, setTool] = useState("music");

  return (
    <div className="tools-view">
      <header className="tools-head">
        <h1>tools</h1>
        <nav className="tools-tabs">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tools-tab ${tool === t.id ? "on" : ""}`}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tool === "music" && <MusicTool regions={regions} ytKey={settings.ytKey} />}
    </div>
  );
}
