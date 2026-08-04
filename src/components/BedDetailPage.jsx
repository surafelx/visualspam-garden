import { useState } from "react";
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

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

function StagePips({ stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  return <span className="pips">{STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} />)}</span>;
}

export default function BedDetailPage({ region, onBack, onWater, onNote, onSetCrop, onStartTimer, timerRunning,
  onAddMilestone, onUpdateMilestone, onToggleMilestone, onDeleteMilestone, onEditBed, onDeleteBed }) {
  const [msForm, setMsForm] = useState(null);
  const [noteText, setNoteText] = useState("");
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const thirsty = needsWater(region.lastTs);
  const current = region.crop || null;
  const milestones = region.milestones || [];
  const pendingMs = milestones.filter((m) => !m.done);
  const doneMs = milestones.filter((m) => m.done);
  const pct = Math.round((region.growth / GROWTH_PER_STAGE) * 100);
  const kind = cropSprite(region);
  const cropSize = region.id === "rest" ? 58 : region.stage === "flourishing" ? 34 : region.stage === "seed" ? 26 : 30;
  const count = region.id === "rest" ? 1 : 3;

  const logs = (region.logs || []).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const sunLogs = logs.filter((l) => l.type === "sun");
  const noteLogs = logs.filter((l) => l.type === "note");
  const waterLogs = logs.filter((l) => l.type === "water");
  const growLogs = logs.filter((l) => l.type === "grow");

  const handleMsSave = (ms) => {
    if (msForm === "new") onAddMilestone(region.id, ms);
    else onUpdateMilestone(region.id, ms);
    setMsForm(null);
  };

  const submitNote = () => {
    const v = noteText.trim();
    if (!v) return;
    onNote(region.id, v);
    setNoteText("");
  };

  const genIcs = () => {
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VisualSpam Garden//Bed//EN",
      `X-WR-CALNAME:${region.label} — ${st.label}`,
    ];
    milestones.filter((m) => !m.done && m.deadline).forEach((ms) => {
      const d = new Date(ms.deadline);
      const dt = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      lines.push("BEGIN:VEVENT", `DTSTART:${dt}`, `DTEND:${dt}`, `SUMMARY:${ms.title}`, `DESCRIPTION:Bed: ${region.label} — ${st.label}`, "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${region.label.replace(/\s+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bed-detail-page" style={{ "--rc": t?.color }}>
      <div className="bdp-header">
        <button className="bdp-back" onClick={onBack}>← Back</button>
        <div className="bdp-title">
          <span className="bdp-icon">{t?.icon}</span>
          <div>
            <h1 className="bdp-name">{region.label}</h1>
            <div className="bdp-sub">{st.icon} {st.label} · {t?.label} <StagePips stage={region.stage} /></div>
          </div>
        </div>
        <div className="bdp-actions">
          <button className="bdp-edit" onClick={() => onEditBed(region)} title="Edit bed">✎ Edit</button>
          <button className="bdp-del" onClick={() => onDeleteBed(region.id)} title="Delete bed">✕ Delete</button>
        </div>
      </div>

      <div className="bdp-grid">
        <div className="bdp-col bdp-left">
          <div className="bdp-card">
            <div className="bdp-card-head">🌱 Growth</div>
            {region.stage !== "flourishing" ? (
              <div className="bdp-grow">
                <div className="grow-bar"><i style={{ width: `${pct}%` }} /><span>{pct}%</span></div>
                <span className="bdp-grow-sub">{region.growth}/{GROWTH_PER_STAGE} toward {STAGES[STAGE_ORDER[STAGE_ORDER.indexOf(region.stage) + 1]]?.label}</span>
              </div>
            ) : (
              <div className="bdp-flourishing">🌸 Flourishing — fully grown</div>
            )}
            <div className="bdp-stats">
              <span>☀️ {region.sunshine || 0}m sunshine</span>
              <span>🌿 tended {region.tended}×</span>
              <span className={thirsty ? "thirsty" : ""}>💧 {thirsty ? "needs water" : `watered ${timeAgo(region.lastTs)}`}</span>
            </div>
          </div>

          <div className="bdp-card">
            <div className="bdp-card-head">🖼 Crops</div>
            <div className="bdp-crops">
              {Array.from({ length: count }).map((_, i) => (
                <PixelSprite key={i} kind={kind} color={t?.color || "#8fe39a"} size={cropSize} />
              ))}
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
          </div>

          <div className="bdp-card">
            <div className="bdp-card-head">☀️ Sunshine & Water</div>
            <div className="bdp-actions-row">
              <button className="btn-water" onClick={() => onWater(region.id)}>💧 Water</button>
              <button className="btn-sun" disabled={timerRunning} onClick={() => onStartTimer(region.id)}>
                {timerRunning ? "☀️ giving…" : "☀️ Sunshine"}
              </button>
            </div>
          </div>

          <div className="bdp-card">
            <div className="bdp-card-head">✎ Log</div>
            <div className="bdp-note-input">
              <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNote()} placeholder="log what you did…" />
              <button onClick={submitNote} disabled={!noteText.trim()}>Add</button>
            </div>
            <ul className="bdp-log-list">
              {logs.length === 0 && <li className="bdp-log-empty">no activity yet</li>}
              {logs.slice(0, 20).map((l, i) => (
                <li key={i} className="bdp-log-item">
                  <span className="bdp-log-icon">{LOG_ICON[l.type] || "•"}</span>
                  <span className="bdp-log-text">{l.text}</span>
                  <span className="bdp-log-time">{timeAgo(l.ts)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bdp-col bdp-right">
          <div className="bdp-card">
            <div className="bdp-card-head">
              🎯 Milestones
              <button className="ms-add-btn" onClick={() => setMsForm("new")}>+ Add</button>
            </div>
            {milestones.length === 0 && (
              <p className="ms-empty">No milestones yet. Set goals with deadlines.</p>
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
                      <span className="ms-deadline done">completed</span>
                    </div>
                    <button className="ms-del" onClick={() => onDeleteMilestone(region.id, ms.id)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
            {milestones.length > 0 && (
              <button className="bdp-ics-btn" onClick={genIcs}>📅 Export to Calendar (.ics)</button>
            )}
          </div>

          <div className="bdp-card">
            <div className="bdp-card-head">📅 Timeline</div>
            {growLogs.length > 0 && (
              <div className="bdp-timeline-section">
                <div className="bdp-timeline-label">🌸 Growth</div>
                <ul className="bdp-timeline">
                  {growLogs.map((l, i) => (
                    <li key={i} className="bdp-tl-item"><span className="bdp-tl-dot grow" /><span className="bdp-tl-text">{l.text}</span><span className="bdp-tl-time">{timeAgo(l.ts)}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {sunLogs.length > 0 && (
              <div className="bdp-timeline-section">
                <div className="bdp-timeline-label">☀️ Sunshine</div>
                <ul className="bdp-timeline">
                  {sunLogs.slice(0, 10).map((l, i) => (
                    <li key={i} className="bdp-tl-item"><span className="bdp-tl-dot sun" /><span className="bdp-tl-text">{l.text}</span><span className="bdp-tl-time">{timeAgo(l.ts)}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {waterLogs.length > 0 && (
              <div className="bdp-timeline-section">
                <div className="bdp-timeline-label">💧 Watering</div>
                <ul className="bdp-timeline">
                  {waterLogs.slice(0, 10).map((l, i) => (
                    <li key={i} className="bdp-tl-item"><span className="bdp-tl-dot water" /><span className="bdp-tl-text">{l.text}</span><span className="bdp-tl-time">{timeAgo(l.ts)}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {noteLogs.length > 0 && (
              <div className="bdp-timeline-section">
                <div className="bdp-timeline-label">✎ Notes</div>
                <ul className="bdp-timeline">
                  {noteLogs.slice(0, 10).map((l, i) => (
                    <li key={i} className="bdp-tl-item"><span className="bdp-tl-dot note" /><span className="bdp-tl-text">{l.text}</span><span className="bdp-tl-time">{timeAgo(l.ts)}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {logs.length === 0 && <p className="ms-empty">No timeline entries yet.</p>}
          </div>
        </div>
      </div>

      {msForm && (
        <MilestoneForm
          milestone={msForm === "new" ? null : msForm}
          regionLabel={region.label}
          onSave={handleMsSave}
          onCancel={() => setMsForm(null)}
        />
      )}
    </section>
  );
}
