import { useState } from "react";
import { threadById } from "../data.js";

export default function PublicPage({ onLogin, regions = [], articles = [] }) {
  const [openId, setOpenId] = useState(null);
  const open = openId ? articles.find((a) => a.id === openId) : null;

  return (
    <div className="lp">
      <div className="lp-border lp-border-left" />
      <div className="lp-border lp-border-right" />

      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <button className="lp-brand-icon" onClick={onLogin} title="garden">🌱</button>
            <span className="lp-brand-name">VisualSpam Garden</span>
          </div>
        </div>
      </header>

      <main className="lp-main">
        {open ? (
          <div className="lp-reader">
            <button className="lp-reader-back" onClick={() => setOpenId(null)}>← back</button>
            <article className="lp-reader-article">
              <div className="lp-reader-meta">
                <span className="lp-reader-dot" style={{ background: threadById[open.thread]?.color }} />
                <span>{threadById[open.thread]?.name}</span>
                <span className="lp-sep">·</span>
                <span>{open.kind}</span>
                <span className="lp-sep">·</span>
                <span>{open.minutes} min</span>
                <span className="lp-sep">·</span>
                <span>{open.dateLabel}</span>
              </div>
              <h1 className="lp-reader-title">{open.title}</h1>
              <div className="lp-reader-body">
                {open.body.split("\n\n").map((p, i) => {
                  const lines = p.split("\n");
                  return <p key={i}>{lines.map((line, li) => <span key={li}>{li > 0 && <br />}{line}</span>)}</p>;
                })}
              </div>
              <button className="lp-reader-login" onClick={onLogin}>Sign in to write →</button>
            </article>
          </div>
        ) : (
          <div className="lp-list">
            <h1 className="lp-list-title">Writing</h1>
            <div className="lp-list-items">
              {articles.length === 0 && (
                <p className="lp-list-empty">No essays yet.</p>
              )}
              {articles.map((a) => (
                <button key={a.id} className="lp-list-item" onClick={() => setOpenId(a.id)}>
                  <span className="lp-list-item-title">{a.title}</span>
                  <span className="lp-list-item-meta">
                    <span className="lp-list-item-dot" style={{ background: threadById[a.thread]?.color }} />
                    {threadById[a.thread]?.name} · {a.minutes} min · {a.dateLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
