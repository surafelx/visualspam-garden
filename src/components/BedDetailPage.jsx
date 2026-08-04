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

function PlantCard({ plant, regionId, onAddFruit, onUpdateFruit, onToggleFruit, onDeleteFruit, onEditPlant, onDeletePlant }) {
  const [fruitForm, setFruitForm] = useState(null);
  const cropInfo = CROP_CHOICES.find((c) => c.id === plant.crop) || CROP_CHOICES[0];
  const fruits = plant.fruits || [];
  const pendingFruits = fruits.filter((f) => !f.done);
  const doneFruits = fruits.filter((f) => f.done);
  const pct = Math.round((plant.growth / GROWTH_PER_STAGE) * 100);

  const handleFruitSave = (fruit) => {
    if (fruitForm === "new") onAddFruit(regionId, plant.id, fruit);
    else onUpdateFruit(regionId, plant.id, fruit);
    setFruitForm(null);
  };

  return (
    <div className="plant-card">
      <div className="plant-head">
        <div className="plant-sprite">
          <PixelSprite kind={plant.crop || "leafy"} color="#8fe39a" size={36} />
        </div>
        <div className="plant-info">
          <h3 className="plant-name">{plant.name}</h3>
          <div className="plant-meta">
            <span className="plant-crop">{cropInfo.label}</span>
            <StagePips stage={plant.stage} />
          </div>
        </div>
        <div className="plant-actions">
          <button className="plant-edit-btn" onClick={() => onEditPlant(plant)} title="Edit plant">✎</button>
          <button className="plant-del-btn" onClick={() => onDeletePlant(regionId, plant.id)} title="Delete plant">✕</button>
        </div>
      </div>

      {plant.stage !== "flourishing" && (
        <div className="plant-grow">
          <div className="grow-bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="plant-grow-text">{plant.growth}/{GROWTH_PER_STAGE} growth</span>
        </div>
      )}
      {plant.stage === "flourishing" && <div className="plant-flourishing">🌸 Flourishing</div>}

      {plant.notes && <p className="plant-notes">{plant.notes}</p>}

      <div className="fruits-section">
        <div className="fruits-header">
          <span className="fruits-title">🍊 Fruits ({pendingFruits.length} pending, {doneFruits.length} harvested)</span>
          <button className="fruits-add-btn" onClick={() => setFruitForm("new")}>+ Add</button>
        </div>

        {fruits.length === 0 && <p className="fruits-empty">No fruits yet. Set a goal to harvest.</p>}

        {pendingFruits.length > 0 && (
          <ul className="fruits-list">
            {pendingFruits.map((f) => {
              const status = milestoneStatus(f);
              const daysLeft = Math.ceil((new Date(f.deadline).getTime() - Date.now()) / 864e5);
              return (
                <li key={f.id} className={`fruit-item ${status}`}>
                  <button className="fruit-check" onClick={() => onToggleFruit(regionId, plant.id, f.id)} />
                  <div className="fruit-info">
                    <span className="fruit-name">{f.title}</span>
                    <span className={`fruit-deadline ${status}`}>
                      {status === "overdue" ? `${Math.abs(daysLeft)}d overdue` :
                       status === "soon" ? `${daysLeft}d left` :
                       status === "done" ? "harvested ✓" : `due in ${daysLeft}d`}
                    </span>
                  </div>
                  <button className="fruit-edit" onClick={() => setFruitForm(f)}>✎</button>
                  <button className="fruit-del" onClick={() => onDeleteFruit(regionId, plant.id, f.id)}>✕</button>
                </li>
              );
            })}
          </ul>
        )}

        {doneFruits.length > 0 && (
          <ul className="fruits-list fruits-done-list">
            {doneFruits.map((f) => (
              <li key={f.id} className="fruit-item done">
                <button className="fruit-check checked" onClick={() => onToggleFruit(regionId, plant.id, f.id)} />
                <div className="fruit-info">
                  <span className="fruit-name">{f.title}</span>
                  <span className="fruit-deadline done">harvested</span>
                </div>
                <button className="fruit-del" onClick={() => onDeleteFruit(regionId, plant.id, f.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {fruitForm && (
        <MilestoneForm
          milestone={fruitForm === "new" ? null : fruitForm}
          regionLabel={plant.name}
          onSave={handleFruitSave}
          onCancel={() => setFruitForm(null)}
          labelPrefix="fruit"
        />
      )}
    </div>
  );
}

function PlantForm({ plant, regionLabel, onSave, onCancel }) {
  const [name, setName] = useState(plant?.name || "");
  const [crop, setCrop] = useState(plant?.crop || "leafy");
  const [notes, setNotes] = useState(plant?.notes || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ ...plant, name: name.trim(), crop, notes });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal plant-form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h2 className="ms-title">{plant ? "Edit" : "Add"} Plant in {regionLabel}</h2>
        <form onSubmit={handleSubmit}>
          <div className="ms-field">
            <label className="ms-label">Plant name</label>
            <input className="ms-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tomato #1" autoFocus />
          </div>
          <div className="ms-field">
            <label className="ms-label">Crop type</label>
            <div className="crop-swatches">
              {CROP_CHOICES.map((c) => (
                <button key={c.id} type="button" className={`swatch ${crop === c.id ? "on" : ""}`} title={c.label}
                  onClick={() => setCrop(c.id)}>
                  <PixelSprite kind={c.id} color="#8fe39a" size={22} />
                </button>
              ))}
            </div>
          </div>
          <div className="ms-field">
            <label className="ms-label">Notes</label>
            <textarea className="ms-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional notes…" />
          </div>
          <button type="submit" className="ms-save" disabled={!name.trim()}>{plant ? "Save" : "Add Plant"}</button>
        </form>
      </div>
    </div>
  );
}

export default function BedDetailPage({ region, onBack, onRefresh, onWater, onNote, onSetCrop, onStartTimer, timerRunning,
  onAddMilestone, onUpdateMilestone, onToggleMilestone, onDeleteMilestone, onEditBed, onDeleteBed }) {
  const [msForm, setMsForm] = useState(null);
  const [plantForm, setPlantForm] = useState(null);
  const [noteText, setNoteText] = useState("");
  const t = threadById[region.thread];
  const st = STAGES[region.stage];
  const thirsty = needsWater(region.lastTs);
  const current = region.crop || null;
  const milestones = region.milestones || [];
  const plants = region.plants || [];
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

  const handleAddPlant = async (plant) => {
    try { await api.addPlant(region.id, plant); onRefresh?.(); } catch (e) { console.error(e); }
    setPlantForm(null);
  };
  const handleEditPlant = async (plant) => {
    try { await api.updatePlant(region.id, plant.id, plant); onRefresh?.(); } catch (e) { console.error(e); }
    setPlantForm(null);
  };
  const handleDeletePlant = async (regionId, plantId) => {
    try { await api.deletePlant(regionId, plantId); onRefresh?.(); } catch (e) { console.error(e); }
  };
  const handleAddFruit = async (regionId, plantId, fruit) => {
    try { await api.addFruit(regionId, plantId, fruit); onRefresh?.(); } catch (e) { console.error(e); }
  };
  const handleUpdateFruit = async (regionId, plantId, fruit) => {
    try { await api.updateFruit(regionId, plantId, fruit.id, fruit); onRefresh?.(); } catch (e) { console.error(e); }
  };
  const handleToggleFruit = async (regionId, plantId, fruitId) => {
    try { await api.updateFruit(regionId, plantId, fruitId, { done: true, doneTs: new Date().toISOString() }); onRefresh?.(); } catch (e) { console.error(e); }
  };
  const handleDeleteFruit = async (regionId, plantId, fruitId) => {
    try { await api.deleteFruit(regionId, plantId, fruitId); onRefresh?.(); } catch (e) { console.error(e); }
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
    plants.forEach((p) => {
      (p.fruits || []).filter((f) => !f.done && f.deadline).forEach((f) => {
        const d = new Date(f.deadline);
        const dt = d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        lines.push("BEGIN:VEVENT", `DTSTART:${dt}`, `DTEND:${dt}`, `SUMMARY:[${p.name}] ${f.title}`, `DESCRIPTION:Plant: ${p.name} in ${region.label}`, "END:VEVENT");
      });
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
              🎯 Bed Milestones
              <button className="ms-add-btn" onClick={() => setMsForm("new")}>+ Add</button>
            </div>
            {milestones.length === 0 && (
              <p className="ms-empty">No bed-level milestones yet.</p>
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
            <button className="bdp-ics-btn" onClick={genIcs}>📅 Export to Calendar (.ics)</button>
          </div>

          <div className="bdp-card">
            <div className="bdp-card-head">
              🌿 Plants ({plants.length})
              <button className="ms-add-btn" onClick={() => setPlantForm("new")}>+ Add Plant</button>
            </div>
            {plants.length === 0 && (
              <p className="ms-empty">No plants in this bed yet. Add plants to grow fruits.</p>
            )}
            {plants.map((p) => (
              <PlantCard key={p.id} plant={p} regionId={region.id}
                onAddFruit={handleAddFruit} onUpdateFruit={handleUpdateFruit}
                onToggleFruit={handleToggleFruit} onDeleteFruit={handleDeleteFruit}
                onEditPlant={(pl) => setPlantForm(pl)} onDeletePlant={handleDeletePlant} />
            ))}
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

      {plantForm && (
        <PlantForm
          plant={plantForm === "new" ? null : plantForm}
          regionLabel={region.label}
          onSave={plantForm === "new" ? handleAddPlant : handleEditPlant}
          onCancel={() => setPlantForm(null)}
        />
      )}
    </section>
  );
}
