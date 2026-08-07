import { useState, useEffect } from "react";
import { threadById, timeAgo, needsWater } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

const DAY_MS = 864e5;

function getDueFruits(regions) {
  const now = Date.now();
  const items = [];
  for (const r of regions) {
    for (const p of r.plants || []) {
      for (const f of p.fruits || []) {
        if (!f.deadline || f.done) continue;
        const dl = new Date(f.deadline).getTime();
        const diff = dl - now;
        if (diff < 0) items.push({ id: f.id, title: f.title || "Untitled", bed: r.label, bedId: r.id, type: "overdue" });
        else if (diff < 3 * DAY_MS) items.push({ id: f.id, title: f.title || "Untitled", bed: r.label, bedId: r.id, type: "soon" });
      }
    }
  }
  return items;
}

function BedCard({ region, onSelect, onStartTimer, onWater, hasTimer }) {
  const t = threadById[region.thread];
  const thirsty = needsWater(region.lastTs);
  const plants = region.plants || [];
  const pendingFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => !f.done).length, 0);
  const doneFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => f.done).length, 0);
  const watered = (region.logs || []).filter((l) => l.type === "water").length;
  const spriteSize = 38;
  const count = plants.length > 0 ? Math.min(plants.length, 5) : 1;

  return (
    <button className="g-card" style={{ "--rc": t?.color }} onClick={() => onSelect(region.id)}>
      {thirsty && <span className="g-card-thirst">💧</span>}
      {hasTimer && <span className="g-card-thirst" style={{ right: thirsty ? 32 : 12 }}>☀️</span>}
      <div className="g-card-top">
        <div className="g-card-sprites">
          {Array.from({ length: count }).map((_, i) => (
            <PixelSprite key={i} kind={plants[i]?.crop || "leafy"} color={t?.color || "#8fe39a"} size={spriteSize} />
          ))}
        </div>
      </div>
      <div className="g-card-mid">
        <div className="g-card-name">{region.label}</div>
      </div>
      <div className="g-card-stats">
        <span className="g-stat"><span className="g-stat-icon">☀️</span><span className="g-stat-val">{region.sunshine || 0}</span><span className="g-stat-unit">m</span></span>
        <span className="g-stat"><span className="g-stat-icon">💧</span><span className="g-stat-val">{watered}</span><span className="g-stat-unit">×</span></span>
        <span className="g-stat"><span className="g-stat-icon">🌿</span><span className="g-stat-val">{region.tended}</span><span className="g-stat-unit">×</span></span>
        <span className="g-stat"><span className="g-stat-icon">🌱</span><span className="g-stat-val">{plants.length}</span></span>
        <span className="g-stat g-stat-fruit"><span className="g-stat-icon">🍊</span><span className="g-stat-val">{pendingFruits}</span></span>
        <span className="g-stat g-stat-done"><span className="g-stat-icon">✓</span><span className="g-stat-val">{doneFruits}</span></span>
      </div>
      <div className="g-card-actions">
        <button className="g-card-action g-card-water" title="Water" onClick={(e) => { e.stopPropagation(); onWater(region.id); }}>
          💧
        </button>
        <button className="g-card-action g-card-sun" title="Give sunshine" onClick={(e) => { e.stopPropagation(); onStartTimer(region.id); }}>
          ☀️
        </button>
      </div>
    </button>
  );
}

export default function GardenScene({ regions, articles = [], hover, selected, timerIds = [], onHover, onSelect, onWater, onStartTimer, onSelectArticle }) {
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;
  const totalSun = regions.reduce((n, r) => n + (r.sunshine || 0), 0);
  const totalTended = regions.reduce((n, r) => n + r.tended, 0);
  const totalWatered = regions.reduce((n, r) => n + (r.logs || []).filter((l) => l.type === "water").length, 0);
  const totalPlants = regions.reduce((n, r) => n + (r.plants || []).length, 0);
  const totalFruits = regions.reduce((n, r) => {
    return n + (r.plants || []).reduce((s, p) => s + (p.fruits || []).filter((f) => !f.done).length, 0);
  }, 0);

  const dueFruits = getDueFruits(regions);
  const overdue = dueFruits.filter((f) => f.type === "overdue");
  const dueSoon = dueFruits.filter((f) => f.type === "soon");

  const [clock, setClock] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(id); }, []);
  const H = clock.getHours();
  const M = String(clock.getMinutes()).padStart(2, "0");
  const S = String(clock.getSeconds()).padStart(2, "0");
  const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const FLOWERS = [
    { x: 3, y: 8 }, { x: 15, y: 92 }, { x: 91, y: 6 }, { x: 96, y: 88 },
    { x: 8, y: 50 }, { x: 94, y: 45 }, { x: 50, y: 96 }, { x: 30, y: 94 },
    { x: 70, y: 95 }, { x: 2, y: 70 }, { x: 97, y: 65 },
  ];

  const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 6,
    size: 0.6 + Math.random() * 0.8,
    char: ["✿", "❀", "✾", "❁", "UIT", "✿", "·"][i % 7],
  }));

  return (
    <section className="garden-dash">
      <div className="g-particles">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="g-particle"
            style={{
              left: `${p.x}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: `${p.size}rem`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      <div className="g-clock-row">
        <div className="g-clock">
          <span className="g-clock-time">{String(H).padStart(2, "0")}:{M}:{S}</span>
          <span className="g-clock-date">{WEEKDAY[clock.getDay()]}, {MONTH[clock.getMonth()]} {clock.getDate()}</span>
        </div>
      </div>

      <div className="g-flowers">
        {FLOWERS.map((f, i) => (
          <span key={i} className="g-flower" style={{ left: `${f.x}%`, top: `${f.y}%` }}>✿</span>
        ))}
      </div>

      <div className="g-summary">
        <div className="g-sum-item"><span className="g-sum-num">{regions.length}</span><span className="g-sum-label">beds</span></div>
        <div className="g-sum-item"><span className="g-sum-num">{totalPlants}</span><span className="g-sum-label">plants</span></div>
        <div className="g-sum-item"><span className="g-sum-num">{totalFruits}</span><span className="g-sum-label">fruits pending</span></div>
        <div className="g-sum-item"><span className="g-sum-num">{totalSun}m</span><span className="g-sum-label">sunshine</span></div>
        <div className="g-sum-item"><span className="g-sum-num">{totalWatered}</span><span className="g-sum-label">watered</span></div>
        <div className="g-sum-item"><span className="g-sum-num">{totalTended}</span><span className="g-sum-label">tended</span></div>
        {thirstyCount > 0 && (
          <div className="g-sum-item g-sum-thirst"><span className="g-sum-num">💧 {thirstyCount}</span><span className="g-sum-label">need water</span></div>
        )}
      </div>

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="g-due-alerts">
          {overdue.length > 0 && (
            <div className="g-due-alert g-due-overdue">
              <span className="g-due-icon">⚠</span>
              <span className="g-due-text">
                {overdue.length} overdue: {overdue.map((f) => `${f.title} · ${f.bed}`).join(", ")}
              </span>
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="g-due-alert g-due-soon">
              <span className="g-due-icon">⏰</span>
              <span className="g-due-text">
                {dueSoon.length} due soon: {dueSoon.map((f) => `${f.title} · ${f.bed}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="g-grid">
        {regions.map((r) => (
          <BedCard key={r.id} region={r} onSelect={onSelect} onStartTimer={onStartTimer} onWater={onWater} hasTimer={timerIds.includes(r.id)} />
        ))}
      </div>

      {articles.length > 0 && (
        <div className="g-entries-section">
          <div className="g-entries-head">
            <h2 className="g-entries-title">Recent Entries</h2>
            <button className="g-entries-viewall" onClick={() => onSelectArticle(null)}>View all →</button>
          </div>
          <div className="g-entries-grid">
            {articles.slice(0, 4).map((a) => {
              const t = threadById[a.thread];
              return (
                <button key={a.id} className="g-entry-card" onClick={() => onSelectArticle(a)}>
                  <div className="g-entry-accent" style={{ background: t?.color }} />
                  <div className="g-entry-body">
                    <span className="g-entry-kind">{a.kind}</span>
                    <h3 className="g-entry-title">{a.title}</h3>
                    <p className="g-entry-excerpt">{a.excerpt}</p>
                    <div className="g-entry-foot">
                      <span className="g-entry-dot" style={{ background: t?.color }} />
                      <span>{t?.name}</span>
                      <span className="g-entry-sep">·</span>
                      <span>{a.minutes} min</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
