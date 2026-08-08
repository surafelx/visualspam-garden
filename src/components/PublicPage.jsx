import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { threadById } from "../data.js";

function getBlocks(article) {
  if (article.blocks && article.blocks.length > 0) return article.blocks;
  if (article.body) {
    return article.body.split("\n\n").filter(Boolean).map((p) => ({ type: "text", content: p }));
  }
  return [];
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function PublicPage({ onLogin, regions = [], articles = [] }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const open = slug ? articles.find((a) => slugify(a.title) === slug) : null;
  const bgAudioRef = useRef(null);
  const [bgPlaying, setBgPlaying] = useState(false);

  useEffect(() => {
    if (open?.bgMusic && bgAudioRef.current) {
      bgAudioRef.current.volume = 0.3;
    }
  }, [open?.bgMusic]);

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="lp">
      <div className="lp-border lp-border-left" />
      <div className="lp-border lp-border-right" />

      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <Link to="/" className="lp-brand-icon" title="garden">🌱</Link>
            <Link to="/" className="lp-brand-name">VisualSpam Garden</Link>
          </div>
        </div>
      </header>

      <main className="lp-main">
        {open ? (
          <div className="lp-reader">
            <div className="lp-reader-bar">
              <button className="lp-reader-back" onClick={handleBack}>← back</button>
              <div className="lp-reader-bar-actions">
                {open.bgMusic && (
                  <button
                    className={`lp-bgmusic-btn ${bgPlaying ? "playing" : ""}`}
                    onClick={() => {
                      if (bgAudioRef.current) {
                        if (bgPlaying) bgAudioRef.current.pause();
                        else bgAudioRef.current.play();
                        setBgPlaying(!bgPlaying);
                      }
                    }}
                  >
                    {bgPlaying ? "⏸ Music" : "▶ Music"}
                  </button>
                )}
              </div>
            </div>
            {open.bgMusic && (
              <audio ref={bgAudioRef} src={open.bgMusic} loop onEnded={() => setBgPlaying(false)} />
            )}
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
                {getBlocks(open).map((block, i) => {
                  if (block.type === "text") {
                    const lines = (block.content || "").split("\n");
                    return <p key={i}>{lines.map((line, li) => <span key={li}>{li > 0 && <br />}{line}</span>)}</p>;
                  }
                  if (block.type === "h2") return <h2 key={i}>{block.content}</h2>;
                  if (block.type === "h3") return <h3 key={i}>{block.content}</h3>;
                  if (block.type === "image") return (
                    <figure key={i} className="lp-reader-figure">
                      <img src={block.url} alt={block.caption || ""} />
                      {block.caption && <figcaption>{block.caption}</figcaption>}
                    </figure>
                  );
                  if (block.type === "audio") return (
                    <figure key={i} className="lp-reader-figure">
                      <audio src={block.url} controls />
                      {block.caption && <figcaption>{block.caption}</figcaption>}
                    </figure>
                  );
                  if (block.type === "video") return (
                    <figure key={i} className="lp-reader-figure">
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
        ) : (
          <div className="lp-list">
            <h1 className="lp-list-title">Writing</h1>
            <div className="lp-list-items">
              {articles.length === 0 && (
                <p className="lp-list-empty">No essays yet.</p>
              )}
              {articles.map((a) => {
                const t = threadById[a.thread];
                return (
                  <Link key={a.id} to={`/essay/${slugify(a.title)}`} className="lp-list-item">
                    <span className="lp-list-item-title">{a.title}</span>
                    <span className="lp-list-item-meta">
                      <span className="lp-list-item-dot" style={{ background: t?.color }} />
                      {t?.name} · {a.kind} · {a.minutes} min · {a.dateLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
