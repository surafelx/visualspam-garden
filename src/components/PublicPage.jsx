import { Fragment, useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { threadById, timeAgo } from "../data.js";
import * as api from "../api.js";
import { renderText } from "../lib/markdown.jsx";

const REACTIONS = ["❤️", "👍", "🌱", "✨", "🔥"];
const REACTED_KEY = "vsg_reacted";
const LOOSE = "__loose";
const KINDS = [
  { label: "essays", value: "Essay" },
  { label: "notes", value: "Note" },
  { label: "logs", value: "Log" },
];

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

function readReacted() {
  try { return JSON.parse(localStorage.getItem(REACTED_KEY) || "{}"); } catch { return {}; }
}

function embedUrl(url) {
  const yt = url.match(/(?:v=|youtu\.be\/)([^&?]+)/);
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return yt ? `https://www.youtube.com/embed/${yt[1]}` : null;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/* ── reading progress rail ── */
function ReadingProgress({ targetRef }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = targetRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      const total = box.height - window.innerHeight;
      const done = -box.top;
      setPct(total <= 0 ? 0 : Math.min(100, Math.max(0, (done / total) * 100)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetRef]);

  return <div className="lp-progress" style={{ transform: `scaleX(${pct / 100})` }} />;
}

/* ── background music ── */
function BgMusic({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [src]);

  const toggle = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop onEnded={() => setPlaying(false)} />
      <button
        className={`lp-bgmusic-btn ${playing ? "playing" : ""}`}
        onClick={toggle}
        aria-pressed={playing}
      >
        <span className="lp-bgmusic-wave" aria-hidden="true">
          <i /><i /><i />
        </span>
        {playing ? "pause score" : "play score"}
      </button>
    </>
  );
}

function EssayReader({ open, onBack }) {
  const articleRef = useRef(null);
  const [reactions, setReactions] = useState(open.reactions || {});
  const [reacted, setReacted] = useState(() => readReacted()[open.id] || {});
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    setReactions(open.reactions || {});
    setReacted(readReacted()[open.id] || {});
    api.fetchComments(open.id).then(setComments).catch(() => setComments([]));
  }, [open.id]);

  const handleReact = async (emoji) => {
    if (reacted[emoji]) return;
    setReactions((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    const next = { ...reacted, [emoji]: true };
    setReacted(next);
    try {
      localStorage.setItem(REACTED_KEY, JSON.stringify({ ...readReacted(), [open.id]: next }));
    } catch {}
    try {
      const saved = await api.addReaction(open.id, emoji);
      if (saved?.reactions) setReactions(saved.reactions);
    } catch {
      // Keep the optimistic count; a refresh will show the truth.
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || posting) return;
    setPosting(true);
    setCommentError("");
    try {
      const newComment = await api.createComment({
        essayId: open.id,
        author: commentName.trim() || "Anonymous",
        content: commentText.trim(),
      });
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch {
      setCommentError("Could not post that. Try again in a moment.");
    } finally {
      setPosting(false);
    }
  };

  const handleContact = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactError("");
    try {
      await api.createMessage({
        name: contactName.trim(),
        email: contactEmail.trim(),
        content: contactMessage.trim(),
      });
      setContactSent(true);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch {
      setContactError("Could not send that. Try again in a moment.");
    }
  };

  const t = threadById[open.thread];
  const blocks = getBlocks(open);
  const firstTextIndex = blocks.findIndex((b) => !b.type || b.type === "text");

  return (
    <div className="lp-reader" style={t?.color ? { "--accent": t.color } : undefined}>
      <ReadingProgress targetRef={articleRef} />

      <div className="lp-reader-top">
        <button className="lp-back" onClick={onBack}>
          <span aria-hidden="true">←</span> back
        </button>
        {open.bgMusic && <BgMusic src={open.bgMusic} />}
      </div>

      <article className="lp-reader-article" ref={articleRef}>
        <header className="lp-reader-head">
          <div className="lp-reader-meta">
            <span className="lp-entry-kind">{open.kind}</span>
            <span className="lp-sep" aria-hidden="true">/</span>
            <span>{open.minutes} min</span>
            {open.dateLabel && (
              <>
                <span className="lp-sep" aria-hidden="true">/</span>
                <span>{open.dateLabel}</span>
              </>
            )}
            {t && <span className="lp-entry-thread">{t.name}</span>}
          </div>
          <h1 className="lp-reader-title">{open.title}</h1>
          {open.excerpt && <p className="lp-reader-standfirst">{open.excerpt}</p>}
        </header>

        <div className="lp-reader-body">
          {blocks.map((block, i) => {
            if (!block.type || block.type === "text") {
              return (
                <p key={i} className={i === firstTextIndex ? "lp-lede" : undefined}>
                  {renderText(block.content, `b${i}`)}
                </p>
              );
            }
            if (block.type === "h2") return <h2 key={i}>{block.content}</h2>;
            if (block.type === "h3") return <h3 key={i}>{block.content}</h3>;
            if (block.type === "image") return (
              <figure key={i} className="lp-figure">
                <img src={block.url} alt={block.caption || ""} loading="lazy" />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
            if (block.type === "audio") return (
              <figure key={i} className="lp-figure lp-figure-media">
                <audio src={block.url} controls />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
            if (block.type === "video") {
              const embed = embedUrl(block.url || "");
              return (
                <figure key={i} className="lp-figure">
                  {embed
                    ? <iframe src={embed} title={block.caption || "video"} allowFullScreen />
                    : <video src={block.url} controls />}
                  {block.caption && <figcaption>{block.caption}</figcaption>}
                </figure>
              );
            }
            return null;
          })}
        </div>

        <div className="lp-endmark" aria-hidden="true">✦</div>
      </article>

      <section className="lp-panel">
        <h3 className="lp-panel-title">Leave a mark</h3>
        <div className="lp-reactions">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={`lp-reaction ${reacted[emoji] ? "on" : ""}`}
              onClick={() => handleReact(emoji)}
              aria-label={`React with ${emoji}`}
            >
              <span className="lp-reaction-emoji">{emoji}</span>
              {reactions[emoji] > 0 && <span className="lp-reaction-count">{reactions[emoji]}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="lp-panel">
        <h3 className="lp-panel-title">
          Comments <span className="lp-count">{comments.length}</span>
        </h3>
        <form className="lp-form" onSubmit={handleComment}>
          <input
            type="text"
            className="lp-input"
            placeholder="Your name (optional)"
            value={commentName}
            onChange={(e) => setCommentName(e.target.value)}
            maxLength={60}
          />
          <textarea
            className="lp-input lp-textarea"
            placeholder="Say something kind, or something true…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            maxLength={4000}
          />
          <div className="lp-form-foot">
            <button type="submit" className="lp-btn" disabled={posting || !commentText.trim()}>
              {posting ? "Posting…" : "Post comment"}
            </button>
            {commentError && <span className="lp-error">{commentError}</span>}
          </div>
        </form>

        {comments.length > 0 && (
          <ul className="lp-comment-list">
            {comments.map((c) => (
              <li key={c._id} className="lp-comment">
                <span className="lp-avatar" aria-hidden="true">
                  {(c.author || "A").trim().charAt(0).toUpperCase()}
                </span>
                <div className="lp-comment-body">
                  <div className="lp-comment-head">
                    <span className="lp-comment-author">{c.author}</span>
                    <span className="lp-comment-time">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="lp-comment-content">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lp-panel lp-contact-panel">
        {contactSent ? (
          <div className="lp-sent">
            <p className="lp-sent-title">Message sent.</p>
            <p className="lp-sent-sub">Thank you for reaching out — it goes straight to me, and nowhere else.</p>
            <button className="lp-link-btn" onClick={() => setContactSent(false)}>Send another</button>
          </div>
        ) : (
          <>
            <button
              className="lp-link-btn"
              onClick={() => setShowContact(!showContact)}
              aria-expanded={showContact}
            >
              {showContact ? "never mind" : "write to me privately →"}
            </button>
            {showContact && (
              <form className="lp-form lp-form-inset" onSubmit={handleContact}>
                <div className="lp-form-row">
                  <input
                    type="text"
                    className="lp-input"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                  <input
                    type="email"
                    className="lp-input"
                    placeholder="Email (optional)"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <textarea
                  className="lp-input lp-textarea"
                  placeholder="Your message…"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                />
                <div className="lp-form-foot">
                  <button type="submit" className="lp-btn" disabled={!contactMessage.trim()}>Send</button>
                  <span className="lp-note">Private — never shown on this page.</span>
                </div>
                {contactError && <span className="lp-error">{contactError}</span>}
              </form>
            )}
          </>
        )}
      </section>

      <div className="lp-reader-end">
        <GardenStrip className="lp-end-garden" />
      </div>
    </div>
  );
}

/* ── backdrop: pixel plants growing along the bottom of the viewport ──
   Side-view sprites in the same idiom as pixels.jsx: one character per pixel,
   drawn as crisp 1x1 rects. s stem · g leaf · G leaf shadow · c petal ·
   f petal light · o flower core · r berry                                   */
const SPRITES = {
  flower: [
    "...ccc...",
    "..cfffc..",
    "..cfofc..",
    "..cfffc..",
    "...ccc...",
    "....s....",
    "....s....",
    ".gg.s....",
    "gGg.s....",
    ".gg.s....",
    "....s....",
    "....s.gg.",
    "....s.gGg",
    "....s.gg.",
    "....s....",
    "....s....",
    "....s....",
    "....s....",
  ],
  fern: [
    "....s....",
    "...gsg...",
    "..ggsgg..",
    "...gsg...",
    "....s....",
    "..ggsgg..",
    ".gGgsgGg.",
    "..ggsgg..",
    "....s....",
    ".gggsggg.",
    "gGggsggGg",
    ".gggsggg.",
    "....s....",
    "..ggsgg..",
    "....s....",
    "....s....",
  ],
  sprout: [
    "..s..",
    ".gsg.",
    "gGsGg",
    ".gsg.",
    "..s..",
    "..s..",
    "..s..",
  ],
  bush: [
    "...ggggg...",
    "..ggrgggg..",
    ".ggggggggg.",
    "ggrgggggrgg",
    "gGgggggggGg",
    ".ggrgggrgg.",
    "..ggggggg..",
    "...ggggg...",
    "....sss....",
    "....sss....",
  ],
};

// x is in sprite-pixels along the strip; sway is seconds per cycle.
const GARDEN = [
  { kind: "fern", x: 2, sway: 11, delay: 0 },
  { kind: "flower", x: 14, sway: 14, delay: -3 },
  { kind: "sprout", x: 26, sway: 9, delay: -6 },
  { kind: "bush", x: 33, sway: 17, delay: -2 },
  { kind: "flower", x: 47, sway: 12, delay: -8 },
  { kind: "fern", x: 59, sway: 15, delay: -4 },
  { kind: "sprout", x: 71, sway: 10, delay: -1 },
  { kind: "bush", x: 79, sway: 16, delay: -9 },
  { kind: "fern", x: 95, sway: 13, delay: -5 },
  { kind: "flower", x: 107, sway: 15, delay: -11 },
  { kind: "sprout", x: 119, sway: 9.5, delay: -7 },
  { kind: "bush", x: 126, sway: 18, delay: -3.5 },
];

const PIXEL_CLASS = {
  s: "lp-px-stem",
  g: "lp-px-leaf",
  G: "lp-px-leaf-dark",
  c: "lp-px-petal",
  f: "lp-px-petal-lite",
  o: "lp-px-core",
  r: "lp-px-berry",
};

const STRIP_W = 140;
const STRIP_H = 20;

function PixelPlant({ kind, x, sway, delay }) {
  const rows = SPRITES[kind];
  const top = STRIP_H - rows.length;
  let cell = 0;

  // Placement lives on the outer group: a CSS animation on `transform` would
  // otherwise override the transform attribute and stack every plant at x=0.
  return (
    <g transform={`translate(${x} ${top})`}>
      <g
        className="lp-px-plant"
        style={{ animationDuration: `${sway}s`, animationDelay: `${delay}s` }}
      >
      {rows.map((row, y) =>
        [...row].map((ch, px) => {
          const cls = PIXEL_CLASS[ch];
          if (!cls) return null;
          // every few pixels gets a slow shimmer so the plant never sits still
          const shimmer = (ch === "g" || ch === "c") && cell++ % 7 === 0;
          return (
            <rect
              key={`${px}-${y}`}
              className={shimmer ? `${cls} lp-px-shimmer` : cls}
              x={px}
              y={y}
              width="1"
              height="1"
              style={shimmer ? { animationDelay: `${(px + y) * 0.4}s` } : undefined}
            />
          );
        })
      )}
      </g>
    </g>
  );
}

function GardenStrip({ className = "" }) {
  return (
    <svg
      className={`lp-bg-garden ${className}`}
      viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
      preserveAspectRatio="xMidYMax meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {GARDEN.map((p, i) => <PixelPlant key={i} {...p} />)}
    </svg>
  );
}

function GardenBackdrop() {
  return (
    <div className="lp-bg" aria-hidden="true">
      <div className="lp-bg-spores" />
      <GardenStrip />
    </div>
  );
}

function EntryCard({ article }) {
  const t = threadById[article.thread];
  return (
    <li className="lp-entry" style={t?.color ? { "--accent": t.color } : undefined}>
      <Link to={`/essay/${slugify(article.title)}`} className="lp-entry-link">
        {article.title}
      </Link>
      {article.excerpt && <p className="lp-entry-excerpt">{article.excerpt}</p>}
      <div className="lp-entry-meta">
        <span className="lp-entry-kind">{article.kind}</span>
        <span className="lp-sep" aria-hidden="true">/</span>
        <span>{article.minutes} min</span>
        {article.dateLabel && (
          <>
            <span className="lp-sep" aria-hidden="true">/</span>
            <span>{article.dateLabel}</span>
          </>
        )}
        {t && <span className="lp-entry-thread">{t.name}</span>}
      </div>
    </li>
  );
}

export default function PublicPage({ regions = [], articles = [], darkMode, setDarkMode }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);
  const [kind, setKind] = useState(null);
  const [bed, setBed] = useState(null);

  const open = slug ? articles.find((a) => slugify(a.title) === slug) : null;

  // The admin shell locks body scrolling for its fullscreen canvas; the public
  // page reads better on the real document scroller. Undo it on unmount.
  useEffect(() => {
    document.documentElement.classList.add("lp-scroll");
    document.body.classList.add("lp-scroll");
    return () => {
      document.documentElement.classList.remove("lp-scroll");
      document.body.classList.remove("lp-scroll");
    };
  }, []);

  // Reading a piece, then coming back, should not leave you mid-page.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug, showAbout]);

  useEffect(() => {
    document.title = open ? `${open.title} · Garden` : "Garden · VisualSpam";
  }, [open]);

  const kindCounts = useMemo(() => {
    const counts = {};
    articles.forEach((a) => { counts[a.kind] = (counts[a.kind] || 0) + 1; });
    return counts;
  }, [articles]);

  // Everything matching the kind filter, before the bed filter — the bed row is
  // built from this, so choosing a bed never empties the row you chose it from.
  const ofKind = useMemo(
    () => (kind ? articles.filter((a) => a.kind === kind) : articles),
    [articles, kind]
  );

  const bedFilters = useMemo(() => {
    const counts = {};
    let loose = 0;
    ofKind.forEach((a) => {
      if (a.regionId) counts[a.regionId] = (counts[a.regionId] || 0) + 1;
      else loose += 1;
    });
    const list = regions
      .filter((r) => counts[r.id])
      .map((r) => ({ id: r.id, label: r.label, color: threadById[r.thread]?.color, n: counts[r.id] }));
    if (loose) list.push({ id: LOOSE, label: "elsewhere", color: undefined, n: loose });
    return list;
  }, [regions, ofKind]);

  // A bed that disappears under a new kind filter shouldn't stay selected.
  useEffect(() => {
    if (bed && !bedFilters.some((b) => b.id === bed)) setBed(null);
  }, [bed, bedFilters]);

  const shown = useMemo(() => {
    if (!bed) return ofKind;
    if (bed === LOOSE) return ofKind.filter((a) => !a.regionId);
    return ofKind.filter((a) => a.regionId === bed);
  }, [ofKind, bed]);

  const isHome = !open && !showAbout;

  return (
    // The garden belongs behind the index, not behind body copy — long-form
    // reading gets a clean surface.
    <div className={isHome ? "lp" : "lp lp-reading"}>
      <GardenBackdrop />

      <header className="lp-header">
        <div className="lp-header-inner">
          <Link to="/" className="lp-brand" onClick={() => setShowAbout(false)}>
            <span className="lp-brand-icon" aria-hidden="true">🌱</span>
            {/* the hero already says Garden — only name it once we've left home */}
            {!isHome && <span className="lp-brand-name">Garden</span>}
          </Link>
          <nav className="lp-nav">
            <button
              className="lp-nav-link lp-nav-mark"
              onClick={() => setShowAbout(!showAbout)}
              aria-label={showAbout ? "Back to the garden" : "About"}
              title={showAbout ? "Back to the garden" : "About"}
            >
              {showAbout ? "×" : "?"}
            </button>
            <button
              className="lp-theme"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? "☀" : "☾"}
            </button>
          </nav>
        </div>
      </header>

      <main className="lp-main">
        {open ? (
          <EssayReader open={open} onBack={() => navigate("/")} />
        ) : showAbout ? (
          <div className="lp-about">
            <button className="lp-back" onClick={() => setShowAbout(false)}>
              <span aria-hidden="true">←</span> back to the garden
            </button>
            <h1 className="lp-about-title">About</h1>
            <div className="lp-about-body">
              <p className="lp-lede">
                This month has been about sitting with uncomfortable questions and letting them breathe.
                Who am I when I stop performing? What does it mean to tend something — a garden, a relationship,
                a self — without the guarantee it will survive?
              </p>
              <p>
                I kept coming back to the idea that we build metaphors to carry weight we cannot hold alone.
                A garden is not just a garden. It is every project I started with fire and abandoned with neglect.
                It is every person I loved in bursts and then forgot to water. The conclusion I keep arriving at
                is not a neat one: consistency is not romance, but it is the only thing that keeps things alive.
              </p>
              <p>
                I write to make sense of things. Mostly I write about the gap between who I am
                and who I pretend to be — and the slow, unglamorous work of closing it.
              </p>
              <p>
                This garden is where I tend my thoughts the way I should tend everything else in my life:
                with patience, with consistency, with the understanding that not everything planted will bloom,
                and that is part of it.
              </p>
              <p>
                I am from Addis Ababa. I think about love, identity, technology, and the small daily rituals
                that hold a life together. I write essays, notes, and logs. Sometimes they are finished.
                Most times they are not. That is also part of it.
              </p>
            </div>
          </div>
        ) : (
          <div className="lp-list">
            <section className="lp-hero">
              {/* the page leads with the index; the name stays for screen readers */}
              <h1 className="lp-sr-only">Garden</h1>
              <p className="lp-hero-kicker">
                <span className="lp-kinds">
                  {KINDS.map(({ label, value }, i) => (
                    <Fragment key={value}>
                      {i > 0 && <span aria-hidden="true">{i === KINDS.length - 1 ? " & " : ", "}</span>}
                      <button
                        type="button"
                        className={`lp-kind ${kind === value ? "on" : ""}`}
                        onClick={() => setKind(kind === value ? null : value)}
                        disabled={!kindCounts[value]}
                        aria-pressed={kind === value}
                        title={`${kindCounts[value] || 0} ${label}`}
                      >
                        {label}
                      </button>
                    </Fragment>
                  ))}
                </span>
                <span className="lp-sep" aria-hidden="true">/</span>
                <span>{kind ? `${shown.length} of ${articles.length}` : articles.length} planted</span>
                <span className="lp-sep" aria-hidden="true">/</span>
                <span>addis ababa</span>
              </p>

              {bedFilters.length > 0 && (
                <p className="lp-hero-kicker lp-beds-row">
                  {bedFilters.map((b, i) => (
                    <Fragment key={b.id}>
                      {i > 0 && <span className="lp-sep" aria-hidden="true">/</span>}
                      <button
                        type="button"
                        className={`lp-kind lp-bed-filter ${bed === b.id ? "on" : ""}`}
                        onClick={() => setBed(bed === b.id ? null : b.id)}
                        aria-pressed={bed === b.id}
                        title={`${b.n} piece${b.n === 1 ? "" : "s"}`}
                      >
                        {b.color && <span className="lp-dot" style={{ background: b.color }} />}
                        {b.label}
                      </button>
                    </Fragment>
                  ))}
                </p>
              )}
            </section>

            {shown.length === 0 ? (
              <p className="lp-empty">
                {kind || bed
                  ? "Nothing here yet."
                  : "Nothing planted yet. Come back when something has broken ground."}
              </p>
            ) : (
              <ul className="lp-entries">
                {shown.map((a) => <EntryCard key={a.id} article={a} />)}
              </ul>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
