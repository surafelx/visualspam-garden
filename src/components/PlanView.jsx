import { useState, useMemo, useEffect, useCallback } from "react";
import { dayKey, threadById, activityByDay } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;
const EVENT_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_SHORT = ["S","M","T","W","T","F","S"];

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(year, month) {
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

function dateKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function loadPlan(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key)) || {};
    const migrated = {};
    Object.entries(raw).forEach(([h, v]) => {
      migrated[h] = Array.isArray(v) ? v : v ? [v] : [];
    });
    return migrated;
  } catch { return {}; }
}

function savePlan(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function getAllFruits(regions) {
  const fruits = [];
  regions.forEach((r) => {
    (r.plants || []).forEach((p) => {
      (p.fruits || []).forEach((f) => {
        if (!f.done && f.deadline) {
          const d = new Date(f.deadline);
          const dk = dateKey(d);
          fruits.push({ ...f, bedId: r.id, bedLabel: r.label, plantId: p.id, plantName: p.name, dateKey: dk, color: threadById[r.thread]?.color });
        }
      });
    });
  });
  return fruits;
}

function DayPlanner({ regions, date, onLogSunshine }) {
  const dk = dateKey(date);
  const storeKey = `vsg_schedule_${dk}`;
  const byId = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r])), [regions]);
  const nowH = new Date().getHours();
  const isToday = dk === dateKey(new Date());
  const allFruits = useMemo(() => getAllFruits(regions), [regions]);
  const dayFruits = useMemo(() => allFruits.filter((f) => f.dateKey === dk), [allFruits, dk]);

  const [slots, setSlots] = useState(() => loadPlan(storeKey));
  const [active, setActive] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const save = (next) => { setSlots(next); savePlan(storeKey, next); };

  const getTasks = (h) => slots[h] || [];
  const addTask = (h) => save({ ...slots, [h]: [...getTasks(h), { bedId: null, plantId: null, text: "", hours: 1 }] });
  const updateTask = (h, idx, patch) => save({ ...slots, [h]: getTasks(h).map((t, i) => i === idx ? { ...t, ...patch } : t) });
  const removeTask = (h, idx) => {
    const next = getTasks(h).filter((_, i) => i !== idx);
    if (next.length === 0) { const n = { ...slots }; delete n[h]; save(n); }
    else save({ ...slots, [h]: next });
  };

  const completeTask = (h, idx) => {
    const task = getTasks(h)[idx];
    if (task?.bedId) {
      const hours = task.hours || 1;
      onLogSunshine(task.bedId, hours, task.plantId, task.text);
    }
    removeTask(h, idx);
  };

  const planned = Object.values(slots).reduce((n, tasks) =>
    n + (Array.isArray(tasks) ? tasks.filter((t) => t && (t.bedId || (t.text && t.text.trim()))).length : 0), 0);

  const coverage = {};
  Object.entries(slots).forEach(([hs, tasks]) => {
    if (!Array.isArray(tasks)) return;
    const h0 = Number(hs);
    tasks.forEach((t) => { for (let k = 1; k < (t?.hours || 1); k++) if (h0 + k < 24) coverage[h0 + k] = h0; });
  });

  return (
    <div className="plan-day">
      <div className="plan-day-header">
        <span className="plan-day-label">{DAY_NAMES[date.getDay()]}, {MONTH_NAMES[date.getMonth()]} {date.getDate()}</span>
        <span className="plan-day-count">{planned} planned</span>
      </div>

      {dayFruits.length > 0 && (
        <div className="plan-fruit-bar">
          {dayFruits.map((f) => (
            <span key={f.id} className="plan-fruit-pill">
              <span className="plan-fruit-dot" style={{ background: f.color }} />
              {f.plantName} — {f.title}
            </span>
          ))}
        </div>
      )}

      <ol className="plan-slots">
        {HOURS.map((h) => {
          const tasks = getTasks(h);
          const editing = active === h;
          const filled = tasks.some((t) => t && (t.bedId || (t.text && t.text.trim())));
          const isNow = isToday && h === nowH;
          const contSrc = coverage[h] != null ? (slots[coverage[h]] || []) : [];
          const contFirst = Array.isArray(contSrc) ? contSrc[0] : contSrc;
          const contBed = contFirst?.bedId ? byId[contFirst.bedId] : null;
          const dueFruit = dayFruits.find((f) => {
            const dh = new Date(f.deadline).getHours();
            return dh === h;
          });

          return (
            <li key={h} className={`plan-slot ${isNow ? "now" : ""} ${filled ? "filled" : ""} ${editing ? "editing" : ""} ${dragOver === h ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDragOver(h); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                try {
                  const data = JSON.parse(e.dataTransfer.getData("application/json"));
                  if (data.type === "bed") {
                    const newTask = { bedId: data.bedId, plantId: null, text: "", hours: 1 };
                    save({ ...slots, [h]: [...getTasks(h), newTask] });
                    setActive(h);
                  }
                } catch {}
              }}>
              <span className="plan-slot-time">{fmtHour(h)}</span>
              {!editing ? (
                <button className="plan-slot-btn" onClick={() => setActive(h)}>
                  {filled ? (
                    <div className="plan-slot-tasks">
                      {tasks.filter((t) => t && (t.bedId || t.text)).map((t, i) => {
                        const bed = t.bedId ? byId[t.bedId] : null;
                        const plant = bed && t.plantId ? (bed.plants || []).find((p) => p.id === t.plantId) : null;
                        const thread = bed ? threadById[bed.thread] : null;
                        return (
                          <div key={i} className="plan-task-row">
                            {thread && <span className="plan-dot" style={{ background: thread.color }} />}
                            <span className="plan-task-info">
                              {bed && <span className="plan-task-bed">{bed.label}</span>}
                              {plant && <span className="plan-task-plant">→ {plant.name}</span>}
                              {t.text && <span className="plan-task-text">{t.text}</span>}
                            </span>
                            {(t.hours || 1) > 1 && <span className="plan-task-dur">{t.hours}h</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : dueFruit ? (
                    <span className="plan-slot-fruit">
                      <span className="plan-dot" style={{ background: "#e0a030" }} />
                      {dueFruit.plantName} — {dueFruit.title}
                    </span>
                  ) : (
                    <span className="plan-slot-empty">+ plan</span>
                  )}
                </button>
              ) : (
                <div className="plan-editor">
                  {coverage[h] != null && contBed && (
                    <button className="plan-cont" onClick={() => setActive(coverage[h])}>
                      ↑ {contBed.label}
                    </button>
                  )}
                  {tasks.map((task, idx) => {
                    const bed = task.bedId ? byId[task.bedId] : null;
                    const plant = bed && task.plantId ? (bed.plants || []).find((p) => p.id === task.plantId) : null;
                    return (
                      <div key={idx} className="plan-editor-row">
                        <div className="plan-editor-body">
                          <div className="plan-chips">
                            {regions.map((r) => {
                              const rt = threadById[r.thread];
                              return (
                                <button key={r.id} className={`plan-chip ${task.bedId === r.id ? "on" : ""}`}
                                  style={{ "--rc": rt?.color }}
                                  onClick={() => updateTask(h, idx, { bedId: r.id, plantId: null })}>
                                  <span className="plan-chip-dot" style={{ background: rt?.color }} />
                                  {r.label}
                                </button>
                              );
                            })}
                          </div>
                          {bed && (bed.plants || []).length > 0 && (
                            <div className="plan-chips plan-chips-sub">
                              {bed.plants.map((p) => (
                                <button key={p.id} className={`plan-chip plan-chip-sm ${task.plantId === p.id ? "on" : ""}`}
                                  onClick={() => updateTask(h, idx, { plantId: task.plantId === p.id ? null : p.id })}>
                                  🌱 {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                          <input className="plan-input" autoFocus={idx === 0} value={task.text || ""}
                            onChange={(e) => updateTask(h, idx, { text: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && setActive(null)}
                            placeholder="what will you do…" />
                          <div className="plan-dur-row">
                            <button className="plan-dur-btn" onClick={() => updateTask(h, idx, { hours: Math.max(1, (task.hours || 1) - 1) })} disabled={(task.hours || 1) <= 1}>−</button>
                            <span className="plan-dur-val">{task.hours || 1}h</span>
                            <button className="plan-dur-btn" onClick={() => updateTask(h, idx, { hours: Math.min(24 - h, (task.hours || 1) + 1) })} disabled={h + (task.hours || 1) >= 24}>+</button>
                            {(task.hours || 1) > 1 && <span className="plan-dur-until">→ {fmtHour(h + (task.hours || 1))}</span>}
                          </div>
                        </div>
                        <div className="plan-editor-actions">
                          <button className="plan-complete-btn" onClick={() => completeTask(h, idx)} title="Log as sunshine">☀️</button>
                          <button className="plan-remove-btn" onClick={() => removeTask(h, idx)}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="plan-editor-footer">
                    <button className="plan-add-btn" onClick={() => addTask(h)}>+ task</button>
                    <button className="plan-done-btn" onClick={() => setActive(null)}>done</button>
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

// A week is an overview, not seven stacked day planners. Rendering a full
// 24-hour DayPlanner per column gave every day its own scrollbar and repeated
// the hour ruler seven times; at this width the times clipped to "00:0".
function WeekPlanner({ regions, weekStart, onPickDay }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const byId = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r])), [regions]);
  const allFruits = useMemo(() => getAllFruits(regions), [regions]);
  const todayKey = dateKey(new Date());

  const week = days.map((d) => {
    const dk = dateKey(d);
    const slots = loadPlan(`vsg_schedule_${dk}`);
    const items = Object.entries(slots)
      .flatMap(([h, tasks]) =>
        (Array.isArray(tasks) ? tasks : [])
          .filter((t) => t && (t.bedId || (t.text && t.text.trim())))
          .map((t) => ({ ...t, hour: Number(h) }))
      )
      .sort((a, b) => a.hour - b.hour);
    return { date: d, dk, items, fruits: allFruits.filter((f) => f.dateKey === dk) };
  });

  const planned = week.reduce((n, d) => n + d.items.length, 0);
  const last = days[6];

  return (
    <div className="plan-week">
      <div className="plan-day-header">
        <span className="plan-day-label">
          {MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} {weekStart.getDate()} — {MONTH_NAMES[last.getMonth()].slice(0, 3)} {last.getDate()}
        </span>
        <span className="plan-day-count">{planned} planned</span>
      </div>

      <div className="plan-week-grid">
        {week.map(({ date, dk, items, fruits }) => (
          <button
            key={dk}
            className={`plan-week-day ${dk === todayKey ? "today" : ""}`}
            onClick={() => onPickDay(date)}
            title={`Open ${DAY_NAMES[date.getDay()]} ${date.getDate()}`}
          >
            <span className="plan-week-head">
              <span className="plan-week-name">{DAY_NAMES[date.getDay()]}</span>
              <span className="plan-week-date">{date.getDate()}</span>
            </span>

            <span className="plan-week-items">
              {items.map((t, i) => {
                const bed = t.bedId ? byId[t.bedId] : null;
                const thread = bed ? threadById[bed.thread] : null;
                return (
                  <span key={i} className="plan-week-item">
                    <span className="plan-week-hour">{fmtHour(t.hour)}</span>
                    {thread && <span className="plan-dot" style={{ background: thread.color }} />}
                    <span className="plan-week-text">{bed ? bed.label : t.text}</span>
                  </span>
                );
              })}
              {fruits.map((f) => (
                <span key={f.id} className="plan-week-item plan-week-fruit">
                  <span className="plan-week-hour">due</span>
                  <span className="plan-week-text">{f.title}</span>
                </span>
              ))}
              {items.length === 0 && fruits.length === 0 && (
                <span className="plan-week-none">—</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MonthPlanner({ regions, year, month, onLogSunshine }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad out the final week so the grid's rules close instead of stopping mid-row
  while (cells.length % 7 !== 0) cells.push(null);

  const allFruits = useMemo(() => getAllFruits(regions), [regions]);
  const monthFruits = useMemo(() => {
    const map = {};
    allFruits.forEach((f) => {
      const dk = f.dateKey;
      if (!map[dk]) map[dk] = [];
      map[dk].push(f);
    });
    return map;
  }, [allFruits]);

  const [selectedDay, setSelectedDay] = useState(null);

  const monthFruitCount = useMemo(
    () => allFruits.filter((f) => {
      const d = new Date(f.deadline);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length,
    [allFruits, year, month]
  );

  return (
    <div className="plan-month">
      {/* the grid had no month or year on it at all */}
      <div className="plan-day-header">
        <span className="plan-day-label">{MONTH_NAMES[month]} {year}</span>
        <span className="plan-day-count">
          {monthFruitCount} due
        </span>
      </div>
      <div className="plan-month-grid">
        {DAY_SHORT.map((dn, i) => <div key={i} className="plan-month-header">{dn}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="plan-month-empty" />;
          const dk = dateKey(new Date(year, month, day));
          const isToday = dk === dateKey(new Date());
          const dayFruits = monthFruits[dk] || [];
          const isSelected = selectedDay === dk;
          return (
            <button key={dk} className={`plan-month-cell ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${dayFruits.length > 0 ? "has-fruits" : ""}`}
              onClick={() => setSelectedDay(isSelected ? null : dk)}>
              <span className="plan-month-day">{day}</span>
              {dayFruits.length > 0 && <span className="plan-month-fruits">🍊{dayFruits.length}</span>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="plan-month-detail">
          <DayPlanner regions={regions} date={new Date(selectedDay + "T12:00:00")} onLogSunshine={onLogSunshine} />
        </div>
      )}
    </div>
  );
}

function TrackView({ regions }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const activity = useMemo(() => activityByDay(regions), [regions]);
  const allFruits = useMemo(() => getAllFruits(regions), [regions]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad the final week so the grid's rules close instead of stopping mid-row
  while (cells.length % 7 !== 0) cells.push(null);

  const fruitByDay = useMemo(() => {
    const map = {};
    allFruits.forEach((f) => { if (!map[f.dateKey]) map[f.dateKey] = []; map[f.dateKey].push(f); });
    return map;
  }, [allFruits]);

  const stats = useMemo(() => {
    let totalSun = 0, totalActions = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = dateKey(new Date(year, month, d));
      const a = activity[dk];
      if (a) { totalSun += a.mins || 0; totalActions += a.count || 0; }
    }
    return { totalSun, totalActions };
  }, [year, month, daysInMonth, activity]);

  const prevMonth = () => { if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1); };

  const selectedActivity = selectedDay ? activity[selectedDay] : null;
  const selectedFruits = selectedDay ? (fruitByDay[selectedDay] || []) : [];

  return (
    <div className="plan-track">
      <div className="track-nav">
        <button className="track-arrow" onClick={prevMonth}>←</button>
        <span className="track-title">{MONTH_NAMES[month]} {year}</span>
        <button className="track-arrow" onClick={nextMonth}>→</button>
      </div>

      {(stats.totalSun > 0 || stats.totalActions > 0) && (
        <div className="track-stats">
          {stats.totalSun > 0 && <span className="track-stat">☀️ {stats.totalSun}m</span>}
          {stats.totalActions > 0 && <span className="track-stat">💧 {stats.totalActions} actions</span>}
        </div>
      )}

      <div className="track-grid">
        {DAY_SHORT.map((dn, i) => <div key={i} className="track-header">{dn}</div>)}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="track-cell empty" />;
          const dk = dateKey(new Date(year, month, day));
          const a = activity[dk];
          const dayFruits = fruitByDay[dk] || [];
          const isToday = dk === dateKey(new Date());
          const isSelected = selectedDay === dk;
          return (
            <button key={dk} className={`track-cell ${(a || dayFruits.length > 0) ? "has-data" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedDay(isSelected ? null : dk)}>
              <span className="track-day">{day}</span>
              {dayFruits.length > 0 && <span className="track-fruits">🍊</span>}
              {a && a.mins > 0 && <span className="track-sun">☀️{a.mins}</span>}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="track-detail">
          <div className="track-detail-head">
            <span className="track-detail-date">{new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
            {selectedActivity && (
              <span className="track-detail-stats">
                {selectedActivity.mins > 0 && <span>☀️ {selectedActivity.mins}m</span>}
                {selectedActivity.count > 0 && <span>💧 {selectedActivity.count}</span>}
              </span>
            )}
          </div>

          {selectedFruits.length > 0 && (
            <div className="track-detail-section">
              <h4>🍊 Fruits due</h4>
              {selectedFruits.map((f, i) => (
                <div key={i} className="track-detail-row">
                  <span className="track-detail-dot" style={{ background: f.color }} />
                  <span>{f.plantName} — {f.title}</span>
                </div>
              ))}
            </div>
          )}

          {selectedActivity && selectedActivity.items.length > 0 && (
            <div className="track-detail-section">
              <h4>Activity</h4>
              {[...selectedActivity.items].sort((a, b) => new Date(b.ts) - new Date(a.ts)).map((item, i) => (
                <div key={i} className="track-detail-row">
                  <span>{EVENT_ICON[item.type] || "•"}</span>
                  <span className="track-detail-text">{item.text}</span>
                  {item.region && <span className="track-detail-region">{item.region}</span>}
                </div>
              ))}
            </div>
          )}

          {!selectedActivity && selectedFruits.length === 0 && (
            <div className="track-detail-empty">No activity this day</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlanView({ regions, onGrow }) {
  const [mode, setMode] = useState("plan");
  const [planTab, setPlanTab] = useState("day");
  const today = new Date();
  const [viewDate, setViewDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getWeekRange(today).start);
  const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const onLogSunshine = useCallback((regionId, hours, plantId, text) => {
    const note = text ? `${hours}h planned — ${text}` : `${hours}h planned`;
    onGrow(regionId, { type: "sun", text: note, mins: hours * 60 });
  }, [onGrow]);

  const goToday = () => {
    const now = new Date();
    setViewDate(now);
    setWeekStart(getWeekRange(now).start);
    setMonthYear({ year: now.getFullYear(), month: now.getMonth() });
  };

  const planTabs = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
  ];

  return (
    <div className="plan-view">
      <header className="plan-head">
        <div className="plan-head-left">
          <h1>Plan & Track</h1>
        </div>
        <div className="plan-head-right">
          <div className="plan-mode-tabs">
            <button className={`plan-mode-tab ${mode === "plan" ? "on" : ""}`} onClick={() => setMode("plan")}>Plan</button>
            <button className={`plan-mode-tab ${mode === "track" ? "on" : ""}`} onClick={() => setMode("track")}>Track</button>
          </div>
        </div>
      </header>

      {mode === "plan" ? (
        <>
          <div className="plan-tabs">
            {planTabs.map((t) => (
              <button key={t.id} className={`plan-tab ${planTab === t.id ? "on" : ""}`} onClick={() => setPlanTab(t.id)}>{t.label}</button>
            ))}
            <button className="plan-today-btn" onClick={goToday}>Today</button>
          </div>

          {planTab === "day" && (
            <DayPlanner regions={regions} date={viewDate} onLogSunshine={onLogSunshine} />
          )}
          {planTab === "week" && (
            <WeekPlanner
              regions={regions}
              weekStart={weekStart}
              onPickDay={(d) => { setViewDate(d); setPlanTab("day"); }}
            />
          )}
          {planTab === "month" && (
            <MonthPlanner regions={regions} year={monthYear.year} month={monthYear.month} onLogSunshine={onLogSunshine} />
          )}
        </>
      ) : (
        <TrackView regions={regions} />
      )}
    </div>
  );
}
