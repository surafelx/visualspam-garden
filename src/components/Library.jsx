import { useState } from "react";
import { articles, threadById } from "../data.js";

export default function Library() {
  const [openId, setOpenId] = useState(null);
  const open = articles.find((a) => a.id === openId);

  if (open) {
    const t = threadById[open.thread];
    return (
      <div className="library reading">
        <button className="read-back" onClick={() => setOpenId(null)}>← back to shelf</button>
        <article className="reader" style={{ "--rc": t?.color }}>
          <div className="reader-kicker">
            <span className="thread-dot" style={{ background: t?.color }} />
            {t?.name} · {open.kind} · {open.minutes} min · {open.dateLabel}
          </div>
          <h1 className="reader-title">{open.title}</h1>
          {open.body.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </article>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="library-head">
        <h1>Library</h1>
        <p>Everything you're reading and writing. It grows as you do.</p>
      </header>
      <div className="shelf">
        {articles.map((a) => {
          const t = threadById[a.thread];
          return (
            <button key={a.id} className="book" style={{ "--rc": t?.color }} onClick={() => setOpenId(a.id)}>
              <div className="book-body">
                <div className="book-kind">{a.kind}</div>
                <div className="book-title">{a.title}</div>
                <div className="book-excerpt">{a.excerpt}</div>
                <div className="book-foot">
                  <span className="thread-dot" style={{ background: t?.color }} />
                  {t?.name} · {a.minutes} min
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
