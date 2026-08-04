import { useState, useRef, useEffect } from "react";
import { threadById, timeAgo, needsWater, CROP_CHOICES, milestoneStatus } from "../data.js";
import { PixelSprite } from "../pixels.jsx";
import MilestoneForm from "./MilestoneForm.jsx";
import * as api from "../api.js";

const LOG_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

function PlantCard({ plant, regionId, onAddFruit, onUpdateFruit, onToggleFruit, onDeleteFruit, onEditPlant, onDeletePlant }) {
  const [fruitForm, setFruitForm] = useState(null);
  const cropInfo = CROP_CHOICES.find((c) => c.id === plant.crop) || CROP_CHOICES[0];
  const fruits = plant.fruits || [];
  const pendingFruits = fruits.filter((f) => !f.done);
  const doneFruits = fruits.filter((f) => f.done);

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
          </div>
        </div>
        <div className="plant-actions">
          <button className="plant-edit-btn" onClick={() => onEditPlant(plant)} title="Edit plant">✎</button>
          <button className="plant-del-btn" onClick={() => onDeletePlant(regionId, plant.id)} title="Delete plant">✕</button>
        </div>
      </div>

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
                    {f.notes && <span className="fruit-notes">{f.notes}</span>}
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
                  {f.notes && <span className="fruit-notes">{f.notes}</span>}
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

function WaterModal({ region, onClose, onWater }) {
  const [text, setText] = useState("");
  const submit = () => { onWater(region.id, text.trim() || "watered"); onClose(); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal water-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="ms-title">💧 Water log</h2>
        <p className="ms-region">{region.label}</p>
        <div className="ms-field">
          <label className="ms-label">What did you do?</label>
          <input className="ms-input" autoFocus value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. reviewed code, went for a run…" />
        </div>
        <button className="ms-save" onClick={submit}>Log it</button>
      </div>
    </div>
  );
}

export default function BedDetailPage({ region, onBack, onRefresh, onWater, onStartTimer, timerRunning, onEditBed, onDeleteBed }) {
  const [plantForm, setPlantForm] = useState(null);
  const [showWater, setShowWater] = useState(false);
  const regionRef = useRef(region);
  useEffect(() => { regionRef.current = region; }, [region]);
  const t = threadById[region.thread];
  const thirsty = needsWater(region.lastTs);
  const plants = region.plants || [];

  const logs = (region.logs || []).sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const sunLogs = logs.filter((l) => l.type === "sun");
  const noteLogs = logs.filter((l) => l.type === "note");
  const waterLogs = logs.filter((l) => l.type === "water");

  const handleAddPlant = async (plant) => {
    try { await api.addPlant(regionRef.current.id, plant); onRefresh?.(); } catch (e) { console.error(e); }
    setPlantForm(null);
  };
  const handleEditPlant = async (plant) => {
    try { await api.updatePlant(regionRef.current.id, plant.id, plant); onRefresh?.(); } catch (e) { console.error(e); }
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
      `X-WR-CALNAME:${region.label}`,
    ];
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
            <div className="bdp-sub">{t?.label}</div>
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
            <div className="bdp-card-head">☀️ Sunshine & Water</div>
            <div className="bdp-stats">
              <span>☀️ {region.sunshine || 0}m sunshine</span>
              <span>🌿 tended {region.tended}×</span>
              <span className={thirsty ? "thirsty" : ""}>💧 {thirsty ? "needs water" : `watered ${timeAgo(region.lastTs)}`}</span>
            </div>
            <div className="bdp-actions-row">
              <button className="btn-water" onClick={() => setShowWater(true)}>💧 Water</button>
              <button className="btn-sun" disabled={timerRunning} onClick={() => onStartTimer(region.id)}>
                {timerRunning ? "☀️ giving…" : "☀️ Sunshine"}
              </button>
            </div>
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
            {plants.some((p) => (p.fruits || []).length > 0) && (
              <button className="bdp-ics-btn" onClick={genIcs}>📅 Export fruits to Calendar (.ics)</button>
            )}
          </div>
        </div>
      </div>

      {plantForm && (
        <PlantForm
          plant={plantForm === "new" ? null : plantForm}
          regionLabel={region.label}
          onSave={plantForm === "new" ? handleAddPlant : handleEditPlant}
          onCancel={() => setPlantForm(null)}
        />
      )}
      {showWater && (
        <WaterModal region={region} onClose={() => setShowWater(false)} onWater={onWater} />
      )}
    </section>
  );
}
