import { useState, useEffect, useMemo } from "react";
import { threadById } from "../data.js";
import * as api from "../api.js";
import { triageItems, MAX_ITEMS } from "../lib/aiTriage.js";

const ICON = {
  water: "💧",
  sun: "☀️",
  note: "✎",
  grow: "🌸",
  checkin: "🌱",
  harvest: "🍊",
  wrote: "✍",
  kept: "🗄",
  sub: "◈",
};

const FILTERS = [
  { id: "all", label: "everything" },
  { id: "mine", label: "mine" },
  { id: "subbed", label: "subscribed" },
  { id: "tended", label: "tending" },
  { id: "harvest", label: "harvests" },
  { id: "wrote", label: "writing" },
  { id: "kept", label: "archive" },
];

/* Which filter bucket an item belongs to. */
const bucketOf = (kind) =>
  kind === "sub" ? "subbed"
    : kind === "harvest" || kind === "wrote" || kind === "kept" ? kind
    : "tended";

const matchesFilter = (item, filter) => {
  if (filter === "all") return true;
  const bucket = bucketOf(item.kind);
  if (filter === "mine") return bucket !== "subbed";
  return bucket === filter;
};

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 864e5);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

const timeOf = (date) =>
  new Date(date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/* Pulls one stream out of everything that carries a timestamp. */
function buildFeed(regions, essays, archive, subItems) {
  const items = [];

  regions.forEach((r) => {
    const colour = threadById[r.thread]?.color;
    (r.logs || []).forEach((l) => {
      if (!l.ts) return;
      items.push({
        id: `log-${r.id}-${l.ts}-${l.text}`,
        at: new Date(l.ts),
        kind: l.type,
        text: l.text || l.type,
        where: r.label,
        regionId: r.id,
        colour,
        detail: l.mins ? `${l.mins} min` : "",
      });
    });

    (r.plants || []).forEach((p) => {
      (p.fruits || []).forEach((f) => {
        // only harvested fruits carry a completion time
        if (!f.done || !f.doneTs) return;
        items.push({
          id: `fruit-${f.id}`,
          at: new Date(f.doneTs),
          kind: "harvest",
          text: f.title,
          where: `${r.label} → ${p.name}`,
          regionId: r.id,
          colour,
          detail: "harvested",
        });
      });
    });
  });

  essays.forEach((e) => {
    if (!e.createdAt) return;
    items.push({
      id: `essay-${e.id || e._id}`,
      at: new Date(e.createdAt),
      kind: "wrote",
      text: e.title,
      where: e.draft ? "draft" : (e.kind || "essay").toLowerCase(),
      colour: threadById[e.thread]?.color,
      detail: e.minutes ? `${e.minutes} min` : "",
      slug: e.title,
    });
  });

  archive.forEach((t) => {
    if (!t.createdAt) return;
    const region = regions.find((r) => r.id === t.regionId);
    items.push({
      id: `track-${t._id}`,
      at: new Date(t.createdAt),
      kind: "kept",
      text: t.title,
      where: region ? region.label : t.kind,
      regionId: t.regionId,
      colour: region ? threadById[region.thread]?.color : undefined,
      detail: t.channel || "",
      url: t.url,
    });
  });

  subItems.forEach((it, i) => {
    if (!it.at) return;
    items.push({
      id: `sub-${it.sourceId}-${it.url || i}`,
      at: new Date(it.at),
      kind: "sub",
      text: it.title,
      where: it.source,
      colour: undefined,
      detail: "",
      excerpt: it.excerpt,
      url: it.url,
    });
  });

  return items.sort((a, b) => b.at - a.at);
}

export default function FeedView({ regions = [], settings = {}, onOpenBed }) {
  const [essays, setEssays] = useState([]);
  const [archive, setArchive] = useState([]);
  const [subItems, setSubItems] = useState([]);
  const [subs, setSubs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [days, setDays] = useState(30);
  const [manage, setManage] = useState(false);
  const [subUrl, setSubUrl] = useState("");
  const [subTopics, setSubTopics] = useState("");
  const [subBusy, setSubBusy] = useState(false);
  const [subError, setSubError] = useState("");
  // id -> { keep, bedId, why } from the model
  const [picks, setPicks] = useState(new Map());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [hideNoise, setHideNoise] = useState(false);
  const [filed, setFiled] = useState(new Set());

  const loadSubs = () => {
    api.fetchSubs().then(setSubs).catch(() => setSubs([]));
    api.fetchSubItems().then(setSubItems).catch(() => setSubItems([]));
  };

  useEffect(() => {
    api.fetchEssays().then(setEssays).catch(() => setEssays([]));
    api.fetchTracks().then(setArchive).catch(() => setArchive([]));
    loadSubs();
  }, []);

  const addSub = async (e) => {
    e.preventDefault();
    if (!subUrl.trim()) return;
    setSubBusy(true);
    setSubError("");
    try {
      await api.createSub({
        url: subUrl.trim(),
        topics: subTopics.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
      });
      setSubUrl("");
      setSubTopics("");
      loadSubs();
    } catch (err) {
      setSubError(err.message || "could not subscribe to that.");
    } finally {
      setSubBusy(false);
    }
  };

  const removeSub = async (id) => {
    await api.deleteSub(id).catch(() => {});
    loadSubs();
  };

  const setTopics = async (id, value) => {
    await api.updateSub(id, { topics: value }).catch(() => {});
    loadSubs();
  };

  const sortWithAi = async (candidates) => {
    setAiBusy(true);
    setAiError("");
    try {
      const result = await triageItems({
        items: candidates.map((c) => ({ title: c.text, excerpt: c.excerpt, source: c.where })),
        beds: regions.map((r) => ({ id: r.id, label: r.label })),
        settings,
      });
      // the model answers by position; map it back onto the items
      const next = new Map(picks);
      result.forEach((verdict, i) => {
        const item = candidates[i];
        if (item) next.set(item.id, verdict);
      });
      setPicks(next);
    } catch (err) {
      setAiError(err.message || "Could not sort those.");
    } finally {
      setAiBusy(false);
    }
  };

  /* Keep an item in the archive, filed where the model suggested. */
  const fileItem = async (item, bedId) => {
    try {
      await api.createTrack({
        url: item.url,
        kind: "link",
        title: item.text,
        channel: item.where,
        regionId: bedId || null,
        note: picks.get(item.id)?.why || "",
      });
      setFiled((prev) => new Set(prev).add(item.id));
      api.fetchTracks().then(setArchive).catch(() => {});
    } catch {
      setAiError("Could not file that.");
    }
  };

  const all = useMemo(
    () => buildFeed(regions, essays, archive, subItems),
    [regions, essays, archive, subItems]
  );

  const counts = useMemo(() => {
    const c = { all: all.length };
    FILTERS.slice(1).forEach((f) => {
      c[f.id] = all.filter((i) => matchesFilter(i, f.id)).length;
    });
    return c;
  }, [all]);

  const shown = useMemo(() => {
    const cutoff = Date.now() - days * 864e5;
    return all.filter((i) => {
      if (i.at.getTime() < cutoff || !matchesFilter(i, filter)) return false;
      if (!hideNoise) return true;
      const pick = picks.get(i.id);
      return !pick || pick.keep;
    });
  }, [all, filter, days, hideNoise, picks]);

  // group the stream into days so it reads like a journal
  const grouped = useMemo(() => {
    const out = [];
    let current = null;
    shown.forEach((item) => {
      const label = dayLabel(item.at);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        out.push(current);
      }
      current.items.push(item);
    });
    return out;
  }, [shown]);

  return (
    <div className="fd">
      <header className="fd-head">
        <h1>feed</h1>
        <nav className="fd-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`fd-filter ${filter === f.id ? "on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="fd-count">{counts[f.id] || 0}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="fd-sources">
        <button className="fd-manage" onClick={() => setManage((v) => !v)} aria-expanded={manage}>
          {subs.length} subscription{subs.length === 1 ? "" : "s"}
          <span className="fd-caret">{manage ? "−" : "+"}</span>
        </button>

        {manage && (
          <div className="fd-manage-panel">
            <form className="fd-sub-form" onSubmit={addSub}>
              <input
                className="fd-input"
                value={subUrl}
                onChange={(e) => setSubUrl(e.target.value)}
                placeholder="paste a site or a youtube channel — the feed is found for you"
              />
              <input
                className="fd-input fd-input-sm"
                value={subTopics}
                onChange={(e) => setSubTopics(e.target.value)}
                placeholder="only when it mentions… (comma separated, optional)"
              />
              <button className="fd-btn" type="submit" disabled={subBusy || !subUrl.trim()}>
                {subBusy ? "checking…" : "subscribe"}
              </button>
            </form>
            {subError && <p className="fd-error">{subError}</p>}

            <ul className="fd-sub-list">
              {subs.map((sub) => (
                <li key={sub._id} className="fd-sub">
                  <span className="fd-sub-main">
                    <span className="fd-sub-title">{sub.title}</span>
                    <span className="fd-sub-meta">
                      {sub.kind}
                      {sub.lastError && <span className="fd-sub-error"> · {sub.lastError}</span>}
                    </span>
                  </span>
                  <input
                    className="fd-input fd-input-topics"
                    defaultValue={(sub.topics || []).join(", ")}
                    placeholder="all posts"
                    title="Only show posts mentioning these words"
                    onBlur={(e) => {
                      const next = e.target.value;
                      if (next !== (sub.topics || []).join(", ")) setTopics(sub._id, next);
                    }}
                  />
                  <button className="fd-go" onClick={() => removeSub(sub._id)} title="Unsubscribe">✕</button>
                </li>
              ))}
              {subs.length === 0 && <li className="fd-empty">not following anything yet.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="fd-ai">
        <button
          className="fd-btn"
          disabled={aiBusy || shown.filter((i) => i.kind === "sub").length === 0}
          onClick={() => sortWithAi(shown.filter((i) => i.kind === "sub").slice(0, MAX_ITEMS))}
          title={`Reads up to ${MAX_ITEMS} incoming items and suggests a bed for each`}
        >
          {aiBusy ? "reading…" : "sort with ai"}
        </button>
        {picks.size > 0 && (
          <button
            className={`fd-range-btn ${hideNoise ? "on" : ""}`}
            onClick={() => setHideNoise((v) => !v)}
          >
            hide what it skipped
          </button>
        )}
        {picks.size > 0 && (
          <button className="fd-range-btn" onClick={() => { setPicks(new Map()); setHideNoise(false); }}>
            clear picks
          </button>
        )}
        {aiError && <span className="fd-error">{aiError}</span>}
      </div>

      <div className="fd-range">
        {[7, 30, 90, 3650].map((d) => (
          <button
            key={d}
            className={`fd-range-btn ${days === d ? "on" : ""}`}
            onClick={() => setDays(d)}
          >
            {d === 3650 ? "all time" : `${d} days`}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <p className="fd-empty">nothing here in this stretch.</p>
      )}

      {grouped.map((group) => (
        <section key={group.label} className="fd-day">
          <h2 className="fd-day-label">
            {group.label}
            <span className="fd-count">{group.items.length}</span>
          </h2>
          <ul className="fd-list">
            {group.items.map((item) => (
              <li key={item.id} className={`fd-item fd-${bucketOf(item.kind)}`}>
                <span className="fd-time">{timeOf(item.at)}</span>
                <span className="fd-icon" aria-hidden="true">{ICON[item.kind] || "·"}</span>
                <span className="fd-body">
                  <span className="fd-text">{item.text}</span>
                  {item.excerpt && <span className="fd-excerpt">{item.excerpt}</span>}
                  {picks.has(item.id) && (() => {
                    const pick = picks.get(item.id);
                    const bed = regions.find((r) => r.id === pick.bedId);
                    return (
                      <span className={`fd-pick ${pick.keep ? "" : "skip"}`}>
                        {pick.keep ? (
                          <>
                            {bed ? (
                              <span className="fd-pick-bed">
                                <span className="fd-dot" style={{ background: threadById[bed.thread]?.color }} />
                                {bed.label}
                              </span>
                            ) : (
                              <span className="fd-pick-bed">no bed fits</span>
                            )}
                            {pick.why && <span className="fd-pick-why">{pick.why}</span>}
                            {item.url && (
                              filed.has(item.id) ? (
                                <span className="fd-pick-done">kept</span>
                              ) : (
                                <button className="fd-pick-keep" onClick={() => fileItem(item, pick.bedId)}>
                                  keep{bed ? ` in ${bed.label}` : ""}
                                </button>
                              )
                            )}
                          </>
                        ) : (
                          <span className="fd-pick-why">skipped{pick.why ? ` · ${pick.why}` : ""}</span>
                        )}
                      </span>
                    );
                  })()}
                  <span className="fd-meta">
                    {item.colour && <span className="fd-dot" style={{ background: item.colour }} />}
                    {item.where}
                    {item.detail && <span className="fd-detail"> · {item.detail}</span>}
                  </span>
                </span>
                {item.url ? (
                  <a className="fd-go" href={item.url} target="_blank" rel="noopener noreferrer" title="Open">↗</a>
                ) : item.regionId ? (
                  <button className="fd-go" onClick={() => onOpenBed?.(item.regionId)} title="Open bed">→</button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
