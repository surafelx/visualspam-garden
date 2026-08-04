import { useState } from "react";
import { dayKey } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

// A simple 24-hour desired-schedule for the day. Stored per-day in localStorage
// so tomorrow starts fresh. (Client-only; doesn't touch the server.)
export default function DaySchedule() {
  const today = dayKey(new Date());
  const storeKey = `vsg_schedule_${today}`;
  const [slots, setSlots] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storeKey)) || {}; } catch (e) { return {}; }
  });
  const nowH = new Date().getHours();

  const set = (h, v) => {
    const next = { ...slots, [h]: v };
    setSlots(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };

  const planned = Object.values(slots).filter((v) => v && v.trim()).length;

  return (
    <div className="schedule">
      <header className="schedule-head">
        <div>
          <h1>Today's plan</h1>
          <p>Set what you'd like to do, hour by hour.</p>
        </div>
        <span className="schedule-count">{planned} / 24 planned</span>
      </header>
      <ol className="schedule-list">
        {HOURS.map((h) => (
          <li key={h} className={`slot ${h === nowH ? "now" : ""} ${slots[h] && slots[h].trim() ? "filled" : ""}`}>
            <span className="slot-time">{fmtHour(h)}</span>
            <input
              className="slot-input"
              value={slots[h] || ""}
              onChange={(e) => set(h, e.target.value)}
              placeholder="—"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
