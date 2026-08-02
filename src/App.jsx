import { useState, useEffect } from "react";
import { regions as initialRegions, STAGE_ORDER, GROWTH_PER_STAGE, STAGES } from "./data.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";

export default function App() {
  // load a saved garden, or plant a fresh one (all seedlings) on first visit
  const [regions, setRegions] = useState(() => {
    try {
      const saved = localStorage.getItem("vsg_regions_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return initialRegions.map((r) => ({ ...r, stage: "sprout", growth: 0, tended: 0, sunshine: 0 }));
  });
  // persist everything (logs, growth, sunshine) so it survives a refresh
  useEffect(() => {
    try { localStorage.setItem("vsg_regions_v1", JSON.stringify(regions)); } catch (e) { /* ignore */ }
  }, [regions]);
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("garden");
  const [timer, setTimer] = useState(null); // { id, startedAt }
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timer) return;
    const h = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(h);
  }, [timer]);
  const elapsedSec = timer ? Math.floor((now - timer.startedAt) / 1000) : 0;

  // grow a bed by one increment, adding a log and advancing stage when full
  function grow(id, log, extra = {}) {
    setRegions((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const nowIso = new Date().toISOString();
        const logs = [{ ts: nowIso, ...log }, ...r.logs];
        let stage = r.stage;
        let growth = r.growth + 1;
        const i = STAGE_ORDER.indexOf(stage);
        if (growth >= GROWTH_PER_STAGE && i < STAGE_ORDER.length - 1) {
          stage = STAGE_ORDER[i + 1];
          growth = 0;
          logs.unshift({ ts: nowIso, type: "grow", text: `grew to ${STAGES[stage].label}` });
        }
        return { ...r, logs, stage, growth, tended: r.tended + 1, lastTs: nowIso, ...extra(r) };
      })
    );
  }

  const tend = (id, type, text) =>
    grow(id, { type, text: text || (type === "water" ? "watered" : "paid attention") }, () => ({}));

  const setCrop = (id, crop) => setRegions((rs) => rs.map((r) => (r.id === id ? { ...r, crop } : r)));

  const startTimer = (id) => setTimer({ id, startedAt: Date.now() });
  const stopTimer = () => {
    if (!timer) return;
    const mins = Math.max(1, Math.round((Date.now() - timer.startedAt) / 60000));
    grow(timer.id, { type: "sun", text: `${mins}m of sunshine` }, (r) => ({ sunshine: (r.sunshine || 0) + mins }));
    setTimer(null);
  };

  const timerRegion = timer && regions.find((r) => r.id === timer.id);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div className="app-min">
      {view === "garden" ? (
        <GardenScene
          regions={regions}
          hover={hover}
          selected={selected}
          timerId={timer?.id || null}
          onHover={setHover}
          onSelect={setSelected}
          onWater={(id, text) => tend(id, "water", text)}
          onNote={(id, text) => tend(id, "note", text)}
          onSetCrop={setCrop}
          onStartTimer={startTimer}
        />
      ) : (
        <Library />
      )}

      {timer && (
        <div className="sun-timer">
          <span className="sun-ico">☀️</span>
          <span className="sun-label">giving sunshine to <b>{timerRegion?.label}</b></span>
          <span className="sun-time">{mm}:{ss}</span>
          <button className="sun-stop" onClick={stopTimer}>stop</button>
        </div>
      )}

      <nav className="corner-nav">
        <button className={view === "garden" ? "on" : ""} onClick={() => setView("garden")} title="Garden">🌱</button>
        <button className={view === "library" ? "on" : ""} onClick={() => setView("library")} title="Library">📖</button>
      </nav>
    </div>
  );
}
