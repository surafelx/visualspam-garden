import { useState, useMemo } from "react";
import { dayKey, threadById } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

function buildICS(slots, byId, date) {
  const p = (n) => String(n).padStart(2, "0");
  const ymd = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
  const stamp = `${ymd}T${p(date.getHours())}${p(date.getMinutes())}00`;
  const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VisualSpam//Garden//EN", "CALSCALE:GREGORIAN"];
  Object.entries(slots).forEach(([hStr, tasks]) => {
    const h = Number(hStr);
    (Array.isArray(tasks) ? tasks : [tasks]).forEach((task) => {
      if (!task) return;
      const bed = task.bedId ? byId[task.bedId] : null;
      const plant = bed && task.plantId ? (bed.plants || []).find((p) => p.id === task.plantId) : null;
      const title = bed ? `${bed.label}${plant ? ` → ${plant.name}` : ""}${task.text ? ` — ${task.text}` : ""}` : (task.text || "");
      if (!title.trim()) return;
      const endH = Math.min(h + (task.hours || 1), 24);
      const dtend = endH >= 24 ? `${ymd}T235900` : `${ymd}T${p(endH)}0000`;
      lines.push("BEGIN:VEVENT", `UID:vsg-${ymd}-${h}@visualspam`, `DTSTAMP:${stamp}`,
        `DTSTART:${ymd}T${p(h)}0000`, `DTEND:${dtend}`,
        `SUMMARY:🌱 ${esc(title)}`, "END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function getAllFruits(regions) {
  const fruits = [];
  regions.forEach((r) => {
    (r.plants || []).forEach((p) => {
      (p.fruits || []).forEach((f) => {
        if (!f.done && f.deadline) {
          const d = new Date(f.deadline);
          const h = d.getHours();
          const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          fruits.push({ ...f, bedId: r.id, bedLabel: r.label, plantId: p.id, plantName: p.name, hour: h, dateKey: dk, deadline: d });
        }
      });
    });
  });
  return fruits;
}

export default function DaySchedule({ regions = [] }) {
  const today = dayKey(new Date());
  const storeKey = `vsg_schedule_${today}`;
  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const nowH = new Date().getHours();
  const todayFruits = useMemo(() => getAllFruits(regions).filter((f) => f.dateKey === today), [regions, today]);

  const [slots, setSlots] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey)) || {};
      // migrate: ensure each hour is an array
      const migrated = {};
      Object.entries(raw).forEach(([h, v]) => {
        migrated[h] = Array.isArray(v) ? v : v ? [v] : [];
      });
      return migrated;
    } catch (e) { return {}; }
  });
  const [active, setActive] = useState(null);

  const save = (next) => {
    setSlots(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const getTasks = (h) => slots[h] || [];
  const addTask = (h) => {
    const current = getTasks(h);
    save({ ...slots, [h]: [...current, { bedId: null, plantId: null, text: "" }] });
  };
  const updateTask = (h, idx, patch) => {
    const current = getTasks(h).map((t, i) => i === idx ? { ...t, ...patch } : t);
    save({ ...slots, [h]: current });
  };
  const removeTask = (h, idx) => {
    const current = getTasks(h).filter((_, i) => i !== idx);
    if (current.length === 0) { const n = { ...slots }; delete n[h]; save(n); }
    else save({ ...slots, [h]: current });
  };

  const planned = Object.values(slots).reduce((n, tasks) => n + (Array.isArray(tasks) ? tasks.filter((t) => t && (t.bedId || (t.text && t.text.trim()))).length : 0), 0);

  const syncToCalendar = () => {
    const ics = buildICS(slots, byId, new Date());
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visualspam-day-plan-${today}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="schedule">
      <header className="schedule-head">
        <div>
          <h1>Today's plan</h1>
          <p>Plan your hours. Add multiple tasks per slot. Fruits due today show automatically.</p>
        </div>
        <div className="schedule-head-right">
          <span className="schedule-count">{planned} tasks planned</span>
          <button className="sync-btn" onClick={syncToCalendar} disabled={planned === 0}>
            🗓️ Export .ics
          </button>
        </div>
      </header>

      {todayFruits.length > 0 && (
        <div className="fruit-deadlines-bar">
          <span className="fdb-label">🍊 Due today</span>
          {todayFruits.map((f) => (
            <span key={f.id} className="fdb-item">
              <span className="fdb-dot" style={{ background: threadById[byId[f.bedId]?.thread]?.color }} />
              {f.plantName} — {f.title}
            </span>
          ))}
        </div>
      )}

      <ol className="schedule-list">
        {HOURS.map((h) => {
          const tasks = getTasks(h);
          const editing = active === h;
          const filled = tasks.some((t) => t && (t.bedId || (t.text && t.text.trim())));
          const isNow = h === nowH;
          const dueFruit = todayFruits.find((f) => f.hour === h);

          return (
            <li key={h} className={`slot ${isNow ? "now" : ""} ${filled ? "filled" : ""} ${editing ? "editing" : ""}`}>
              <span className="slot-time">{fmtHour(h)}</span>

              {!editing ? (
                <button className="slot-summary" onClick={() => setActive(h)}>
                  {filled ? (
                    <div className="slot-tasks-preview">
                      {tasks.filter((t) => t && (t.bedId || t.text)).map((t, i) => {
                        const bed = t.bedId ? byId[t.bedId] : null;
                        const plant = bed && t.plantId ? (bed.plants || []).find((p) => p.id === t.plantId) : null;
                        const thread = bed ? threadById[bed.thread] : null;
                        return (
                          <span key={i} className="slot-task-chip">
                            {thread && <span className="slot-dot" style={{ background: thread.color }} />}
                            {bed && <b>{bed.label}</b>}
                            {plant && <span className="slot-plant-tag">→ {plant.name}</span>}
                            {t.text && <span className="slot-what">{t.text}</span>}
                          </span>
                        );
                      })}
                    </div>
                  ) : dueFruit ? (
                    <span className="slot-fruit-hint">
                      🍊 {dueFruit.plantName} — {dueFruit.title}
                    </span>
                  ) : (
                    <span className="slot-empty">+ plan this hour</span>
                  )}
                </button>
              ) : (
                <div className="slot-editor">
                  {tasks.map((task, idx) => {
                    const bed = task.bedId ? byId[task.bedId] : null;
                    const plant = bed && task.plantId ? (bed.plants || []).find((p) => p.id === task.plantId) : null;
                    return (
                      <div key={idx} className="task-row">
                        <div className="task-pickers">
                          <div className="pick-row">
                            {regions.map((r) => {
                              const rt = threadById[r.thread];
                              return (
                                <button key={r.id} className={`bed-chip ${task.bedId === r.id ? "on" : ""}`}
                                  style={{ "--rc": rt?.color }}
                                  onClick={() => updateTask(h, idx, { bedId: r.id, plantId: null })}>
                                  <span className="bed-chip-dot" style={{ background: rt?.color }} />{r.label}
                                </button>
                              );
                            })}
                          </div>

                          {bed && (bed.plants || []).length > 0 && (
                            <div className="pick-row plant-pick">
                              <span className="pick-label">plants</span>
                              {bed.plants.map((p) => (
                                <button key={p.id} className={`bed-chip plant-chip ${task.plantId === p.id ? "on" : ""}`}
                                  onClick={() => updateTask(h, idx, { plantId: task.plantId === p.id ? null : p.id })}>
                                  🌱 {p.name}
                                </button>
                              ))}
                            </div>
                          )}

                          <input className="slot-input" autoFocus={idx === 0} value={task.text || ""}
                            onChange={(e) => updateTask(h, idx, { text: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && setActive(null)}
                            placeholder="what will you do…" />
                        </div>
                        <button className="task-remove" onClick={() => { removeTask(h, idx); if (getTasks(h).length <= 1) setActive(null); }}>✕</button>
                      </div>
                    );
                  })}

                  <div className="editor-actions">
                    <button className="ed-add" onClick={() => addTask(h)}>+ Add task</button>
                    <button className="ed-done" onClick={() => setActive(null)}>done</button>
                    {tasks.length > 0 && <button className="ed-clear" onClick={() => { save({ ...slots, [h]: [] }); setActive(null); }}>clear</button>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
