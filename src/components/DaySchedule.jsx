import { useState, useMemo } from "react";
import { dayKey, threadById } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;
const EVENT_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };

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

function getTodayActivity(regions, today) {
  const byHour = {};
  regions.forEach((r) => {
    const thread = threadById[r.thread];
    (r.logs || []).forEach((l) => {
      const d = new Date(l.ts);
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (dk !== today) return;
      const h = d.getHours();
      if (!byHour[h]) byHour[h] = [];
      byHour[h].push({ ...l, regionId: r.id, regionLabel: r.label, color: thread?.color });
    });
  });
  return byHour;
}

export default function DaySchedule({ regions = [] }) {
  const today = dayKey(new Date());
  const storeKey = `vsg_schedule_${today}`;
  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const nowH = new Date().getHours();
  const todayFruits = useMemo(() => getAllFruits(regions).filter((f) => f.dateKey === today), [regions, today]);
  const todayActivity = useMemo(() => getTodayActivity(regions, today), [regions, today]);

  const [slots, setSlots] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey)) || {};
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

  const coverage = {};
  Object.entries(slots).forEach(([hs, tasks]) => {
    if (!Array.isArray(tasks)) return;
    const h0 = Number(hs);
    tasks.forEach((t) => {
      for (let k = 1; k < (t?.hours || 1); k++) if (h0 + k < 24) coverage[h0 + k] = h0;
    });
  });

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
        <div className="schedule-head-left">
          <h1>Today's plan</h1>
          <p>Plan your hours. Add multiple tasks per slot.</p>
        </div>
        <div className="schedule-head-right">
          <span className="schedule-count">{planned} planned</span>
          <button className="sync-btn" onClick={syncToCalendar} disabled={planned === 0}>
            📅 Export
          </button>
        </div>
      </header>

      {todayFruits.length > 0 && (
        <div className="fruit-bar">
          <div className="fruit-bar-header">
            <span className="fruit-bar-icon">🍊</span>
            <span className="fruit-bar-title">Due today</span>
          </div>
          <div className="fruit-bar-items">
            {todayFruits.map((f) => (
              <span key={f.id} className="fruit-pill">
                <span className="fruit-pill-dot" style={{ background: threadById[byId[f.bedId]?.thread]?.color }} />
                <span className="fruit-pill-bed">{f.plantName}</span>
                <span className="fruit-pill-name">{f.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ol className="schedule-list">
        {HOURS.map((h) => {
          const tasks = getTasks(h);
          const editing = active === h;
          const filled = tasks.some((t) => t && (t.bedId || (t.text && t.text.trim())));
          const isNow = h === nowH;
          const dueFruit = todayFruits.find((f) => f.hour === h);

          const hasCont = coverage[h] != null;
          const contSrc = hasCont ? (slots[coverage[h]] || []) : [];
          const contFirst = Array.isArray(contSrc) ? contSrc[0] : contSrc;
          const contBed = contFirst?.bedId ? byId[contFirst.bedId] : null;
          const contThread = contBed ? threadById[contBed.thread] : null;
          const hourActivity = todayActivity[h] || [];
          const hasActivity = hourActivity.length > 0;

          return (
            <li key={h} className={`slot ${isNow ? "now" : ""} ${filled ? "filled" : ""} ${editing ? "editing" : ""}`}>
              <span className="slot-time">{fmtHour(h)}</span>

              {!editing ? (
                <button className="slot-summary" onClick={() => setActive(h)}>
                  {filled ? (
                    <div className="slot-tasks">
                      {tasks.filter((t) => t && (t.bedId || t.text)).map((t, i) => {
                        const bed = t.bedId ? byId[t.bedId] : null;
                        const plant = bed && t.plantId ? (bed.plants || []).find((p) => p.id === t.plantId) : null;
                        const thread = bed ? threadById[bed.thread] : null;
                        const hours = t.hours || 1;
                        return (
                          <div key={i} className="slot-task">
                            {thread && <span className="slot-dot" style={{ background: thread.color }} />}
                            <span className="slot-task-main">
                              {bed && <span className="slot-task-bed">{bed.label}</span>}
                              {plant && <span className="slot-task-plant">→ {plant.name}</span>}
                              {t.text && <span className="slot-task-text">{t.text}</span>}
                            </span>
                            {hours > 1 && <span className="slot-task-dur">{hours}h</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : hasActivity ? (
                    <div className="slot-tasks">
                      {hourActivity.map((a, i) => (
                        <div key={i} className="slot-task">
                          <span className="slot-dot" style={{ background: a.color }} />
                          <span className="slot-task-main">
                            <span className="slot-task-bed">{a.regionLabel}</span>
                            <span className="slot-task-text">{EVENT_ICON[a.type] || "•"} {a.text}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : dueFruit ? (
                    <span className="slot-fruit">
                      <span className="slot-dot" style={{ background: "#e0a030" }} />
                      <span className="slot-fruit-text">{dueFruit.plantName} — {dueFruit.title}</span>
                    </span>
                  ) : (
                    <span className="slot-empty">+ plan this hour</span>
                  )}
                </button>
              ) : (
                <div className="slot-editor">
                  {hasCont && (
                    <button className="slot-continuation" onClick={() => setActive(coverage[h])} style={{ marginBottom: 6 }}>
                      {contThread && <span className="slot-dot" style={{ background: contThread.color }} />}
                      <span>↑ {contBed ? contBed.label : "continues"}</span>
                    </button>
                  )}

                  {tasks.map((task, idx) => {
                    const bed = task.bedId ? byId[task.bedId] : null;
                    const plant = bed && task.plantId ? (bed.plants || []).find((p) => p.id === task.plantId) : null;
                    return (
                      <div key={idx} className="task-row">
                        <div className="task-body">
                          <div className="task-chips">
                            {regions.map((r) => {
                              const rt = threadById[r.thread];
                              return (
                                <button key={r.id} className={`chip ${task.bedId === r.id ? "on" : ""}`}
                                  style={{ "--rc": rt?.color }}
                                  onClick={() => updateTask(h, idx, { bedId: r.id, plantId: null })}>
                                  <span className="chip-dot" style={{ background: rt?.color }} />
                                  {r.label}
                                </button>
                              );
                            })}
                          </div>

                          {bed && (bed.plants || []).length > 0 && (
                            <div className="task-chips task-chips-sub">
                              <span className="chip-label">plants</span>
                              {bed.plants.map((p) => (
                                <button key={p.id} className={`chip chip-sm ${task.plantId === p.id ? "on" : ""}`}
                                  onClick={() => updateTask(h, idx, { plantId: task.plantId === p.id ? null : p.id })}>
                                  🌱 {p.name}
                                </button>
                              ))}
                            </div>
                          )}

                          <input className="task-input" autoFocus={idx === 0} value={task.text || ""}
                            onChange={(e) => updateTask(h, idx, { text: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && setActive(null)}
                            placeholder="what will you do…" />

                          <div className="task-duration">
                            <span className="chip-label">duration</span>
                            <button className="dur-btn" onClick={() => updateTask(h, idx, { hours: Math.max(1, (task.hours || 1) - 1) })} disabled={(task.hours || 1) <= 1}>−</button>
                            <span className="dur-val">{task.hours || 1}h</span>
                            <button className="dur-btn" onClick={() => updateTask(h, idx, { hours: Math.min(24 - h, (task.hours || 1) + 1) })} disabled={h + (task.hours || 1) >= 24}>+</button>
                            {(task.hours || 1) > 1 && <span className="dur-until">→ {h + (task.hours || 1) >= 24 ? "24:00" : fmtHour(h + (task.hours || 1))}</span>}
                          </div>
                        </div>
                        <button className="task-remove" onClick={() => {
                          const future = getTasks(h).filter((_, i) => i !== idx);
                          removeTask(h, idx);
                          if (future.length === 0 && !hasCont) setActive(null);
                        }}>✕</button>
                      </div>
                    );
                  })}

                  <div className="editor-footer">
                    <button className="btn-add-task" onClick={() => addTask(h)}>+ Add task</button>
                    <div className="editor-footer-right">
                      {tasks.length > 0 && <button className="btn-text" onClick={() => { save({ ...slots, [h]: [] }); setActive(null); }}>clear</button>}
                      <button className="btn-done" onClick={() => setActive(null)}>done</button>
                    </div>
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
