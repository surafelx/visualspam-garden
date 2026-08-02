import { useState } from "react";
import { threadById, STAGES, STAGE_ORDER, GROWTH_PER_STAGE, timeAgo, needsWater } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

function spriteKind(r) {
  if (r.stage === "seed") return "seed";
  if (r.stage === "sprout") return "sprout";
  return r.kind;
}
function spriteSize(r) {
  const base = r.kind === "pond" || r.kind === "meadow" ? 92 : 74;
  if (r.stage === "seed") return 30;
  if (r.stage === "sprout") return 44;
  if (r.stage === "growing") return Math.round(base * 0.72);
  return base;
}

function StagePips({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <span className="pips">
      {STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}
    </span>
  );
}

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸" };

function Detail({ region, onClose, onWater, onNote }) {
  const [text, setText] = useState("");
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const thirsty = needsWater(region.lastTs);

  const submitNote = () => {
    const v = text.trim();
    if (!v) return;
    onNote(region.id, v);
    setText("");
  };

  return (
    <div className="detail" onClick={(e) => e.stopPropagation()} style={{ "--rc": t?.color }}>
      <button className="detail-close" onClick={onClose}>✕</button>
      <div className="detail-head">
        <span className="detail-icon">{t?.icon}</span>
        <div>
          <div className="detail-name">{region.label} <span>· {region.sub}</span></div>
          <div className="detail-stage">
            {st.icon} {st.label} — {st.verb} <StagePips stage={region.stage} />
          </div>
        </div>
      </div>

      {/* growth toward next stage */}
      {region.stage !== "flourishing" && (
        <div className="grow-bar" title={`${region.growth}/${GROWTH_PER_STAGE} to next stage`}>
          <i style={{ width: `${(region.growth / GROWTH_PER_STAGE) * 100}%` }} />
          <span>{region.growth}/{GROWTH_PER_STAGE} to {STAGES[STAGE_ORDER[STAGE_ORDER.indexOf(region.stage) + 1]].label}</span>
        </div>
      )}

      <p className="detail-note">{region.note}</p>

      <div className="detail-meta">
        <span>🌿 tended {region.tended}×</span>
        <span className={thirsty ? "thirsty" : ""}>💧 last watered {timeAgo(region.lastTs)}{thirsty ? " · needs water" : ""}</span>
      </div>

      <div className="detail-actions">
        <button className="btn-water" onClick={() => onWater(region.id)}>💧 Water it</button>
      </div>

      {/* add a log — you watering / paying attention */}
      <div className="log-add">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNote()}
          placeholder="log what you did here…"
        />
        <button onClick={submitNote} disabled={!text.trim()}>Add</button>
      </div>

      {region.logs.length > 0 && (
        <ul className="log-list">
          {region.logs.slice(0, 6).map((l, i) => (
            <li key={i}>
              <span className="log-ico">{LOG_ICON[l.type] || "•"}</span>
              <span className="log-text">{l.text}</span>
              <span className="log-time">{timeAgo(l.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GardenScene({ regions, hover, selected, onHover, onSelect, onWater, onNote }) {
  const sel = regions.find((r) => r.id === selected);
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;

  return (
    <section className="garden" onClick={() => onSelect(null)}>
      <div className="garden-grid" aria-hidden />

      {regions.map((r) => {
        const t = threadById[r.thread];
        const active = hover === r.id || selected === r.id;
        const st = STAGES[r.stage];
        const thirsty = needsWater(r.lastTs);
        return (
          <button
            key={r.id}
            className={`plant stage-${r.stage} ${active ? "on" : ""} ${thirsty ? "thirsty" : ""}`}
            style={{ left: `${r.x}%`, top: `${r.y}%`, "--rc": t?.color || "#8fe39a" }}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            onClick={(e) => { e.stopPropagation(); onSelect(r.id === selected ? null : r.id); }}
          >
            {thirsty && <span className="thirst-badge" title="needs water">💧</span>}
            <PixelSprite kind={spriteKind(r)} color={t?.color || "#8fe39a"} size={spriteSize(r)} />
            <span className="plant-shadow" />
            <span className="plant-label">
              {r.label} <em>· {st.icon} {st.label}</em>
              <StagePips stage={r.stage} />
            </span>
          </button>
        );
      })}

      <button className="checkin" onClick={(e) => e.stopPropagation()}>
        <PixelSprite kind="sprout" color="#8fe39a" size={40} />
        <span className="checkin-label">check in</span>
      </button>

      {/* status line: how many plants are asking for attention */}
      {thirstyCount > 0 && (
        <div className="thirst-summary">💧 {thirstyCount} {thirstyCount === 1 ? "plant needs" : "plants need"} water</div>
      )}

      <div className="legend" aria-hidden>
        {STAGE_ORDER.map((s, i) => (
          <span key={s} className="legend-item">
            {STAGES[s].icon} {STAGES[s].label}{i < STAGE_ORDER.length - 1 && <b>→</b>}
          </span>
        ))}
      </div>

      {sel && <Detail region={sel} onClose={() => onSelect(null)} onWater={onWater} onNote={onNote} />}
    </section>
  );
}
