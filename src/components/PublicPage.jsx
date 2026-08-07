import { useState, useMemo } from "react";
import { threadById, threads, timeAgo, dayKey } from "../data.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

export default function PublicPage({ onAdmin, regions = [], articles = [] }) {
  const [selectedThread, setSelectedThread] = useState(null);

  const activeArticles = useMemo(() => {
    if (!selectedThread) return articles;
    return articles.filter((a) => a.thread === selectedThread);
  }, [articles, selectedThread]);

  const activeLogs = useMemo(() => {
    const all = regions
      .flatMap((r) => (r.logs || []).map((l) => ({ ...l, region: r.label, color: threadById[r.thread]?.color, thread: r.thread })))
      .sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (!selectedThread) return all.slice(0, 12);
    return all.filter((l) => l.thread === selectedThread).slice(0, 12);
  }, [regions, selectedThread]);

  const bedThreads = useMemo(() => {
    const map = {};
    regions.forEach((r) => {
      if (!map[r.thread]) map[r.thread] = { thread: r.thread, beds: 0, logs: 0, label: threadById[r.thread]?.label || r.thread };
      map[r.thread].beds++;
      map[r.thread].logs += (r.logs || []).length;
    });
    return Object.values(map).sort((a, b) => b.logs - a.logs);
  }, [regions]);

  const selectedInfo = selectedThread ? threadById[selectedThread] : null;

  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <span className="lp-brand-icon">🌱</span>
            <span className="lp-brand-name">VisualSpam Garden</span>
          </div>
          <button className="lp-admin-btn" onClick={onAdmin}>admin</button>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <h1 className="lp-hero-title">A place for growing ideas</h1>
          <p className="lp-hero-sub">Tending thoughts, and reading what matters.</p>
        </section>

        <section className="lp-section">
          <h2 className="lp-section-title">Beds</h2>
          <div className="lp-beds-grid">
            {bedThreads.map((bt) => {
              const t = threadById[bt.thread];
              return (
                <button
                  key={bt.thread}
                  className={`lp-bed-btn ${selectedThread === bt.thread ? "on" : ""}`}
                  onClick={() => setSelectedThread(selectedThread === bt.thread ? null : bt.thread)}
                >
                  <span className="lp-bed-icon">{t?.icon}</span>
                  <span className="lp-bed-name">{t?.name}</span>
                  <span className="lp-bed-meta">{bt.beds} bed{bt.beds > 1 ? "s" : ""} · {bt.logs} logs</span>
                </button>
              );
            })}
          </div>
          {selectedThread && (
            <button className="lp-clear-filter" onClick={() => setSelectedThread(null)}>
              Show all
            </button>
          )}
        </section>

        {activeArticles.length > 0 && (
          <section className="lp-section">
            <h2 className="lp-section-title">
              {selectedInfo ? `${selectedInfo.icon} ${selectedInfo.name} Essays` : "Essays & Notes"}
            </h2>
            <div className="lp-articles">
              {activeArticles.map((a) => {
                const t = threadById[a.thread];
                return (
                  <div key={a.id} className="lp-article-card">
                    <div className="lp-article-accent" style={{ background: t?.color }} />
                    <div className="lp-article-body">
                      <div className="lp-article-meta">
                        <span className="lp-article-kind">{a.kind}</span>
                        <span className="lp-article-dot">·</span>
                        <span>{a.minutes} min</span>
                        <span className="lp-article-dot">·</span>
                        <span>{a.dateLabel}</span>
                      </div>
                      <h3 className="lp-article-title">{a.title}</h3>
                      <p className="lp-article-excerpt">{a.excerpt}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeLogs.length > 0 && (
          <section className="lp-section">
            <h2 className="lp-section-title">Activity</h2>
            <div className="lp-logs">
              {activeLogs.map((l, i) => (
                <div key={i} className="lp-log-row">
                  <span className="lp-log-dot" style={{ background: l.color }} />
                  <span className="lp-log-icon">{FEED_ICON[l.type] || "•"}</span>
                  <span className="lp-log-content">
                    <span className="lp-log-region">{l.region}</span>
                    <span className="lp-log-text">{l.text}</span>
                  </span>
                  <span className="lp-log-time">{timeAgo(l.ts)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {regions.length === 0 && articles.length === 0 && (
          <section className="lp-empty">
            <div className="lp-empty-icon">🌿</div>
            <p>The garden is quiet. No beds or essays yet.</p>
          </section>
        )}
      </main>
    </div>
  );
}
