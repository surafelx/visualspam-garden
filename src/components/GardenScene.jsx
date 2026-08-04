import { useState, useEffect } from "react";
import { threadById, STAGES, STAGE_ORDER, GROWTH_PER_STAGE, timeAgo, needsWater, CROP_CHOICES, milestoneStatus } from "../data.js";
import { PixelSprite } from "../pixels.jsx";
import MilestoneForm from "./MilestoneForm.jsx";

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

function StagePips({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return <span className="pips">{STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</span>;
}

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

function BedCard({ region, onSelect, onStartTimer }) {
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const kind = cropSprite(region);
  const thirsty = needsWater(region.lastTs);
  const pct = Math.round((region.growth / GROWTH_PER_STAGE) * 100);
  const plants = region.plants || [];
  const milestones = region.milestones || [];
  const pendingFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => !f.done).length, 0);
  const doneFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => f.done).length, 0);
  const pendingMs = milestones.filter((m) => !m.done).length;
  const lastLog = (region.logs || [])[0];
  const spriteSize = region.id === "rest" ? 56 : region.stage === "flourishing" ? 44 : region.stage === "seed" ? 32 : 38;
  const count = region.id === "rest" ? 1 : 3;

  return (
    <button className="g-card" style={{ "--rc": t?.color }} onClick={() => onSelect(region.id)}>
      {thirsty && <span className="g-card-thirst">💧</span>}
      <div className="g-card-top">
        <div className="g-card-sprites">
          {Array.from({ length: count }).map((_, i) => (
            <PixelSprite key={i} kind={kind} color={t?.color || "#8fe39a"} size={spriteSize} />
          ))}
        </div>
        <button className="g-card-sun" title="Give sunshine" onClick={(e) => { e.stopPropagation(); onStartTimer(region.id); }}>☀️</button>
      </div>
      <div className="g-card-mid">
        <div className="g-card-name">{region.label}</div>
        <div className="g-card-stage">{st.icon} {st.label} <StagePips stage={region.stage} /></div>
      </div>
      {region.stage !== "flourishing" && (
        <div className="g-bar"><i style={{ width: `${pct}%` }} /></div>
      )}
      <div className="g-card-stats">
        <span>☀️ {region.sunshine || 0}m</span>
        <span>🌿 {region.tended}×</span>
        {plants.length > 0 && <span>🌱 {plants.length}</span>}
        {(pendingFruits + pendingMs) > 0 && <span className="g-card-fruits">🍊 {pendingFruits + pendingMs}</span>}
        {doneFruits > 0 && <span className="g-card-harvested">✓ {doneFruits}</span>}
      </div>
      {lastLog && (
        <div className="g-card-log">{LOG_ICON[lastLog.type] || "•"} {lastLog.text?.slice(0, 50)}</div>
      )}
    </button>
  );
}

function BedDetail({ region, onClose, onWater, onNote, onSetCrop, onStartTimer, timerRunning,
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
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
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
          {milestones.length === 0 && <p className="ms-empty">No milestones yet.</p>}
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
        <div className="log-add">
          <input value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNote()} placeholder="log what you did — this waters the bed" />
          <button onClick={submitNote} disabled={!text.trim()}>Add</button>
        </div>
        <div className="detail-actions">
          <button className="btn-sun" disabled={timerRunning} onClick={() => onStartTimer(region.id)}>
            {timerRunning ? "☀️ giving…" : "☀️ Sunshine"}
          </button>
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
        <MilestoneForm milestone={msForm === "new" ? null : msForm} regionLabel={region.label}
          onSave={handleMsSave} onCancel={() => setMsForm(null)} />
      )}
    </div>
  );
}

export default function GardenScene({ regions, hover, selected, timerId, onHover, onSelect, onWater, onNote, onSetCrop, onStartTimer,
  onAddMilestone, onUpdateMilestone, onToggleMilestone, onDeleteMilestone, onEditBed, onDeleteBed }) {
  const sel = regions.find((r) => r.id === selected);
  const thirstyCount = regions.filter((r) => needsWater(r.lastTs)).length;
  const totalSun = regions.reduce((n, r) => n + (r.sunshine || 0), 0);
  const totalTended = regions.reduce((n, r) => n + r.tended, 0);
  const totalPlants = regions.reduce((n, r) => n + (r.plants || []).length, 0);
  const totalFruits = regions.reduce((n, r) => {
    const ms = (r.milestones || []).filter((m) => !m.done).length;
    const pf = (r.plants || []).reduce((s, p) => s + (p.fruits || []).filter((f) => !f.done).length, 0);
    return n + ms + pf;
  }, 0);

  const [clock, setClock] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setClock(new Date()), 15000); return () => clearInterval(id); }, []);
  const H = clock.getHours();
  const M = String(clock.getMinutes()).padStart(2, "0");
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
          <span className="g-clock-time">{String(H).padStart(2, "0")}:{M}</span>
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
        <div className="g-sum-item"><span className="g-sum-num">{totalTended}</span><span className="g-sum-label">tended</span></div>
        {thirstyCount > 0 && (
          <div className="g-sum-item g-sum-thirst"><span className="g-sum-num">💧 {thirstyCount}</span><span className="g-sum-label">need water</span></div>
        )}
      </div>

      <div className="g-grid">
        {regions.map((r) => (
          <BedCard key={r.id} region={r} onSelect={onSelect} onStartTimer={onStartTimer} />
        ))}
      </div>

      {sel && <BedDetail region={sel} onClose={() => onSelect(null)} onWater={onWater} onNote={onNote}
        onSetCrop={onSetCrop} onStartTimer={onStartTimer} timerRunning={timerId === sel.id}
        onAddMilestone={onAddMilestone} onUpdateMilestone={onUpdateMilestone}
        onToggleMilestone={onToggleMilestone} onDeleteMilestone={onDeleteMilestone}
        onEditBed={onEditBed} onDeleteBed={onDeleteBed} />}
    </section>
  );
}
