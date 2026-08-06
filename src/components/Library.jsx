import { useState, useMemo } from "react";
import { articles as seedArticles, threadById, threads, timeAgo, dayKey } from "../data.js";

const KINDS = ["All", "Essay", "Note", "Log", "Book"];

function loadCustom() {
  try { return JSON.parse(localStorage.getItem("vsg_library") || "[]"); } catch { return []; }
}
function saveCustom(list) { localStorage.setItem("vsg_library", JSON.stringify(list)); }

function ArticleForm({ onSave, onCancel, initial }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [thread, setThread] = useState(initial?.thread || "philosophy");
  const [kind, setKind] = useState(initial?.kind || "Essay");
  const [body, setBody] = useState(initial?.body || "");

  const save = () => {
    if (!title.trim() || !body.trim()) return;
    const mins = Math.max(1, Math.ceil(body.split(/\s+/).length / 200));
    const excerpt = body.split("\n")[0].slice(0, 120);
    onSave({
      id: initial?.id || `custom_${Date.now()}`,
      title: title.trim(),
      thread, kind,
      minutes: mins,
      dateLabel: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      excerpt, body: body.trim(),
    });
  };

  return (
    <div className="lf-editor">
      <div className="lf-editor-bar">
        <button className="lf-back" onClick={onCancel}>← Back</button>
        <div className="lf-editor-bar-actions">
          <button className="lf-btn lf-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="lf-btn lf-btn-primary" onClick={save} disabled={!title.trim() || !body.trim()}>Publish</button>
        </div>
      </div>
      <div className="lf-editor-body">
        <input className="lf-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled" autoFocus />
        <div className="lf-meta-row">
          <div className="lf-meta-group">
            <span className="lf-meta-label">Thread</span>
            <div className="lf-thread-chips">
              {threads.map((t) => (
                <button key={t.id} className={`lf-tchip ${thread === t.id ? "on" : ""}`} style={{ "--tc": t.color }} onClick={() => setThread(t.id)}>
                  <span className="lf-tchip-dot" style={{ background: t.color }} />{t.name}
                </button>
              ))}
            </div>
          </div>
          <div className="lf-meta-group">
            <span className="lf-meta-label">Kind</span>
            <div className="lf-kind-chips">
              {KINDS.slice(1).map((k) => (
                <button key={k} className={`lf-kchip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
          </div>
        </div>
        <textarea className="lf-body-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Start writing..." autoFocus />
      </div>
    </div>
  );
}

function LogSection({ regions }) {
  const grouped = useMemo(() => {
    const all = regions
      .flatMap((r) => (r.logs || []).map((l) => ({ ...l, region: r.label, color: threadById[r.thread]?.color })))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    const groups = {};
    all.forEach((l) => {
      const dk = dayKey(l.ts);
      if (!groups[dk]) groups[dk] = { label: formatDate(dk), items: [] };
      groups[dk].items.push(l);
    });
    return Object.values(groups);
  }, [regions]);

  if (grouped.length === 0) return <div className="lf-empty-state"><div className="lf-empty-icon">📋</div><p>No activity logs yet. Water or sunshine your beds to see them here.</p></div>;

  return (
    <div className="lf-logs">
      {grouped.map((g, gi) => (
        <div key={gi} className="lf-log-group">
          <div className="lf-log-date">{g.label}</div>
          {g.items.map((l, i) => (
            <div key={i} className="lf-log-row">
              <div className="lf-log-dot-wrap"><span className="lf-log-dot" style={{ background: l.color }} /></div>
              <div className="lf-log-icon">{l.type === "water" ? "💧" : l.type === "sun" ? "☀️" : l.type === "note" ? "✎" : "🌱"}</div>
              <div className="lf-log-content">
                <span className="lf-log-region">{l.region}</span>
                <span className="lf-log-text">{l.text}</span>
              </div>
              <span className="lf-log-time">{new Date(l.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function formatDate(dk) {
  const d = new Date(dk + "T12:00:00");
  const now = new Date();
  const diff = Math.floor((now - d) / 864e5);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function Library({ regions = [] }) {
  const [custom, setCustom] = useState(loadCustom);
  const [tab, setTab] = useState("entries");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);

  const allArticles = useMemo(() => [...custom, ...seedArticles], [custom]);
  const filtered = useMemo(() => filter === "All" ? allArticles : allArticles.filter((a) => a.kind === filter), [allArticles, filter]);
  const open = allArticles.find((a) => a.id === openId);

  const counts = useMemo(() => {
    const c = { All: allArticles.length };
    KINDS.slice(1).forEach((k) => { c[k] = allArticles.filter((a) => a.kind === k).length; });
    return c;
  }, [allArticles]);

  const handleSave = (article) => {
    const exists = custom.findIndex((a) => a.id === article.id);
    let next;
    if (exists >= 0) { next = [...custom]; next[exists] = article; }
    else { next = [article, ...custom]; }
    setCustom(next);
    saveCustom(next);
    setEditing(null);
  };

  const handleDelete = (id) => {
    const next = custom.filter((a) => a.id !== id);
    setCustom(next);
    saveCustom(next);
    if (openId === id) setOpenId(null);
  };

  if (tab === "editor" || editing) {
    return (
      <div className="library">
        <ArticleForm onSave={handleSave} onCancel={() => setEditing(null)} initial={editing} />
      </div>
    );
  }

  if (openId && open) {
    const t = threadById[open.thread];
    const isCustom = open.id.startsWith("custom_");
    return (
      <div className="library">
        <div className="lf-reader-bar">
          <button className="lf-back" onClick={() => setOpenId(null)}>← Back</button>
          <div className="lf-reader-bar-actions">
            {isCustom && (
              <>
                <button className="lf-btn lf-btn-ghost" onClick={() => { setEditing(open); setOpenId(null); }}>Edit</button>
                <button className="lf-btn lf-btn-danger" onClick={() => { handleDelete(open.id); setOpenId(null); }}>Delete</button>
              </>
            )}
          </div>
        </div>
        <article className="lf-reader">
          <div className="lf-reader-meta">
            <span className="lf-reader-dot" style={{ background: t?.color }} />
            <span className="lf-reader-thread">{t?.name}</span>
            <span className="lf-reader-sep">·</span>
            <span className="lf-reader-kind">{open.kind}</span>
            <span className="lf-reader-sep">·</span>
            <span className="lf-reader-mins">{open.minutes} min read</span>
            <span className="lf-reader-sep">·</span>
            <span className="lf-reader-date">{open.dateLabel}</span>
          </div>
          <h1 className="lf-reader-title">{open.title}</h1>
          <div className="lf-reader-body">
            {open.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="lf-head">
        <div className="lf-head-top">
          <h1 className="lf-head-title">Library</h1>
          <button className="lf-btn lf-btn-primary" onClick={() => setTab("editor")}>+ New Entry</button>
        </div>
        <div className="lf-tabs">
          <button className={`lf-tab ${tab === "entries" ? "on" : ""}`} onClick={() => setTab("entries")}>
            Entries <span className="lf-tab-count">{allArticles.length}</span>
          </button>
          <button className={`lf-tab ${tab === "logs" ? "on" : ""}`} onClick={() => setTab("logs")}>
            Activity Log <span className="lf-tab-count">{regions.reduce((n, r) => n + (r.logs?.length || 0), 0)}</span>
          </button>
        </div>
      </header>

      {tab === "entries" ? (
        <>
          <div className="lf-filters">
            {KINDS.map((k) => (
              <button key={k} className={`lf-filter ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
                {k} <span className="lf-filter-count">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="lf-shelf">
            {filtered.length === 0 && <div className="lf-empty-state"><div className="lf-empty-icon">✍️</div><p>No entries yet. Start writing.</p></div>}
            {filtered.map((a) => {
              const t = threadById[a.thread];
              const isCustom = a.id.startsWith("custom_");
              return (
                <div key={a.id} className="lf-card-wrap">
                  <button className="lf-card" onClick={() => setOpenId(a.id)}>
                    <div className="lf-card-accent" style={{ background: t?.color }} />
                    <div className="lf-card-body">
                      <div className="lf-card-top">
                        <span className="lf-card-kind">{a.kind}</span>
                        <span className="lf-card-date">{a.dateLabel}</span>
                      </div>
                      <h3 className="lf-card-title">{a.title}</h3>
                      <p className="lf-card-excerpt">{a.excerpt}</p>
                      <div className="lf-card-foot">
                        <span className="lf-card-dot" style={{ background: t?.color }} />
                        <span>{t?.name}</span>
                        <span className="lf-card-sep">·</span>
                        <span>{a.minutes} min</span>
                      </div>
                    </div>
                  </button>
                  {isCustom && (
                    <div className="lf-card-actions">
                      <button className="lf-card-action" onClick={(e) => { e.stopPropagation(); setEditing(a); setOpenId(null); }}>Edit</button>
                      <button className="lf-card-action lf-card-action-del" onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <LogSection regions={regions} />
      )}
    </div>
  );
}
