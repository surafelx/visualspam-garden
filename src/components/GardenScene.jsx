import { regions, threadById, today } from "../data.js";

const CENTER = { x: 50, y: 52 };

// a gentle curved path from the garden centre to a region
function pathTo(r) {
  const mx = (CENTER.x + r.x) / 2 + (r.y - CENTER.y) * 0.12;
  const my = (CENTER.y + r.y) / 2 - (r.x - CENTER.x) * 0.12;
  return `M ${CENTER.x} ${CENTER.y} Q ${mx} ${my} ${r.x} ${r.y}`;
}

export default function GardenScene({ activeRegion, onRegion }) {
  return (
    <section className="garden">
      {/* ground + paths */}
      <svg className="garden-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <radialGradient id="glade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1c3326" />
            <stop offset="60%" stopColor="#132518" />
            <stop offset="100%" stopColor="#0d1a12" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#glade)" />
        {/* soft ground patches under each region */}
        {regions.map((r) => (
          <circle key={`g${r.id}`} cx={r.x} cy={r.y} r="11"
            fill={threadById[r.thread]?.color || "#8fe39a"} opacity="0.10" />
        ))}
        {/* winding paths */}
        {regions.map((r) => (
          <path key={`p${r.id}`} d={pathTo(r)} fill="none"
            stroke={activeRegion === r.id ? (threadById[r.thread]?.color || "#8fe39a") : "rgba(210,225,190,0.18)"}
            strokeWidth={activeRegion === r.id ? 0.9 : 0.6}
            strokeLinecap="round" strokeDasharray="0.6 1.8" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {/* region nodes */}
      {regions.map((r) => {
        const t = threadById[r.thread];
        return (
          <button
            key={r.id}
            className={`region ${activeRegion === r.id ? "on" : ""}`}
            style={{ left: `${r.x}%`, top: `${r.y}%`, "--rc": t?.color || "#8fe39a" }}
            onMouseEnter={() => onRegion(r.id)}
            onMouseLeave={() => onRegion(null)}
            onFocus={() => onRegion(r.id)}
            onBlur={() => onRegion(null)}
          >
            <span className="region-icon">{r.icon}</span>
            <span className="region-text">
              <b>{r.label}</b>
              <i>{r.sub}</i>
            </span>
          </button>
        );
      })}

      {/* central Check In */}
      <div className="checkin-wrap">
        <button className="checkin">
          <span className="checkin-sprout">🌱</span>
          <span className="checkin-label">Check In</span>
        </button>
        <span className="checkin-hint">↓</span>
      </div>

      {/* overlaid cards */}
      <div className="glade-card focus-card">
        <div className="glade-card-head">Today’s Focus</div>
        <ul className="focus-list">
          {today.focus.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
        <button className="glade-card-link">Edit ✎</button>
      </div>

      <div className="glade-card chapter-card">
        <div className="glade-card-head">Current Chapter <span className="leaf">🌿</span></div>
        <div className="chapter-title">{today.chapter.title}</div>
        <div className="chapter-lines">{today.chapter.lines.join(" ")}</div>
        <button className="glade-card-link">View chapter ▸</button>
      </div>
    </section>
  );
}
