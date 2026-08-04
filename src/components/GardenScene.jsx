import { useState, useRef, useCallback } from "react";
import { threadById, STAGES, STAGE_ORDER, GROWTH_PER_STAGE, timeAgo, needsWater, CROP_CHOICES, milestoneStatus } from "../data.js";
import { PixelSprite } from "../pixels.jsx";
import MilestoneForm from "./MilestoneForm.jsx";
import * as api from "../api.js";

const CROP = {
  technology: "leafy", philosophy: "cabbage", business: "carrot",
  health: "tomato", nature: "pond", relationships: "flower", ideas: "flower",
};
function cropSprite(r) {
  if (r.id === "rest") return "pond";
  if (r.stage === "seed") return "seed";
  if (r.stage === "sprout") return "sprout";
  return r.crop || CROP[r.thread] || "leafy";
}

const GRASS = [
  { x: 5, y: 10, k: "daisy" }, { x: 12, y: 35, k: "tuft" }, { x: 8, y: 65, k: "daisy" },
  { x: 88, y: 15, k: "tuft" }, { x: 92, y: 48, k: "daisy" }, { x: 85, y: 78, k: "tuft" },
  { x: 28, y: 6, k: "daisy" }, { x: 64, y: 5, k: "tuft" }, { x: 48, y: 92, k: "daisy" },
  { x: 18, y: 88, k: "tuft" }, { x: 76, y: 90, k: "daisy" },
];

function StagePips({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return <span className="pips">{STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</span>;
}

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

function Detail({ region, onClose, onWater, onNote, onSetCrop, onStartTimer, timerRunning,
  onAddMilestone, onUpdateMilestone, onToggleMilestone, onDeleteMilestone, onEditBed, onDeleteBed }) {
  const [text, setText] = useState("");
  const [msForm, setMsForm] = useState(null);
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const thirsty = needsWater(region.lastTs);
  const submitNote = () => { const v = text.trim(); if (!v) return; onNote(region.id, v); setText(""); };
  const current = region.crop || null;
  const milestones = region.milestones || [];
  const pendingMs = milestones.filter((m) => !m.done);
  const doneMs = milestones.filter((m) => m.done);

  const handleMsSave = (ms) => {
    if (msForm === "new") onAddMilestone(region.id, ms);
    else onUpdateMilestone(region.id, ms);
    setMsForm(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()} style={{ "--rc": t?.color }}>
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-head">
          <span className="detail-icon">{t?.icon}</span>
          <div>
            <div className="detail-name">{region.label} <span>· {region.sub}</span></div>
            <div className="detail-stage">{st.icon} {st.label} — {st.verb} <StagePips stage={region.stage} /></div>
          </div>
          <div className="detail-bed-actions">
            <button className="detail-edit-btn" onClick={() => onEditBed(region)} title="Edit bed">✎</button>
            <button className="detail-del-btn" onClick={() => onDeleteBed(region.id)} title="Delete bed">✕</button>
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
          <span>☀️ {region.sunshine || 0}m of sunshine</span>
          <span className={thirsty ? "thirsty" : ""}>💧 last watered {timeAgo(region.lastTs)}{thirsty ? " · needs water" : ""}</span>
        </div>

        {region.id !== "rest" && (
          <div className="crop-picker">
            <span className="crop-picker-label">grows</span>
            <div className="crop-swatches">
              {CROP_CHOICES.map((c) => (
                <button key={c.id} className={`swatch ${current === c.id ? "on" : ""}`} title={c.label}
                  onClick={() => onSetCrop(region.id, c.id)}>
                  <PixelSprite kind={c.id} color={t?.color || "#8fe39a"} size={22} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ms-section">
          <div className="ms-header">
            <span className="ms-section-title">🎯 Milestones</span>
            <button className="ms-add-btn" onClick={() => setMsForm("new")}>+ Add</button>
          </div>
          {milestones.length === 0 && (
            <p className="ms-empty">No milestones yet. Set a goal with a deadline.</p>
          )}
          {pendingMs.length > 0 && (
            <ul className="ms-list">
              {pendingMs.map((ms) => {
                const status = milestoneStatus(ms);
                const daysLeft = Math.ceil((new Date(ms.deadline).getTime() - Date.now()) / 864e5);
                return (
                  <li key={ms.id} className={`ms-item ${status}`}>
                    <button className="ms-check" onClick={() => onToggleMilestone(region.id, ms.id)} />
                    <div className="ms-info">
                      <span className="ms-name">{ms.title}</span>
                      <span className={`ms-deadline ${status}`}>
                        {status === "overdue" ? `${Math.abs(daysLeft)}d overdue` :
                         status === "soon" ? `${daysLeft}d left` :
                         status === "done" ? "done ✓" : `due in ${daysLeft}d`}
                      </span>
                    </div>
                    <button className="ms-edit" onClick={() => setMsForm(ms)}>✎</button>
                    <button className="ms-del" onClick={() => onDeleteMilestone(region.id, ms.id)}>✕</button>
                  </li>
                );
              })}
            </ul>
          )}
          {doneMs.length > 0 && (
            <ul className="ms-list ms-done-list">
              {doneMs.map((ms) => (
                <li key={ms.id} className="ms-item done">
                  <button className="ms-check checked" onClick={() => onToggleMilestone(region.id, ms.id)} />
                  <div className="ms-info">
                    <span className="ms-name">{ms.title}</span>
                    <span className="ms-deadline done">done ✓</span>
                  </div>
                  <button className="ms-del" onClick={() => onDeleteMilestone(region.id, ms.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="detail-actions">
          <button className="btn-water" onClick={() => onWater(region.id)}>💧 Water</button>
          <button className="btn-sun" disabled={timerRunning} onClick={() => onStartTimer(region.id)}>
            {timerRunning ? "☀️ giving…" : "☀️ Sunshine"}
          </button>
        </div>
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

      {msForm && (
        <MilestoneForm
          milestone={msForm === "new" ? null : msForm}
          regionLabel={region.label}
          onSave={handleMsSave}
          onCancel={() => setMsForm(null)}
        />
      )}
    </div>
  );
}

function BedTooltip({ region }) {
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const milestones = region.milestones || [];
  const done = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  const pct = Math.round((region.growth / GROWTH_PER_STAGE) * 100);
  return (
    <div className="bed-tooltip" style={{ "--rc": t?.color }}>
      <div className="tt-row tt-head">
        <span className="tt-icon">{st.icon}</span>
        <span className="tt-stage">{st.label}</span>
        <span className="tt-pct">{pct}%</span>
      </div>
      <div className="tt-bar"><i style={{ width: `${pct}%` }} /></div>
      <div className="tt-row">
        <span>☀️ {region.sunshine || 0}m</span>
        <span>🌿 {region.tended}× tended</span>
      </div>
      {total > 0 && (
        <div className="tt-row"><span>🎯 {done}/{total} milestones</span></div>
      )}
      <div className="tt-row tt-note">{timeAgo(region.lastTs)}</div>
    </div>
  );
}

function Bed({ region, active, thirsty, onHover, onSelect, selected, onStartTimer, onDragStart, onDragEnd }) {
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const kind = cropSprite(region);
  const count = region.id === "rest" ? 1 : 3;
  const size = region.id === "rest" ? 64 : region.stage === "flourishing" ? 40 : region.stage === "seed" ? 30 : 36;
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    if (e.target.closest(".bed-sun-btn")) return;
    dragging.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    const handleMove = (ev) => {
      const dx = Math.abs(ev.clientX - startPos.current.x);
      const dy = Math.abs(ev.clientY - startPos.current.y);
      if (dx > 4 || dy > 4) dragging.current = true;
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (dragging.current) onDragEnd?.(region.id, e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <button
      className={`bed stage-${region.stage} ${active ? "on" : ""} ${thirsty ? "thirsty" : ""}`}
      style={{ "--rc": t?.color, left: `${region.x}%`, top: `${region.y}%` }}
      onMouseEnter={() => onHover(region.id)} onMouseLeave={() => onHover(null)}
      onClick={(e) => { if (!dragging.current) { e.stopPropagation(); onSelect(region.id === selected ? null : region.id); } }}
      onPointerDown={handlePointerDown}>
      {thirsty && <span className="thirst-badge" title="needs water">💧</span>}
      <button className="bed-sun-btn" title="Give sunshine"
        onClick={(e) => { e.stopPropagation(); onStartTimer(region.id); }}>☀️</button>
      <div className="crops">
        {Array.from({ length: count }).map((_, i) => (
          <PixelSprite key={i} kind={kind} color={t?.color || "#8fe39a"} size={size} />
        ))}
      </div>
      <span className="bed-label">{region.label} <em>{st.icon}</em> <StagePips stage={region.stage} /></span>
    </button>
  );
}

export default function GardenScene({ regions, hover, selected, timerId, onHover, onSelect, onWater, onNote, onSetCrop, onStartTimer,
  onAddMilestone, onUpdateMilestone, onToggleMilestone, onDeleteMilestone, onEditBed, onDeleteBed }) {
  const sel = regions.find((r) => r.id === selected);
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;
  const hoveredRegion = hover ? regions.find((r) => r.id === hover) : null;
  const plotRef = useRef(null);

  const handleDragEnd = useCallback(async (id, clientX, clientY) => {
    const plot = plotRef.current;
    if (!plot) return;
    const rect = plot.getBoundingClientRect();
    const x = Math.round(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100)));
    try {
      const saved = await api.updateRegion(id, { x, y });
      onSelect(null);
      window.dispatchEvent(new CustomEvent("vsg-region-updated", { detail: saved }));
    } catch (e) { console.error(e); }
  }, [onSelect]);

  return (
    <section className="field" onClick={() => onSelect(null)}>
      {GRASS.map((g, i) => (
        <span key={i} className="grass-deco" style={{ left: `${g.x}%`, top: `${g.y}%` }}>
          <PixelSprite kind={g.k} color="#8fe39a" size={g.k === "daisy" ? 16 : 20} />
        </span>
      ))}

      {thirstyCount > 0 && (
        <div className="thirst-summary">💧 {thirstyCount} {thirstyCount === 1 ? "bed needs" : "beds need"} water</div>
      )}

      <div className="garden-canvas" ref={plotRef} onClick={(e) => e.stopPropagation()}>
        {regions.map((r) => (
          <Bed key={r.id} region={r} selected={selected}
            active={hover === r.id || selected === r.id}
            thirsty={needsWater(r.lastTs)}
            onHover={onHover} onSelect={onSelect} onStartTimer={onStartTimer}
            onDragEnd={handleDragEnd} />
        ))}
        {hoveredRegion && !selected && <BedTooltip region={hoveredRegion} />}
      </div>

      <div className="garden-foot" onClick={(e) => e.stopPropagation()}>
        <div className="legend">
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className="legend-item">{STAGES[s].icon} {STAGES[s].label}{i < STAGE_ORDER.length - 1 && <b>→</b>}</span>
          ))}
        </div>
      </div>

      {sel && <Detail region={sel} onClose={() => onSelect(null)} onWater={onWater} onNote={onNote}
        onSetCrop={onSetCrop} onStartTimer={onStartTimer} timerRunning={timerId === sel.id}
        onAddMilestone={onAddMilestone} onUpdateMilestone={onUpdateMilestone}
        onToggleMilestone={onToggleMilestone} onDeleteMilestone={onDeleteMilestone}
        onEditBed={onEditBed} onDeleteBed={onDeleteBed} />}
    </section>
  );
}
