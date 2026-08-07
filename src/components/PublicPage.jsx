import { useState, useMemo } from "react";
import { threadById } from "../data.js";

export default function PublicPage({ onLogin, regions = [], articles = [] }) {
  const [selectedThread, setSelectedThread] = useState(null);

  const activeArticles = useMemo(() => {
    if (!selectedThread) return articles;
    return articles.filter((a) => a.thread === selectedThread);
  }, [articles, selectedThread]);

  const bedThreads = useMemo(() => {
    const map = {};
    regions.forEach((r) => {
      if (!map[r.thread]) map[r.thread] = { thread: r.thread, beds: 0, label: threadById[r.thread]?.label || r.thread };
      map[r.thread].beds++;
    });
    return Object.values(map);
  }, [regions]);

  const selectedInfo = selectedThread ? threadById[selectedThread] : null;

  return (
    <div className="lp">
      <div className="lp-texture" />

      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <button className="lp-brand-icon" onClick={onLogin} title="garden">🌱</button>
            <span className="lp-brand-name">VisualSpam Garden</span>
          </div>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <h1 className="lp-hero-title">A place for growing ideas</h1>
          <p className="lp-hero-sub">Tending thoughts, and reading what matters.</p>
        </section>

        {bedThreads.length > 0 && (
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
                    <span className="lp-bed-meta">{bt.beds} bed{bt.beds > 1 ? "s" : ""}</span>
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
        )}

        {activeArticles.length > 0 && (
          <section className="lp-section">
            <h2 className="lp-section-title">
              {selectedInfo ? `${selectedInfo.icon} ${selectedInfo.name} Essays` : "Essays & Notes"}
            </h2>
            <div className="lp-articles">
              {activeArticles.map((a) => (
                <div key={a.id} className="lp-article-card">
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
