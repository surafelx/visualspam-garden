import { useState } from "react";
import { dayKey, threadById } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

// A 24-hour desired-schedule for the day. Each slot can target a bed, one of
// that bed's milestones, and/or a free-text intention. Saved per-day locally.
export default function DaySchedule({ regions = [] }) {
  const today = dayKey(new Date());
  const storeKey = `vsg_schedule_${today}`;
  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const nowH = new Date().getHours();

  const [slots, setSlots] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storeKey)) || {}; } catch (e) { return {}; }
  });
  const [active, setActive] = useState(null); // hour being edited

  const save = (next) => {
    setSlots(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch (e) { /* ignore */ }
  };
  const patch = (h, p) => save({ ...slots, [h]: { ...(slots[h] || {}), ...p } });
  const clear = (h) => { const n = { ...slots }; delete n[h]; save(n); };

  const planned = Object.values(slots).filter((s) => s && (s.bedId || (s.text && s.text.trim()))).length;

  return (
    <div className="schedule">
      <header className="schedule-head">
        <div>
          <h1>Today's plan</h1>
          <p>Pick a bed, a milestone to move, and what you'll do — hour by hour.</p>
        </div>
        <span className="schedule-count">{planned} / 24 planned</span>
      </header>

      <ol className="schedule-list">
        {HOURS.map((h) => {
          const slot = slots[h];
          const bed = slot?.bedId ? byId[slot.bedId] : null;
          const t = bed ? threadById[bed.thread] : null;
          const ms = bed?.milestones?.find((m) => m.id === slot?.milestoneId);
          const editing = active === h;
          const filled = !!(slot && (bed || (slot.text && slot.text.trim())));

          return (
            <li key={h} className={`slot ${h === nowH ? "now" : ""} ${filled ? "filled" : ""} ${editing ? "editing" : ""}`}>
              <span className="slot-time">{fmtHour(h)}</span>

              {!editing ? (
                <button className="slot-summary" onClick={() => setActive(h)}>
                  {filled ? (
                    <>
                      {t && <span className="slot-dot" style={{ background: t.color }} />}
                      {bed && <b>{bed.label}</b>}
                      {ms ? <span className="slot-what">🎯 {ms.name}</span>
                        : slot.text ? <span className="slot-what">{slot.text}</span> : null}
                    </>
                  ) : (
                    <span className="slot-empty">+ plan this hour</span>
                  )}
                </button>
              ) : (
                <div className="slot-editor">
                  <div className="pick-row">
                    {regions.map((r) => {
                      const rt = threadById[r.thread];
                      return (
                        <button key={r.id} className={`bed-chip ${slot?.bedId === r.id ? "on" : ""}`}
                          style={{ "--rc": rt?.color }}
                          onClick={() => patch(h, { bedId: r.id, milestoneId: null })}>
                          <span className="bed-chip-dot" style={{ background: rt?.color }} />{r.label}
                        </button>
                      );
                    })}
                  </div>

                  {bed && (bed.milestones || []).filter((m) => !m.done).length > 0 && (
                    <div className="pick-row ms-pick">
                      <span className="pick-label">milestones</span>
                      {bed.milestones.filter((m) => !m.done).map((m) => (
                        <button key={m.id} className={`ms-chip ${slot?.milestoneId === m.id ? "on" : ""}`}
                          onClick={() => patch(h, { milestoneId: slot?.milestoneId === m.id ? null : m.id })}>
                          🎯 {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {bed && (bed.milestones || []).filter((m) => !m.done).length === 0 && (
                    <div className="pick-row"><span className="pick-empty">no open milestones for {bed.label}</span></div>
                  )}

                  <input className="slot-input" autoFocus value={slot?.text || ""}
                    onChange={(e) => patch(h, { text: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && setActive(null)}
                    placeholder="what will you do…" />

                  <div className="editor-actions">
                    <button className="ed-done" onClick={() => setActive(null)}>done</button>
                    {slot && <button className="ed-clear" onClick={() => { clear(h); setActive(null); }}>clear</button>}
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
