import { regions, threadById } from "../data.js";
import { PixelSprite } from "../pixels.jsx";

export default function GardenScene({ activeRegion, onRegion }) {
  return (
    <section className="garden">
      {/* faint pixel ground grid */}
      <div className="garden-grid" aria-hidden />

      {/* pixel plants */}
      {regions.map((r) => {
        const t = threadById[r.thread];
        const on = activeRegion === r.id;
        return (
          <button
            key={r.id}
            className={`plant ${on ? "on" : ""}`}
            style={{ left: `${r.x}%`, top: `${r.y}%`, "--rc": t?.color || "#8fe39a" }}
            onMouseEnter={() => onRegion(r.id)}
            onMouseLeave={() => onRegion(null)}
            onFocus={() => onRegion(r.id)}
            onBlur={() => onRegion(null)}
          >
            <PixelSprite kind={r.kind} color={t?.color || "#8fe39a"} size={r.kind === "pond" || r.kind === "meadow" ? 92 : 74} />
            <span className="plant-shadow" />
            <span className="plant-label">{r.label}</span>
          </button>
        );
      })}

      {/* minimal central check-in */}
      <button className="checkin">
        <PixelSprite kind="seedbed" color="#8fe39a" size={40} />
        <span className="checkin-label">check in</span>
      </button>
    </section>
  );
}
