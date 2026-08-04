import { useState } from "react";
import { dayKey, threadById } from "../data.js";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

// Build an .ics calendar file from the planned slots (one 1-hour event each).
function buildICS(slots, byId, date) {
  const p = (n) => String(n).padStart(2, "0");
  const ymd = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
  const stamp = `${ymd}T${p(date.getHours())}${p(date.getMinutes())}00`;
  const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VisualSpam//Garden//EN", "CALSCALE:GREGORIAN"];
  Object.entries(slots).forEach(([hStr, slot]) => {
    const h = Number(hStr);
    const bed = slot?.bedId ? byId[slot.bedId] : null;
    const ms = bed?.milestones?.find((m) => m.id === slot?.milestoneId);
    const title = bed ? `${bed.label}${ms ? ` — ${ms.title}` : slot.text ? ` — ${slot.text}` : ""}` : (slot?.text || "");
    if (!title.trim()) return;
    const endH = Math.min(h + (slot.hours || 1), 24);
    const dtend = endH >= 24 ? `${ymd}T235900` : `${ymd}T${p(endH)}0000`;
    lines.push("BEGIN:VEVENT", `UID:vsg-${ymd}-${h}@visualspam`, `DTSTAMP:${stamp}`,
      `DTSTART:${ymd}T${p(h)}0000`, `DTEND:${dtend}`,
      `SUMMARY:🌱 ${esc(title)}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

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

  // hours spanned by a longer task → the hour it continues from
  const coverage = {};
  Object.entries(slots).forEach(([hs, s]) => {
    const h0 = Number(hs);
    for (let k = 1; k < (s?.hours || 1); k++) if (h0 + k < 24) coverage[h0 + k] = h0;
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
        <div>
          <h1>Today's plan</h1>
          <p>Pick a bed, a milestone to move, and what you'll do — hour by hour.</p>
        </div>
        <div className="schedule-head-right">
          <span className="schedule-count">{planned} / 24 planned</span>
          <button className="sync-btn" onClick={syncToCalendar} disabled={planned === 0} title="Download an .ics to import into your calendar">
            🗓️ Sync to calendar
          </button>
        </div>
      </header>

      <ol className="schedule-list">
        {HOURS.map((h) => {
          const slot = slots[h];
          const bed = slot?.bedId ? byId[slot.bedId] : null;
          const t = bed ? threadById[bed.thread] : null;
          const ms = bed?.milestones?.find((m) => m.id === slot?.milestoneId);
          const editing = active === h;
          const filled = !!(slot && (bed || (slot.text && slot.text.trim())));
          const hours = slot?.hours || 1;

          // this hour is spanned by a longer task above it → show a continuation
          if (coverage[h] != null && !filled && active !== h) {
            const ps = slots[coverage[h]];
            const pb = ps?.bedId ? byId[ps.bedId] : null;
            const pt = pb ? threadById[pb.thread] : null;
            return (
              <li key={h} className={`slot cont ${h === nowH ? "now" : ""}`}>
                <span className="slot-time">{fmtHour(h)}</span>
                <span className="slot-cont" onClick={() => setActive(coverage[h])}>
                  {pt && <span className="slot-dot" style={{ background: pt.color }} />}
                  <i>↑ {pb ? pb.label : "continues"}</i>
                </span>
              </li>
            );
          }

          return (
            <li key={h} className={`slot ${h === nowH ? "now" : ""} ${filled ? "filled" : ""} ${editing ? "editing" : ""}`}>
              <span className="slot-time">{fmtHour(h)}</span>

              {!editing ? (
                <button className="slot-summary" onClick={() => setActive(h)}>
                  {filled ? (
                    <>
                      {t && <span className="slot-dot" style={{ background: t.color }} />}
                      {bed && <b>{bed.label}</b>}
                      {ms ? <span className="slot-what">🎯 {ms.title}</span>
                        : slot.text ? <span className="slot-what">{slot.text}</span> : null}
                      {hours > 1 && <span className="slot-dur">{fmtHour(h)}–{h + hours >= 24 ? "24:00" : fmtHour(h + hours)}</span>}
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
                          🎯 {m.title}
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

                  <div className="pick-row dur-row">
                    <span className="pick-label">duration</span>
                    <button className="dur-btn" onClick={() => patch(h, { hours: Math.max(1, hours - 1) })} disabled={hours <= 1}>−</button>
                    <span className="dur-val">{hours}h</span>
                    <button className="dur-btn" onClick={() => patch(h, { hours: Math.min(24 - h, hours + 1) })} disabled={h + hours >= 24}>+</button>
                    <span className="dur-until">{hours > 1 ? `until ${h + hours >= 24 ? "24:00" : fmtHour(h + hours)}` : ""}</span>
                  </div>

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
