import { threads } from "../data.js";

export default function Sidebar({ nav, active, onNav }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">VisualSpam <span className="brand-leaf">🌿</span></div>
        <div className="brand-tag">Cultivate your life.</div>
      </div>

      <nav className="nav">
        {nav.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${active === n.id ? "on" : ""}`}
            onClick={() => onNav(n.id)}
          >
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="threads">
        <div className="threads-head">
          <span>LIFE THREADS</span>
          <button className="threads-add" title="New thread">+</button>
        </div>
        <ul className="thread-list">
          {threads.map((t) => (
            <li key={t.id} className="thread">
              <span className="thread-dot" style={{ background: t.color }} />
              <span className="thread-name">{t.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="encourage">
        <div className="encourage-avatar">🧑‍🌾</div>
        <div className="encourage-text">
          Every seed matters. Some just need more seasons.
          <span className="encourage-sign">— Keep going.</span>
        </div>
      </div>

      <div className="sidebar-foot">
        <button className="foot-btn" title="Theme">☾</button>
        <button className="foot-btn" title="Settings">⚙</button>
      </div>
    </aside>
  );
}
