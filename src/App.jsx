import { useState } from "react";
import { regions as initialRegions, STAGE_ORDER, GROWTH_PER_STAGE, STAGES } from "./data.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";

export default function App() {
  const [regions, setRegions] = useState(initialRegions);
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("garden");

  function tend(id, type, text) {
    setRegions((rs) =>
      rs.map((r) => {
        if (r.id !== id) return r;
        const now = new Date().toISOString();
        const logs = [{ ts: now, type, text: text || (type === "water" ? "watered" : "paid attention") }, ...r.logs];
        let stage = r.stage;
        let growth = r.growth + 1;
        const i = STAGE_ORDER.indexOf(stage);
        if (growth >= GROWTH_PER_STAGE && i < STAGE_ORDER.length - 1) {
          stage = STAGE_ORDER[i + 1];
          growth = 0;
          logs.unshift({ ts: now, type: "grow", text: `grew to ${STAGES[stage].label}` });
        }
        return { ...r, logs, stage, growth, tended: r.tended + 1, lastTs: now };
      })
    );
  }

  return (
    <div className="app-min">
      {view === "garden" ? (
        <GardenScene
          regions={regions}
          hover={hover}
          selected={selected}
          onHover={setHover}
          onSelect={setSelected}
          onWater={(id, text) => tend(id, "water", text)}
          onNote={(id, text) => tend(id, "note", text)}
          onCheckIn={() => {}}
        />
      ) : (
        <Library />
      )}

      {/* minimal corner nav */}
      <nav className="corner-nav">
        <button className={view === "garden" ? "on" : ""} onClick={() => setView("garden")} title="Garden">🌱</button>
        <button className={view === "library" ? "on" : ""} onClick={() => setView("library")} title="Library">📖</button>
      </nav>
    </div>
  );
}
