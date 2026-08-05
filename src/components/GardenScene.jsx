import { useState, useEffect } from "react";
import { threadById, timeAgo, needsWater } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

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

export default function GardenScene({ regions, hover, selected, timerIds = [], onHover, onSelect, onWater, onStartTimer, onAnalyze, aiInsight, onRefreshAI, hasApiKey }) {
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;
  const totalSun = regions.reduce((n, r) => n + (r.sunshine || 0), 0);
  const totalTended = regions.reduce((n, r) => n + r.tended, 0);
  const totalWatered = regions.reduce((n, r) => n + (r.logs || []).filter((l) => l.type === "water").length, 0);
  const totalPlants = regions.reduce((n, r) => n + (r.plants || []).length, 0);
  const totalFruits = regions.reduce((n, r) => {
    return n + (r.plants || []).reduce((s, p) => s + (p.fruits || []).filter((f) => !f.done).length, 0);
  }, 0);

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

  return (
    <section className="garden-dash">
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

      <div className="g-ai-row">
        <span className="g-ai-icon">✦</span>
        {aiInsight ? (
          <>
            <span className="g-ai-text">{aiInsight}</span>
            <button className="g-ai-refresh" onClick={onRefreshAI} title="Refresh insight">↻</button>
          </>
        ) : hasApiKey ? (
          <span className="g-ai-text g-ai-loading">Analyzing garden…</span>
        ) : (
          <span className="g-ai-text">AI insights — set your OpenRouter API key in ⚙ Settings to activate</span>
        )}
      </div>

      <div className="g-grid">
        {regions.map((r) => (
          <BedCard key={r.id} region={r} onSelect={onSelect} onStartTimer={onStartTimer} onWater={onWater} hasTimer={timerIds.includes(r.id)} />
        ))}
      </div>
    </section>
  );
}
