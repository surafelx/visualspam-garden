import { useState, useMemo, useRef } from "react";
import { articles as seedArticles, threadById, threads, timeAgo, dayKey, CROP_CHOICES } from "../data.js";

const KINDS = ["All", "Essay", "Note", "Log", "Book"];

function loadCustom() {
  try { return JSON.parse(localStorage.getItem("vsg_library") || "[]"); } catch { return []; }
}
function saveCustom(list) { localStorage.setItem("vsg_library", JSON.stringify(list)); }

function loadDeleted() {
  try { return JSON.parse(localStorage.getItem("vsg_library_deleted") || "[]"); } catch { return []; }
}
function saveDeleted(list) { localStorage.setItem("vsg_library_deleted", JSON.stringify(list)); }

export function getAllArticles() {
  const custom = loadCustom();
  const deleted = loadDeleted();
  const activeSeeds = seedArticles.filter((a) => !deleted.includes(a.id));
  return [...custom, ...activeSeeds];
}

function getBlocks(article) {
  if (article.blocks && article.blocks.length > 0) return article.blocks;
  if (article.body) {
    return article.body.split("\n\n").filter(Boolean).map((p) => ({ type: "text", content: p }));
  }
  return [];
}

const BLOCK_TYPES = [
  { type: "text", label: "Paragraph", icon: "¶" },
  { type: "h2", label: "Heading", icon: "H2" },
  { type: "h3", label: "Subheading", icon: "H3" },
  { type: "image", label: "Image", icon: "🖼" },
  { type: "audio", label: "Audio", icon: "🎵" },
  { type: "video", label: "Video", icon: "🎬" },
];

function BlockEditor({ block, onChange, onRemove }) {
  const update = (patch) => onChange({ ...block, ...patch });

  if (block.type === "text" || block.type === "h2" || block.type === "h3") {
    const Tag = block.type === "text" ? "textarea" : "input";
    return (
      <div className={`lf-block lf-block-${block.type}`}>
        <div className="lf-block-toolbar">
          <span className="lf-block-type">{BLOCK_TYPES.find((b) => b.type === block.type)?.icon}</span>
          <button className="lf-block-remove" onClick={onRemove} title="Remove block">✕</button>
        </div>
        <Tag
          className={block.type === "text" ? "lf-block-textarea" : "lf-block-heading-input"}
          value={block.content || ""}
          onChange={(e) => update({ content: e.target.value })}
          placeholder={block.type === "text" ? "Write..." : block.type === "h2" ? "Heading" : "Subheading"}
          rows={block.type === "text" ? 3 : 1}
        />
      </div>
    );
  }

  if (block.type === "image" || block.type === "audio" || block.type === "video") {
    return (
      <div className={`lf-block lf-block-${block.type}`}>
        <div className="lf-block-toolbar">
          <span className="lf-block-type">{BLOCK_TYPES.find((b) => b.type === block.type)?.icon}</span>
          <button className="lf-block-remove" onClick={onRemove} title="Remove block">✕</button>
        </div>
        <input
          className="lf-block-url-input"
          value={block.url || ""}
          onChange={(e) => update({ url: e.target.value })}
          placeholder={block.type === "image" ? "Image URL" : block.type === "audio" ? "Audio URL" : "Video URL (YouTube, Vimeo, or direct)"}
        />
        <input
          className="lf-block-caption-input"
          value={block.caption || ""}
          onChange={(e) => update({ caption: e.target.value })}
          placeholder="Caption (optional)"
        />
        {block.url && block.type === "image" && (
          <img className="lf-block-preview" src={block.url} alt={block.caption || ""} />
        )}
        {block.url && block.type === "audio" && (
          <audio className="lf-block-preview" src={block.url} controls />
        )}
        {block.url && block.type === "video" && (
          <div className="lf-block-video-wrap">
            {block.url.includes("youtube.com") || block.url.includes("youtu.be") ? (
              <iframe
                className="lf-block-preview"
                src={`https://www.youtube.com/embed/${block.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                allowFullScreen
              />
            ) : block.url.includes("vimeo.com") ? (
              <iframe
                className="lf-block-preview"
                src={`https://player.vimeo.com/video/${block.url.match(/vimeo\.com\/(\d+)/)?.[1] || ""}`}
                allowFullScreen
              />
            ) : (
              <video className="lf-block-preview" src={block.url} controls />
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

function ArticleForm({ onSave, onCancel, initial, regions = [] }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [thread, setThread] = useState(initial?.thread || "philosophy");
  const [kind, setKind] = useState(initial?.kind || "Essay");
  const [regionId, setRegionId] = useState(initial?.regionId || "");
  const [plantId, setPlantId] = useState(initial?.plantId || "");
  const [fruitId, setFruitId] = useState(initial?.fruitId || "");
  const [blocks, setBlocks] = useState(() => {
    if (initial?.blocks?.length) return initial.blocks;
    if (initial?.body) {
      return initial.body.split("\n\n").filter(Boolean).map((p) => ({ type: "text", content: p }));
    }
    return [{ type: "text", content: "" }];
  });
  const bodyRef = useRef(null);

  const selectedRegion = regions.find((r) => r.id === regionId);
  const selectedPlant = selectedRegion?.plants?.find((p) => p.id === plantId);
  const fruits = selectedPlant?.fruits || [];

  const addBlock = (type) => {
    setBlocks((prev) => [...prev, { type, content: "", url: "", caption: "" }]);
  };

  const updateBlock = (index, patch) => {
    setBlocks((prev) => prev.map((b, i) => i === index ? { ...b, ...patch } : b));
  };

  const removeBlock = (index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveBlock = (index, dir) => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    if (!title.trim()) return;
    const hasContent = blocks.some((b) => (b.type === "text" || b.type === "h2" || b.type === "h3") && b.content?.trim());
    if (!hasContent) return;
    const bodyText = blocks
      .filter((b) => b.type === "text" || b.type === "h2" || b.type === "h3")
      .map((b) => b.content)
      .join("\n\n");
    const mins = Math.max(1, Math.ceil(bodyText.split(/\s+/).length / 200));
    const excerpt = bodyText.split("\n")[0].slice(0, 120);
    onSave({
      id: initial?.id || `custom_${Date.now()}`,
      title: title.trim(),
      thread, kind,
      regionId: regionId || undefined,
      plantId: plantId || undefined,
      fruitId: fruitId || undefined,
      minutes: mins,
      dateLabel: initial?.dateLabel || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      excerpt, body: bodyText, blocks,
    });
  };

  return (
    <div className="lf-editor">
      <div className="lf-editor-bar">
        <button className="lf-back" onClick={onCancel}>← Back</button>
        <div className="lf-editor-bar-actions">
          <button className="lf-btn lf-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="lf-btn lf-btn-primary" onClick={save} disabled={!title.trim()}>Publish</button>
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

        {regions.length > 0 && (
          <div className="lf-meta-row">
            <div className="lf-meta-group">
              <span className="lf-meta-label">Bed</span>
              <div className="lf-select-row">
                <select className="lf-select" value={regionId} onChange={(e) => { setRegionId(e.target.value); setPlantId(""); setFruitId(""); }}>
                  <option value="">None</option>
                  {regions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                {selectedRegion && (
                  <select className="lf-select" value={plantId} onChange={(e) => { setPlantId(e.target.value); setFruitId(""); }}>
                    <option value="">All plants</option>
                    {(selectedRegion.plants || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                {selectedPlant && fruits.length > 0 && (
                  <select className="lf-select" value={fruitId} onChange={(e) => setFruitId(e.target.value)}>
                    <option value="">All fruits</option>
                    {fruits.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="lf-blocks" ref={bodyRef}>
          {blocks.map((block, i) => (
            <div key={i} className="lf-block-wrap">
              {blocks.length > 1 && (
                <div className="lf-block-move">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
                </div>
              )}
              <BlockEditor
                block={block}
                onChange={(patch) => updateBlock(i, patch)}
                onRemove={() => removeBlock(i)}
              />
            </div>
          ))}
        </div>

        <div className="lf-add-block-bar">
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} className="lf-add-block-btn" onClick={() => addBlock(bt.type)} title={bt.label}>
              <span className="lf-add-block-icon">{bt.icon}</span>
              <span className="lf-add-block-label">{bt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticleReader({ article, onBack, onEdit, onDelete, regions = [] }) {
  const t = threadById[article.thread];
  const blocks = getBlocks(article);

  const linkedRegion = article.regionId ? regions.find((r) => r.id === article.regionId) : null;
  const linkedPlant = linkedRegion && article.plantId ? linkedRegion.plants?.find((p) => p.id === article.plantId) : null;
  const linkedFruit = linkedPlant && article.fruitId ? (linkedPlant.fruits || []).find((f) => f.id === article.fruitId) : null;

  return (
    <div className="library">
      <div className="lf-reader-bar">
        <button className="lf-back" onClick={onBack}>← Back</button>
        <div className="lf-reader-bar-actions">
          <button className="lf-btn lf-btn-ghost" onClick={onEdit}>Edit</button>
          <button className="lf-btn lf-btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <article className="lf-reader">
        <div className="lf-reader-meta">
          <span className="lf-reader-dot" style={{ background: t?.color }} />
          <span className="lf-reader-thread">{t?.name}</span>
          <span className="lf-reader-sep">·</span>
          <span className="lf-reader-kind">{article.kind}</span>
          <span className="lf-reader-sep">·</span>
          <span className="lf-reader-mins">{article.minutes} min read</span>
          <span className="lf-reader-sep">·</span>
          <span className="lf-reader-date">{article.dateLabel}</span>
        </div>
        <h1 className="lf-reader-title">{article.title}</h1>
        {(linkedRegion || linkedPlant || linkedFruit) && (
          <div className="lf-reader-links">
            {linkedRegion && <span className="lf-reader-link">🌱 {linkedRegion.label}</span>}
            {linkedPlant && <span className="lf-reader-link">🌿 {linkedPlant.name}</span>}
            {linkedFruit && <span className="lf-reader-link">🍊 {linkedFruit.title}</span>}
          </div>
        )}
        <div className="lf-reader-body">
          {blocks.map((block, i) => {
            if (block.type === "text") return <p key={i}>{block.content}</p>;
            if (block.type === "h2") return <h2 key={i}>{block.content}</h2>;
            if (block.type === "h3") return <h3 key={i}>{block.content}</h3>;
            if (block.type === "image") return (
              <figure key={i} className="lf-reader-figure">
                <img src={block.url} alt={block.caption || ""} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
            if (block.type === "audio") return (
              <figure key={i} className="lf-reader-figure">
                <audio src={block.url} controls />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
            if (block.type === "video") return (
              <figure key={i} className="lf-reader-figure">
                {block.url.includes("youtube.com") || block.url.includes("youtu.be") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${block.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}`}
                    allowFullScreen
                  />
                ) : block.url.includes("vimeo.com") ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${block.url.match(/vimeo\.com\/(\d+)/)?.[1] || ""}`}
                    allowFullScreen
                  />
                ) : (
                  <video src={block.url} controls />
                )}
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
            return null;
          })}
        </div>
      </article>
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
  const [deleted, setDeleted] = useState(loadDeleted);
  const [tab, setTab] = useState("entries");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const allArticles = useMemo(() => {
    const activeSeeds = seedArticles.filter((a) => !deleted.includes(a.id));
    return [...custom, ...activeSeeds];
  }, [custom, deleted]);
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
    if (id.startsWith("custom_")) {
      const next = custom.filter((a) => a.id !== id);
      setCustom(next);
      saveCustom(next);
    } else {
      const next = [...deleted, id];
      setDeleted(next);
      saveDeleted(next);
    }
    if (openId === id) setOpenId(null);
    setConfirmDelete(null);
  };

  if (tab === "editor" || editing) {
    return (
      <div className="library">
        <ArticleForm onSave={handleSave} onCancel={() => setEditing(null)} initial={editing} regions={regions} />
      </div>
    );
  }

  if (openId && open) {
    return (
      <ArticleReader
        article={open}
        onBack={() => setOpenId(null)}
        onEdit={() => { setEditing(open); setOpenId(null); }}
        onDelete={() => setConfirmDelete(openId)}
        regions={regions}
      />
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
              const aRegion = a.regionId ? regions.find((r) => r.id === a.regionId) : null;
              const aPlant = aRegion && a.plantId ? aRegion.plants?.find((p) => p.id === a.plantId) : null;
              const aFruit = aPlant && a.fruitId ? (aPlant.fruits || []).find((f) => f.id === a.fruitId) : null;
              return (
                <div key={a.id} className="lf-card-wrap">
                  <button className="lf-card" onClick={() => setOpenId(a.id)}>
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
                        {aRegion && <><span className="lf-card-sep">·</span><span>🌱 {aRegion.label}</span></>}
                        {aPlant && <><span className="lf-card-sep">·</span><span>🌿 {aPlant.name}</span></>}
                        {aFruit && <><span className="lf-card-sep">·</span><span>🍊 {aFruit.title}</span></>}
                        <span className="lf-card-sep">·</span>
                        <span>{a.minutes} min</span>
                      </div>
                    </div>
                  </button>
                  <div className="lf-card-actions">
                    <button className="lf-card-action" onClick={(e) => { e.stopPropagation(); setEditing(a); setOpenId(null); }}>Edit</button>
                    <button className="lf-card-action lf-card-action-del" onClick={(e) => { e.stopPropagation(); setConfirmDelete(a.id); }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <LogSection regions={regions} />
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            <h2 className="ms-title">Delete entry?</h2>
            <p className="ms-region">This action cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="ms-save" style={{ flex: 1 }} onClick={() => handleDelete(confirmDelete)}>Delete</button>
              <button className="ed-clear" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
