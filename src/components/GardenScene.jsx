import { useState } from "react";
import { threadById, STAGES, STAGE_ORDER, GROWTH_PER_STAGE, timeAgo, needsWater } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

// which full crop a thread grows to when flourishing
const CROP = {
  technology: "leafy", philosophy: "cabbage", business: "carrot",
  health: "tomato", nature: "pond", relationships: "flower", ideas: "flower",
};
function cropSprite(r) {
  if (r.id === "rest") return "pond";
  if (r.stage === "seed") return "seed";
  if (r.stage === "sprout") return "sprout";
  if (r.stage === "growing") return "leafy";
  return CROP[r.thread] || "leafy";
}

// tidy plot layout: beds + a few decorations, like a real garden
const LAYOUT = [
  { deco: "tree", size: 72 }, { deco: "well", size: 48 }, { region: "studio" }, { region: "health" },
  { region: "relationships" }, { region: "business" }, { region: "philosophy" }, { deco: "sign", size: 30 },
  { region: "ideas" }, { region: "rest" }, { empty: true }, { deco: "can", size: 30 },
];

// grass decorations scattered around the plot
const GRASS = [
  { x: 6, y: 14, k: "daisy" }, { x: 14, y: 40, k: "tuft" }, { x: 8, y: 70, k: "daisy" },
  { x: 90, y: 20, k: "tuft" }, { x: 94, y: 52, k: "daisy" }, { x: 88, y: 82, k: "tuft" },
  { x: 30, y: 8, k: "daisy" }, { x: 66, y: 6, k: "tuft" }, { x: 50, y: 94, k: "daisy" },
  { x: 20, y: 90, k: "tuft" }, { x: 78, y: 92, k: "daisy" },
];

function StagePips({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return <span className="pips">{STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</span>;
}

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸" };

function Detail({ region, onClose, onWater, onNote }) {
  const [text, setText] = useState("");
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const thirsty = needsWater(region.lastTs);
  const submitNote = () => { const v = text.trim(); if (!v) return; onNote(region.id, v); setText(""); };

  return (
    <div className="detail" onClick={(e) => e.stopPropagation()} style={{ "--rc": t?.color }}>
      <button className="detail-close" onClick={onClose}>✕</button>
      <div className="detail-head">
        <span className="detail-icon">{t?.icon}</span>
        <div>
          <div className="detail-name">{region.label} <span>· {region.sub}</span></div>
          <div className="detail-stage">{st.icon} {st.label} — {st.verb} <StagePips stage={region.stage} /></div>
        </div>
      </div>
      {region.stage !== "flourishing" && (
        <div className="grow-bar">
          <i style={{ width: `${(region.growth / GROWTH_PER_STAGE) * 100}%` }} />
          <span>{region.growth}/{GROWTH_PER_STAGE} to {STAGES[STAGE_ORDER[STAGE_ORDER.indexOf(region.stage) + 1]].label}</span>
        </div>
      )}
      <p className="detail-note">{region.note}</p>
      <div className="detail-meta">
        <span>🌿 tended {region.tended}×</span>
        <span className={thirsty ? "thirsty" : ""}>💧 last watered {timeAgo(region.lastTs)}{thirsty ? " · needs water" : ""}</span>
      </div>
      <div className="detail-actions"><button className="btn-water" onClick={() => onWater(region.id)}>💧 Water it</button></div>
      <div className="log-add">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNote()} placeholder="log what you did here…" />
        <button onClick={submitNote} disabled={!text.trim()}>Add</button>
      </div>
      {region.logs.length > 0 && (
        <ul className="log-list">
          {region.logs.slice(0, 6).map((l, i) => (
            <li key={i}><span className="log-ico">{LOG_ICON[l.type] || "•"}</span>
              <span className="log-text">{l.text}</span><span className="log-time">{timeAgo(l.ts)}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bed({ region, active, thirsty, onHover, onSelect, selected }) {
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const kind = cropSprite(region);
  const count = region.id === "rest" ? 1 : 3;
  const size = region.id === "rest" ? 58 : region.stage === "flourishing" ? 34 : region.stage === "seed" ? 26 : 30;
  return (
    <button className={`bed stage-${region.stage} ${active ? "on" : ""} ${thirsty ? "thirsty" : ""}`}
      style={{ "--rc": t?.color }}
      onMouseEnter={() => onHover(region.id)} onMouseLeave={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); onSelect(region.id === selected ? null : region.id); }}>
      {thirsty && <span className="thirst-badge" title="needs water">💧</span>}
      <div className="crops">
        {Array.from({ length: count }).map((_, i) => (
          <PixelSprite key={i} kind={kind} color={t?.color || "#8fe39a"} size={size} />
        ))}
      </div>
      <span className="bed-label">{region.label} <em>{st.icon}</em> <StagePips stage={region.stage} /></span>
    </button>
  );
}

export default function GardenScene({ regions, hover, selected, onHover, onSelect, onWater, onNote, onCheckIn }) {
  const sel = regions.find((r) => r.id === selected);
  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;

  return (
    <section className="field" onClick={() => onSelect(null)}>
      {/* grass decorations */}
      {GRASS.map((g, i) => (
        <span key={i} className="grass-deco" style={{ left: `${g.x}%`, top: `${g.y}%` }}>
          <PixelSprite kind={g.k} color="#8fe39a" size={g.k === "daisy" ? 16 : 20} />
        </span>
      ))}

      {thirstyCount > 0 && (
        <div className="thirst-summary">💧 {thirstyCount} {thirstyCount === 1 ? "bed needs" : "beds need"} water</div>
      )}

      {/* the fenced plot */}
      <div className="plot" onClick={(e) => e.stopPropagation()}>
        <div className="beds">
          {LAYOUT.map((cell, i) => {
            if (cell.region) {
              const r = byId[cell.region];
              if (!r) return <div key={i} className="cell" />;
              return (
                <div key={i} className="cell">
                  <Bed region={r} selected={selected}
                    active={hover === r.id || selected === r.id}
                    thirsty={needsWater(r.lastTs)}
                    onHover={onHover} onSelect={onSelect} />
                </div>
              );
            }
            if (cell.deco) {
              return (
                <div key={i} className="cell deco-cell">
                  <PixelSprite kind={cell.deco} color="#8fe39a" size={cell.size || 40} />
                </div>
              );
            }
            return <div key={i} className="cell" />;
          })}
        </div>
      </div>

      <div className="garden-foot" onClick={(e) => e.stopPropagation()}>
        <button className="checkin" onClick={onCheckIn}>🌱 check in</button>
        <div className="legend">
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className="legend-item">{STAGES[s].icon} {STAGES[s].label}{i < STAGE_ORDER.length - 1 && <b>→</b>}</span>
          ))}
        </div>
      </div>

      {sel && <Detail region={sel} onClose={() => onSelect(null)} onWater={onWater} onNote={onNote} />}
    </section>
  );
}
