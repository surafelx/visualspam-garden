import { useState } from "react";
import { nav, you, today } from "./data.js";
import Sidebar from "./components/Sidebar.jsx";
import GardenScene from "./components/GardenScene.jsx";
import RightRail from "./components/RightRail.jsx";

export default function App() {
  const [active, setActive] = useState("garden");
  const [region, setRegion] = useState(null); // hovered/selected region id

  return (
    <div className="app">
      <Sidebar nav={nav} active={active} onNav={setActive} />

      <main className="stage">
        <header className="greeting">
          <div className="greeting-main">
            <span className="greeting-sun">☀️</span>
            <div>
              <h1>Good morning, {you.name}</h1>
              <p className="greeting-date">{today.dateLabel}</p>
            </div>
          </div>
          <blockquote className="greeting-quote">
            “{today.quote.text}”
            <cite>— {today.quote.source}</cite>
          </blockquote>
        </header>

        <GardenScene activeRegion={region} onRegion={setRegion} />

        <footer className="stage-footer">
          <span className="stage-footer-leaf">🌿</span>
          <span>Your garden is unique. Grow at your own pace.</span>
          <button className="walk-btn">Walk your garden <span>▸</span></button>
        </footer>
      </main>

      <RightRail />
    </div>
  );
}
