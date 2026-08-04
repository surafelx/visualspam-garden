import { useState, useMemo, useEffect } from "react";
import { activityByDay, dayKey, threadById } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const MONTH_SPRITE = {
  0: "snow", 1: "snow", 2: "sprout", 3: "sprout",
  4: "flower", 5: "flower", 6: "flower", 7: "flower",
  8: "leaf", 9: "leaf", 10: "tuft", 11: "snow",
};

const EVENT_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
const EVENT_GROUP = { sun: "Sunshine", water: "Water", note: "Notes", grow: "Growth", checkin: "Check-in" };
const GROUP_ORDER = ["sun", "water", "note", "grow", "checkin"];

const HEADER_PLANTS = [
  { kind: "tuft", x: 5 }, { kind: "daisy", x: 15 }, { kind: "flower", x: 28 },
  { kind: "tuft", x: 42 }, { kind: "daisy", x: 55 }, { kind: "flower", x: 68 },
  { kind: "tuft", x: 80 }, { kind: "daisy", x: 92 },
];

function CalendarGrid({ year, month, activity, onSelectDay, selectedDay }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const { maxSun, maxActions } = useMemo(() => {
    let ms = 1, ma = 1;
    cells.forEach((day) => {
      if (!day) return;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const a = activity[key];
      if (a) {
        if (a.mins > ms) ms = a.mins;
        if (a.count > ma) ma = a.count;
      }
    });
    return { maxSun: ms, maxActions: ma };
  }, [year, month, activity]);

  return (
    <div className="cal-grid">
      {DAY_NAMES.map((dn) => (
        <div key={dn} className="cal-header">{dn}</div>
      ))}
      {cells.map((day, i) => {
        if (day === null) return <div key={`empty-${i}`} className="cal-cell empty" />;
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const a = activity[key];
        const isSelected = selectedDay === key;
        const isToday = key === dayKey(new Date());
        const sunH = a && a.mins > 0 ? Math.max(10, (a.mins / maxSun) * 28) : 0;
        const actH = a && a.count > 0 ? Math.max(10, (a.count / maxActions) * 28) : 0;
        return (
          <button key={key}
            className={`cal-cell ${a ? "has-activity" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
            onClick={() => onSelectDay(key)}>
            <span className="cal-day">{day}</span>
            {a && (sunH > 0 || actH > 0) && (
              <span className="cal-bars">
                {sunH > 0 && <span className="bar sun" style={{ height: `${sunH}px` }} title={`${a.mins}m sunshine`} />}
                {actH > 0 && <span className="bar act" style={{ height: `${actH}px` }} title={`${a.count} actions`} />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Heatmap({ year, month, activity }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const vals = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const a = activity[key];
    vals.push(a ? a.mins + a.count * 2 : 0);
  }
  const max = Math.max(...vals, 1);

  return (
    <div className="cal-heatmap">
      {vals.map((v, i) => {
        const intensity = v / max;
        const bg = v === 0
          ? "rgba(0,0,0,0.04)"
          : `rgba(${160 + 80 * intensity}, ${130 + 80 * intensity}, ${40 + 30 * intensity}, ${0.15 + intensity * 0.7})`;
        return <span key={i} className="heat-cell" style={{ background: bg }} title={`${i + 1}: ${v > 0 ? v : "no"} activity`} />;
      })}
    </div>
  );
}

function MonthSummary({ year, month, activity }) {
  const stats = useMemo(() => {
    let totalSun = 0, totalActions = 0, busiestDay = { day: 0, count: 0 };
    const regionCount = {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const a = activity[key];
      if (!a) continue;
      totalSun += a.mins || 0;
      totalActions += a.count || 0;
      if (a.count > busiestDay.count) busiestDay = { day: d, count: a.count };
      a.items.forEach((item) => {
        if (item.region) regionCount[item.region] = (regionCount[item.region] || 0) + 1;
      });
    }

    let topRegion = null, topCount = 0;
    Object.entries(regionCount).forEach(([r, c]) => { if (c > topCount) { topRegion = r; topCount = c; } });

    return { totalSun, totalActions, busiestDay, topRegion };
  }, [year, month, activity]);

  if (stats.totalActions === 0) return null;

  return (
    <div className="cal-summary">
      {stats.totalSun > 0 && <span className="summary-stat sun">☀️ {stats.totalSun}m sunshine</span>}
      {stats.totalActions > 0 && <span className="summary-stat">💧 {stats.totalActions} action{stats.totalActions !== 1 ? "s" : ""}</span>}
      {stats.busiestDay.day > 0 && <span className="summary-stat">📅 Busiest: {stats.busiestDay.day}</span>}
      {stats.topRegion && <span className="summary-stat">🌱 Most tended: {stats.topRegion}</span>}
    </div>
  );
}

function DayModal({ dk, activity: a, onClose }) {
  const [expanded, setExpanded] = useState(false);
  const [, m, d] = dk.split("-");
  const dateLabel = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!a) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="day-modal empty-day" onClick={(e) => e.stopPropagation()}>
          <button className="day-modal-close" onClick={onClose}>✕</button>
          <div className="day-modal-header">
            <span className="day-modal-date">{dateLabel}</span>
          </div>
          <div className="day-empty-state">
            <PixelSprite kind="seed" color="#a39a86" size={40} />
            <p>A quiet day in the garden</p>
          </div>
        </div>
      </div>
    );
  }

  const items = [...a.items].sort((x, y) => new Date(y.ts) - new Date(x.ts));

  // group by type
  const groups = {};
  items.forEach((item) => {
    const g = item.type || "note";
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  const shownGroups = expanded ? GROUP_ORDER : GROUP_ORDER.slice(0, 3);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="day-modal" onClick={(e) => e.stopPropagation()}>
        <button className="day-modal-close" onClick={onClose}>✕</button>
        <div className="day-modal-header">
          <span className="day-modal-date">{dateLabel}</span>
          <span className="day-modal-stats">
            {a.mins > 0 && <span className="dm-stat sun">☀️ {a.mins}m</span>}
            {a.count > 0 && <span className="dm-stat">💧 {a.count}</span>}
          </span>
        </div>

        <div className="day-modal-groups">
          {shownGroups.map((gType) => {
            const gItems = groups[gType];
            if (!gItems || gItems.length === 0) return null;
            return (
              <div key={gType} className="dm-group">
                <h4 className="dm-group-title">{EVENT_ICON[gType]} {EVENT_GROUP[gType]}</h4>
                <ul className="dm-group-list">
                  {gItems.map((item, i) => {
                    const t = new Date(item.ts);
                    const hh = String(t.getHours()).padStart(2, "0");
                    const mm = String(t.getMinutes()).padStart(2, "0");
                    const thread = item.region ? Object.values(threadById).find((th) => th.name === item.region) : null;
                    return (
                      <li key={i} className="dm-entry">
                        {thread && <span className="dm-dot" style={{ background: thread.color }} />}
                        <span className="dm-text">{item.text}</span>
                        {item.region && <span className="dm-region">{item.region}</span>}
                        <span className="dm-time">{hh}:{mm}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {GROUP_ORDER.filter((g) => groups[g]).length > 3 && (
          <button className="day-expand" onClick={() => setExpanded(!expanded)}>
            {expanded ? "show less" : `show ${GROUP_ORDER.filter((g) => groups[g]).length - 3} more groups`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CalendarView({ regions, view, checkins = [] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const activity = activityByDay(regions, checkins);

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const goToMonth = (y, m) => {
    setTransitioning(true);
    setTimeout(() => {
      setYear(y);
      setMonth(m);
      setSelectedDay(null);
      setTransitioning(false);
    }, 150);
  };

  const prevMonth = () => {
    if (month === 0) goToMonth(year - 1, 11);
    else goToMonth(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 11) goToMonth(year + 1, 0);
    else goToMonth(year, month + 1);
  };
  const goToday = () => goToMonth(now.getFullYear(), now.getMonth());

  // keyboard nav
  useEffect(() => {
    if (view !== "calendar") return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") prevMonth();
      if (e.key === "ArrowRight") nextMonth();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [view, month, year]);

  const selectedActivity = selectedDay ? activity[selectedDay] : null;

  return (
    <div className="calendar">
      <header className="cal-head">
        <h1>Timeline</h1>
        <p>Your garden's memory. Every tending action, recorded.</p>
      </header>

      {/* pixel art fence border */}
      <div className="cal-fence">
        {HEADER_PLANTS.map((p, i) => (
          <span key={i} className="fence-plant" style={{ left: `${p.x}%` }}>
            <PixelSprite kind={p.kind} color="#8fe39a" size={16} />
          </span>
        ))}
      </div>

      <div className="cal-nav">
        <button className="cal-arrow" onClick={prevMonth}>←</button>
        <div className="cal-title-row">
          <span className="cal-month-icon"><PixelSprite kind={MONTH_SPRITE[month]} size={20} /></span>
          <span className="cal-title">{MONTH_NAMES[month]} {year}</span>
          {!isCurrentMonth && <button className="cal-today" onClick={goToday}>Today</button>}
        </div>
        <button className="cal-arrow" onClick={nextMonth}>→</button>
      </div>

      <MonthSummary year={year} month={month} activity={activity} />

      <div className={`cal-grid-wrap ${transitioning ? "fade" : ""}`}>
        <CalendarGrid year={year} month={month} activity={activity}
          onSelectDay={(k) => setSelectedDay(k === selectedDay ? null : k)}
          selectedDay={selectedDay} />
      </div>

      <Heatmap year={year} month={month} activity={activity} />

      <div className="cal-legend">
        <span className="cal-legend-item"><span className="bar-legend sun" /> sunshine</span>
        <span className="cal-legend-item"><span className="bar-legend act" /> actions</span>
      </div>

      {selectedDay && (
        <DayModal dk={selectedDay} activity={selectedActivity} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
