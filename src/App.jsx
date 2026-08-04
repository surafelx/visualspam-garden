import { useState, useEffect, useCallback } from "react";
import { STAGE_ORDER, GROWTH_PER_STAGE, STAGES, threadById, timeAgo } from "./data.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
import * as api from "./api.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";
import CalendarView from "./components/CalendarView.jsx";
import DaySchedule from "./components/DaySchedule.jsx";
import DurationPicker from "./components/DurationPicker.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";

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
          />
        ) : view === "day" ? (
          <DaySchedule regions={regions} />
        ) : view === "calendar" ? (
          <CalendarView regions={regions} view={view} />
        ) : (
          <Library />
        )}
      </main>

      {/* right: minimal beds overview */}
      <aside className="dash-right">
        <div className="rail-head">
          <span>Your beds</span>
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
    </div>
  );
}
