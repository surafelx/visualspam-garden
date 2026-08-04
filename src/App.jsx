import { useState, useEffect, useCallback } from "react";
import { STAGE_ORDER, GROWTH_PER_STAGE, STAGES, threadById, timeAgo, dayKey } from "./data.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
import * as api from "./api.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";
import CalendarView from "./components/CalendarView.jsx";
import DaySchedule from "./components/DaySchedule.jsx";
import DurationPicker from "./components/DurationPicker.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";
import BedForm from "./components/BedForm.jsx";
import GardenAnalysis from "./components/GardenAnalysis.jsx";

export default function App() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch data from API
  const refetchRegions = useCallback(async () => {
    const data = await api.fetchRegions();
    setRegions(data);
  }, []);

  useEffect(() => {
    api.fetchRegions()
      .then((r) => setRegions(r))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("garden");
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // timer: "idle" | "picking" | "countdown"
  const [timerPhase, setTimerPhase] = useState("idle");
  const [timerRegionId, setTimerRegionId] = useState(null);
  const [timerMins, setTimerMins] = useState(0);

  // grow a region locally after API mutation
  const applyGrow = (regionData) => {
    setRegions((rs) => rs.map((r) => r.id === regionData.id ? regionData : r));
  };

  const grow = async (id, log, extra = {}) => {
    const region = regions.find((r) => r.id === id);
    if (!region) return;
    const nowIso = new Date().toISOString();
    const logs = [{ ts: nowIso, ...log }, ...region.logs];
    let stage = region.stage;
    let growth = region.growth + 1;
    const i = STAGE_ORDER.indexOf(stage);
    if (growth >= GROWTH_PER_STAGE && i < STAGE_ORDER.length - 1) {
      stage = STAGE_ORDER[i + 1];
      growth = 0;
      logs.unshift({ ts: nowIso, type: "grow", text: `grew to ${STAGES[stage].label}` });
    }
    const extraData = typeof extra === "function" ? extra(region) : extra;
    const updated = { ...region, logs, stage, growth, tended: region.tended + 1, lastTs: nowIso, ...extraData };
    try {
      const saved = await api.updateRegion(id, updated);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  const tend = (id, type, text) =>
    grow(id, { type, text: text || (type === "water" ? "watered" : "paid attention") }, () => ({}));

  const setCrop = async (id, crop) => {
    try {
      const saved = await api.updateRegion(id, { crop });
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  // new timer flow
  const openPicker = (id) => {
    setTimerRegionId(id);
    setTimerPhase("picking");
  };
  const startCountdown = (mins) => {
    setTimerMins(mins);
    setTimerPhase("countdown");
  };
  const cancelTimer = () => {
    setTimerPhase("idle");
    setTimerRegionId(null);
    setTimerMins(0);
  };
  const completeCountdown = (mins, note) => {
    if (timerRegionId) {
      const text = note ? `${mins}m of sunshine — ${note}` : `${mins}m of sunshine`;
      grow(timerRegionId, { type: "sun", text, mins }, (r) => ({ sunshine: (r.sunshine || 0) + mins }));
    }
    setTimerPhase("idle");
    setTimerRegionId(null);
    setTimerMins(0);
  };

  const timerRegion = timerRegionId && regions.find((r) => r.id === timerRegionId);

  // milestones
  const addMilestone = async (regionId, milestone) => {
    try {
      const saved = await api.addMilestone(regionId, milestone);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };
  const updateMilestone = async (regionId, milestone) => {
    try {
      const saved = await api.updateMilestone(regionId, milestone.id, milestone);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };
  const toggleMilestone = async (regionId, milestoneId) => {
    const region = regions.find((r) => r.id === regionId);
    const ms = region?.milestones?.find((m) => m.id === milestoneId);
    if (!ms) return;
    try {
      const saved = await api.updateMilestone(regionId, milestoneId, {
        done: !ms.done,
        doneTs: !ms.done ? new Date().toISOString() : null,
      });
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };
  const deleteMilestone = async (regionId, milestoneId) => {
    try {
      const saved = await api.deleteMilestone(regionId, milestoneId);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  // bed form: null | "new" | region object
  const [bedForm, setBedForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const createBed = async (bed) => {
    try {
      const saved = await api.createRegion(bed);
      setRegions((rs) => [...rs, saved]);
      setBedForm(null);
    } catch (e) { console.error(e); }
  };

  const updateBed = async (bed) => {
    try {
      const saved = await api.updateRegion(bed.id, bed);
      applyGrow(saved);
      setBedForm(null);
    } catch (e) { console.error(e); }
  };

  const deleteBed = async (id) => {
    try {
      await api.deleteRegion(id);
      setRegions((rs) => rs.filter((r) => r.id !== id));
      setSelected(null);
      setConfirmDelete(null);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="app-min" style={{ display: "grid", placeItems: "center", color: "#6b6455" }}>loading…</div>;
  }

  const NAV = [
    { id: "garden", icon: "🌱", label: "Garden" },
    { id: "day", icon: "🕐", label: "Day plan" },
    { id: "calendar", icon: "📅", label: "Timeline" },
    { id: "library", icon: "📖", label: "Library" },
  ];
  const thirsty = regions.filter((r) => {
    const days = (Date.now() - new Date(r.lastTs).getTime()) / 864e5;
    return days >= 4;
  }).length;
  const recent = regions
    .flatMap((r) => (r.logs || []).map((l) => ({ ...l, region: r.label, color: threadById[r.thread]?.color })))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 8);

  // next 3 hours from today's plan (read live from localStorage)
  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const H = clock.getHours();
  let sched = {};
  try { sched = JSON.parse(localStorage.getItem(`vsg_schedule_${dayKey(clock)}`)) || {}; } catch (e) { /* ignore */ }
  const next3 = [];
  for (let o = 0; o < 3 && H + o < 24; o++) next3.push({ h: H + o, slot: sched[H + o] });
  const hh = String(H).padStart(2, "0");
  const mm = String(clock.getMinutes()).padStart(2, "0");

  return (
    <div className="dash">
      {/* left: minimal nav rail */}
      <aside className="dash-left">
        <div className="dash-brand" title="VisualSpam">🌱</div>
        <nav className="dash-nav">
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => setView(n.id)} title={n.label}>
              {n.icon}
            </button>
          ))}
        </nav>
      </aside>

      {/* centre: the active view */}
      <main className="dash-main">
        {view === "garden" && (
          <div className="now-widget now-float">
            <div className="now-time">
              <span className="now-clock">{hh}:{mm}</span>
              <span className="now-date">{WEEKDAY[clock.getDay()]}, {MONTH[clock.getMonth()]} {clock.getDate()}</span>
            </div>
            <ul className="now-next">
              {next3.map(({ h, slot }) => {
                const bed = slot?.bedId ? byId[slot.bedId] : null;
                const t = bed ? threadById[bed.thread] : null;
                const ms = bed?.milestones?.find((m) => m.id === slot?.milestoneId);
                const what = bed ? (ms ? ms.name : slot.text || "") : (slot?.text || "");
                return (
                  <li key={h} className={h === H ? "on" : ""} onClick={() => setView("day")}>
                    <span className="now-h">{fmtHour(h)}</span>
                    {t && <span className="now-dot" style={{ background: t.color }} />}
                    <span className="now-what">
                      {bed ? <><b>{bed.label}</b>{what ? ` · ${what}` : ""}</> : (what || <i>open</i>)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button className="now-plan-btn" onClick={() => setView("day")}>open day plan →</button>
          </div>
        )}
        {view === "garden" ? (
          <GardenScene
            regions={regions}
            hover={hover}
            selected={timerPhase !== "idle" ? null : selected}
            timerId={timerPhase === "countdown" ? timerRegionId : null}
            onHover={setHover}
            onSelect={setSelected}
            onWater={(id, text) => tend(id, "water", text)}
            onNote={(id, text) => tend(id, "note", text)}
            onSetCrop={setCrop}
            onStartTimer={openPicker}
            onAddMilestone={addMilestone}
            onUpdateMilestone={updateMilestone}
            onToggleMilestone={toggleMilestone}
            onDeleteMilestone={deleteMilestone}
            onEditBed={(bed) => setBedForm(bed)}
            onDeleteBed={(id) => setConfirmDelete(id)}
            onAnalyze={() => setShowAnalysis(true)}
          />
        ) : view === "day" ? (
          <DaySchedule regions={regions} />
        ) : view === "calendar" ? (
          <CalendarView regions={regions} view={view} />
        ) : (
          <Library />
        )}
      </main>

      {/* right: beds overview + recent */}
      <aside className="dash-right">
        <div className="rail-head">
          <span>Your beds</span>
          <button className="rail-add-btn" onClick={() => setBedForm("new")} title="Add new bed">+</button>
          {thirsty > 0 && <span className="rail-thirsty">💧 {thirsty}</span>}
        </div>
        <ul className="bed-rail">
          {regions.map((r) => {
            const t = threadById[r.thread];
            const st = STAGES[r.stage];
            const idx = STAGE_ORDER.indexOf(r.stage);
            return (
              <li key={r.id} className="bed-rail-item" onClick={() => { setView("garden"); setSelected(r.id); }}>
                <span className="bed-rail-dot" style={{ background: t?.color }} />
                <span className="bed-rail-main">
                  <b>{r.label}</b>
                  <span className="bed-rail-stage">{st.icon} {st.label}</span>
                </span>
                <span className="bed-rail-pips">
                  {STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} style={{ background: i <= idx ? t?.color : undefined }} />)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="rail-head rail-head-sub">Recent</div>
        <ul className="log-feed">
          {recent.length ? recent.map((l, i) => (
            <li key={i} className="feed-item">
              <span className="feed-dot" style={{ background: l.color }} />
              <span className="feed-main">
                <span className="feed-text">{FEED_ICON[l.type] || "•"} {l.text}</span>
                <span className="feed-sub">{l.region} · {timeAgo(l.ts)}</span>
              </span>
            </li>
          )) : <li className="feed-empty">no activity yet — tend a bed</li>}
        </ul>
      </aside>

      {timerPhase === "picking" && timerRegion && (
        <DurationPicker regionLabel={timerRegion.label} onStart={startCountdown} onCancel={cancelTimer} />
      )}
      {timerPhase === "countdown" && timerRegion && (
        <CountdownTimer regionLabel={timerRegion.label} durationMins={timerMins} onComplete={completeCountdown} onCancel={cancelTimer} />
      )}
      {bedForm === "new" && (
        <BedForm onSave={createBed} onCancel={() => setBedForm(null)} />
      )}
      {bedForm && bedForm !== "new" && (
        <BedForm bed={bedForm} onSave={updateBed} onCancel={() => setBedForm(null)} />
      )}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            <h2 className="ms-title">Delete bed?</h2>
            <p className="ms-region">This will remove {regions.find((r) => r.id === confirmDelete)?.label || "this bed"} and all its milestones.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="ms-save" style={{ flex: 1 }} onClick={() => deleteBed(confirmDelete)}>Delete</button>
              <button className="ed-clear" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showAnalysis && <GardenAnalysis onClose={() => setShowAnalysis(false)} />}
    </div>
  );
}
