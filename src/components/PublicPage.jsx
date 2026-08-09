import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { threadById } from "../data.js";
import * as api from "../api.js";

const REACTIONS = ["❤️", "👍", "🌱", "✨", "🔥"];

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

function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 7) return `${Math.floor(d)} days ago`;
  if (d < 14) return "1 week ago";
  const m = Math.floor(d / 30);
  return `${m} month${m > 1 ? "s" : ""} ago`;
}

function EssayReader({ open, onBack }) {
  const bgAudioRef = useRef(null);
  const [bgPlaying, setBgPlaying] = useState(false);
  const [reactions, setReactions] = useState(open.reactions || {});
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    if (open?.bgMusic && bgAudioRef.current) {
      bgAudioRef.current.volume = 0.3;
    }
  }, [open?.bgMusic]);

  useEffect(() => {
    api.fetchComments(open.id).then(setComments).catch(() => {});
  }, [open.id]);

  const handleReact = async (emoji) => {
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    try { await api.addReaction(open.id, emoji); } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComment = await api.createComment({
      essayId: open.id,
      author: commentName.trim() || "Anonymous",
      content: commentText.trim(),
    });
    setComments((prev) => [newComment, ...prev]);
    setCommentText("");
  };

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    await api.createMessage({
      name: contactName.trim(),
      email: contactEmail.trim(),
      content: contactMessage.trim(),
    });
    setContactSent(true);
    setContactName("");
    setContactEmail("");
    setContactMessage("");
  };

  return (
    <div className="lp-reader">
      <div className="lp-reader-bar">
        <button className="lp-reader-back" onClick={onBack}>← back</button>
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
          {open.dateLabel && (
            <>
              <span className="lp-sep">·</span>
              <span>{open.dateLabel}</span>
            </>
          )}
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

      <div className="lp-reactions">
        {REACTIONS.map((emoji) => (
          <button key={emoji} className="lp-reaction-btn" onClick={() => handleReact(emoji)}>
            <span className="lp-reaction-emoji">{emoji}</span>
            {reactions[emoji] > 0 && <span className="lp-reaction-count">{reactions[emoji]}</span>}
          </button>
        ))}
      </div>

      <div className="lp-comments">
        <h3 className="lp-section-title">Comments ({comments.length})</h3>
        <form className="lp-comment-form" onSubmit={handleComment}>
          <input
            type="text"
            className="lp-comment-input"
            placeholder="Your name (optional)"
            value={commentName}
            onChange={(e) => setCommentName(e.target.value)}
          />
          <textarea
            className="lp-comment-textarea"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
          />
          <button type="submit" className="lp-comment-submit">Post Comment</button>
        </form>
        <div className="lp-comment-list">
          {comments.map((c) => (
            <div key={c._id} className="lp-comment">
              <div className="lp-comment-header">
                <span className="lp-comment-author">{c.author}</span>
                <span className="lp-comment-time">{timeAgo(c.createdAt)}</span>
              </div>
              <p className="lp-comment-content">{c.content}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-contact">
        <button className="lp-contact-toggle" onClick={() => setShowContact(!showContact)}>
          {showContact ? "Hide message form" : "Send a message"}
        </button>
        {showContact && (
          contactSent ? (
            <div className="lp-contact-sent">
              <p>Message sent! Thank you for reaching out.</p>
              <button onClick={() => setContactSent(false)}>Send another</button>
            </div>
          ) : (
            <form className="lp-contact-form" onSubmit={handleContact}>
              <input
                type="text"
                className="lp-contact-input"
                placeholder="Your name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
              <input
                type="email"
                className="lp-contact-input"
                placeholder="Email (optional)"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <textarea
                className="lp-contact-textarea"
                placeholder="Your message..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={4}
              />
              <button type="submit" className="lp-comment-submit">Send Message</button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default function PublicPage({ onLogin, regions = [], articles = [] }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const open = slug ? articles.find((a) => slugify(a.title) === slug) : null;

  const handleBack = () => {
    navigate("/");
  };

  // Group articles by region/bed
  const articlesByBed = {};
  const unassigned = [];
  
  articles.forEach((a) => {
    if (a.regionId) {
      if (!articlesByBed[a.regionId]) articlesByBed[a.regionId] = [];
      articlesByBed[a.regionId].push(a);
    } else {
      unassigned.push(a);
    }
  });

  const beds = regions.filter((r) => articlesByBed[r.id]?.length > 0);

  return (
    <div className="lp">
      <div className="lp-border lp-border-left" />
      <div className="lp-border lp-border-right" />

      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-icon">🌱</span>
            <span className="lp-brand-name">Garden</span>
          </Link>
          <Link to="/login" className="lp-login-link">Admin</Link>
        </div>
      </header>

      <main className="lp-main">
        {open ? (
          <EssayReader open={open} onBack={handleBack} />
        ) : (
          <>
            <div className="lp-hero">
              <div className="lp-hero-icon">🌱</div>
              <h1 className="lp-hero-title">Garden</h1>
              <p className="lp-hero-sub">A living collection of thoughts, notes, and logs</p>
            </div>

            <div className="lp-list">
              <div className="lp-list-items">
                {articles.length === 0 && (
                  <p className="lp-list-empty">No essays yet.</p>
                )}
                
                {beds.map((bed) => {
                  const t = threadById[bed.thread];
                  return (
                    <div key={bed.id} className="lp-bed-group">
                      <div className="lp-bed-header">
                        <span className="lp-bed-icon">{t?.icon || "🌱"}</span>
                        <div className="lp-bed-info">
                          <h2 className="lp-bed-title">{bed.label}</h2>
                          <span className="lp-bed-count">{articlesByBed[bed.id].length} piece{articlesByBed[bed.id].length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="lp-bed-articles">
                        {articlesByBed[bed.id].map((a) => {
                          const at = threadById[a.thread];
                          return (
                            <Link key={a.id} to={`/essay/${slugify(a.title)}`} className="lp-card">
                              <div className="lp-card-top">
                                <span className="lp-card-dot" style={{ background: at?.color }} />
                                <span className="lp-card-kind">{a.kind}</span>
                              </div>
                              <h3 className="lp-card-title">{a.title}</h3>
                              <div className="lp-card-bottom">
                                <span className="lp-card-mins">{a.minutes} min</span>
                                {a.dateLabel && <span className="lp-card-date">{a.dateLabel}</span>}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {unassigned.length > 0 && (
                  <div className="lp-bed-group">
                    <div className="lp-bed-header">
                      <span className="lp-bed-icon">📝</span>
                      <div className="lp-bed-info">
                        <h2 className="lp-bed-title">More</h2>
                        <span className="lp-bed-count">{unassigned.length} piece{unassigned.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="lp-bed-articles">
                      {unassigned.map((a) => {
                        const at = threadById[a.thread];
                        return (
                          <Link key={a.id} to={`/essay/${slugify(a.title)}`} className="lp-card">
                            <div className="lp-card-top">
                              <span className="lp-card-dot" style={{ background: at?.color }} />
                              <span className="lp-card-kind">{a.kind}</span>
                            </div>
                            <h3 className="lp-card-title">{a.title}</h3>
                            <div className="lp-card-bottom">
                              <span className="lp-card-mins">{a.minutes} min</span>
                              {a.dateLabel && <span className="lp-card-date">{a.dateLabel}</span>}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
