import { useState, useMemo } from "react";
import { threadById } from "../data.js";

const DAY_MS = 864e5;

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}`; }
function fmtShort(d) { const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; return `${days[d.getDay()]} ${d.getDate()}`; }

function statusColor(deadline, done) {
  if (done) return "#4c9a63";
  const diff = deadline - Date.now();
  if (diff < 0) return "#c0392b";
  if (diff < 2 * DAY_MS) return "#e0a84a";
  return "#6a9bd2";
}

function statusLabel(deadline, done) {
  if (done) return "done";
  const diff = deadline - Date.now();
  if (diff < 0) return "overdue";
  if (diff < DAY_MS) return "today";
  if (diff < 2 * DAY_MS) return "tomorrow";
  return `${Math.ceil(diff / DAY_MS)}d`;
}

export default function RoadmapView({ regions, onSelectBed }) {
  const today = startOfDay(new Date());
  const [rangeDays, setRangeDays] = useState(28);

  const fruits = useMemo(() => {
    const items = [];
    for (const r of regions) {
      for (const p of r.plants || []) {
        for (const f of p.fruits || []) {
          if (!f.deadline) continue;
          const dl = new Date(f.deadline);
          items.push({
            id: f.id,
            fruit: f.title || "Untitled",
            plant: p.name || "Unknown plant",
            bedId: r.id,
            bed: r.label,
            thread: r.thread,
            deadline: dl.getTime(),
            done: !!f.done,
          });
        }
      }
    }
    return items.sort((a, b) => a.deadline - b.deadline);
  }, [regions]);

  const rangeEnd = addDays(today, rangeDays);

  const overdue = fruits.filter((f) => !f.done && f.deadline < today.getTime());
  const dueSoon = fruits.filter((f) => !f.done && f.deadline >= today.getTime() && f.deadline - today.getTime() < 3 * DAY_MS);
  const upcoming = fruits.filter((f) => !f.done && f.deadline >= today.getTime() + 3 * DAY_MS);

  const dayHeaders = [];
  for (let i = 0; i < rangeDays; i++) {
    const d = addDays(today, i);
    if (i === 0 || d.getDay() === 1) {
      dayHeaders.push({ date: d, index: i });
    }
  }

  return (
    <section className="roadmap">
      <div className="roadmap-head">
        <div className="roadmap-head-left">
          <h1>Roadmap</h1>
          <p>{fruits.length} fruits · {fruits.filter((f) => !f.done).length} pending</p>
        </div>
        <div className="roadmap-head-right">
          <div className="roadmap-range-btns">
            {[14, 28, 56, 90].map((d) => (
              <button key={d} className={`roadmap-range-btn${rangeDays === d ? " on" : ""}`} onClick={() => setRangeDays(d)}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {(overdue.length > 0 || dueSoon.length > 0) && (
        <div className="roadmap-alerts">
          {overdue.length > 0 && (
            <div className="roadmap-alert roadmap-alert-overdue">
              <span className="roadmap-alert-icon">⚠</span>
              <span className="roadmap-alert-text">
                {overdue.length} overdue: {overdue.map((f) => `${f.fruit} in ${f.bed}`).join(", ")}
              </span>
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="roadmap-alert roadmap-alert-soon">
              <span className="roadmap-alert-icon">⏰</span>
              <span className="roadmap-alert-text">
                {dueSoon.length} due soon: {dueSoon.map((f) => `${f.fruit} · ${fmtShort(new Date(f.deadline))}`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {fruits.length === 0 ? (
        <div className="roadmap-empty-wrap">
          <div className="roadmap-empty-icon">🎯</div>
          <p>No fruits with deadlines yet.</p>
          <p className="roadmap-empty-sub">Add fruits to your plants and set deadlines to track them here.</p>
        </div>
      ) : (
        <div className="roadmap-timeline">
          <div className="roadmap-headers">
            <div className="roadmap-label-col">Fruit</div>
            <div className="roadmap-bar-col">
              <div className="roadmap-day-headers">
                {dayHeaders.map(({ date, index }) => (
                  <div
                    key={index}
                    className="roadmap-day-hdr"
                    style={{ left: `${(index / rangeDays) * 100}%` }}
                  >
                    <span className="roadmap-day-label">{fmt(date)}</span>
                    <span className="roadmap-day-wk">{["S", "M", "T", "W", "T", "F", "S"][date.getDay()]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="roadmap-rows">
            {fruits.map((f) => {
              const t = threadById[f.thread];
              const offsetDays = Math.max(0, (f.deadline - today.getTime()) / DAY_MS);
              const pos = Math.min(100, (offsetDays / rangeDays) * 100);
              const color = statusColor(f.deadline, f.done);
              const label = statusLabel(f.deadline, f.done);
              const isOverdue = !f.done && f.deadline < today.getTime();
              return (
                <div key={f.id} className={`roadmap-row${f.done ? " done" : ""}${isOverdue ? " overdue" : ""}`}>
                  <div className="roadmap-row-label" onClick={() => onSelectBed(f.bedId)}>
                    <span className="roadmap-row-dot" style={{ background: t?.color || "#8fe39a" }} />
                    <span className="roadmap-row-info">
                      <span className="roadmap-row-fruit">{f.fruit}</span>
                      <span className="roadmap-row-meta">{f.bed} → {f.plant}</span>
                    </span>
                  </div>
                  <div className="roadmap-row-bar">
                    <div className="roadmap-today-line" />
                    <div
                      className="roadmap-dot"
                      style={{ left: `${pos}%`, background: color }}
                      title={`${f.fruit} — ${label}`}
                    />
                    {f.done && (
                      <div className="roadmap-done-mark" style={{ left: `${pos}%` }}>✓</div>
                    )}
                  </div>
                  <div className="roadmap-row-status">
                    <span className="roadmap-status-badge" style={{ color, borderColor: color }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="roadmap-legend">
          <span className="roadmap-legend-item"><span className="roadmap-legend-dot" style={{ background: "#4c9a63" }} /> done</span>
          <span className="roadmap-legend-item"><span className="roadmap-legend-dot" style={{ background: "#c0392b" }} /> overdue</span>
          <span className="roadmap-legend-item"><span className="roadmap-legend-dot" style={{ background: "#e0a84a" }} /> due soon</span>
          <span className="roadmap-legend-item"><span className="roadmap-legend-dot" style={{ background: "#6a9bd2" }} /> upcoming</span>
        </div>
      )}
    </section>
  );
}
