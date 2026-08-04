import { useState } from "react";
import { articles, threadById, threads } from "../data.js";

function BookCard({ article, onOpen }) {
  const t = threadById[article.thread];
  return (
    <button className="lp-book" style={{ "--rc": t?.color }} onClick={() => onOpen(article)}>
      <div className="lp-book-accent" style={{ background: t?.color }} />
      <div className="lp-book-inner">
        <span className="lp-book-kind">{article.kind}</span>
        <h3 className="lp-book-title">{article.title}</h3>
        <p className="lp-book-excerpt">{article.excerpt}</p>
        <div className="lp-book-foot">
          <span className="lp-book-dot" style={{ background: t?.color }} />
          <span>{t?.name}</span>
          <span className="lp-book-sep">·</span>
          <span>{article.minutes} min</span>
          <span className="lp-book-sep">·</span>
          <span>{article.dateLabel}</span>
        </div>
      </div>
    </button>
  );
}

function Reader({ article, onBack }) {
  const t = threadById[article.thread];
  return (
    <div className="lp-reader-wrap">
      <button className="lp-back" onClick={onBack}>← back</button>
      <article className="lp-reader" style={{ "--rc": t?.color }}>
        <div className="lp-reader-kicker">
          <span className="lp-book-dot" style={{ background: t?.color }} />
          {t?.name} · {article.kind} · {article.minutes} min
        </div>
        <h1 className="lp-reader-title">{article.title}</h1>
        <div className="lp-reader-date">{article.dateLabel}</div>
        {article.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
      </article>
    </div>
  );
}

export default function PublicPage({ onAdmin }) {
  const [openArticle, setOpenArticle] = useState(null);
  const [filter, setFilter] = useState("all");

  const kinds = ["all", ...new Set(articles.map((a) => a.kind))];
  const filtered = filter === "all" ? articles : articles.filter((a) => a.kind === filter);

  if (openArticle) {
    return <Reader article={openArticle} onBack={() => setOpenArticle(null)} />;
  }

  return (
    <div className="lp">
      <header className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-icon">🌱</div>
          <h1 className="lp-hero-title">VisualSpam Garden</h1>
          <p className="lp-hero-sub">A place for growing ideas, tending thoughts, and reading what matters.</p>
          <div className="lp-hero-threads">
            {threads.slice(0, 8).map((t) => (
              <span key={t.id} className="lp-hero-chip" style={{ "--rc": t.color }}>
                <span className="lp-hero-chip-dot" style={{ background: t.color }} />
                {t.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="lp-library">
        <div className="lp-library-head">
          <h2>Library</h2>
          <p>Essays, notes, and logs from the garden.</p>
        </div>

        <div className="lp-filters">
          {kinds.map((k) => (
            <button key={k} className={`lp-filter ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>
              {k}
            </button>
          ))}
        </div>

        <div className="lp-shelf">
          {filtered.map((a) => (
            <BookCard key={a.id} article={a} onOpen={setOpenArticle} />
          ))}
          {filtered.length === 0 && <p className="lp-empty">No articles in this category yet.</p>}
        </div>
      </section>

      <footer className="lp-footer">
        <button className="lp-admin-link" onClick={onAdmin}>admin</button>
      </footer>
    </div>
  );
}
