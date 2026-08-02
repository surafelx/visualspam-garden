import { today, seeds, harvests, threadById, you } from "../data.js";

function StagePill({ stage }) {
  const map = { seed: { label: "Seed", icon: "🌰" }, sprout: { label: "Sprout", icon: "🌱" } };
  const s = map[stage] || map.seed;
  return <span className={`stage-pill ${stage}`}>{s.label} {s.icon}</span>;
}

export default function RightRail() {
  return (
    <aside className="rail">
      {/* Today */}
      <section className="panel">
        <div className="panel-head"><h3>Today</h3><span className="panel-ico">🗓️</span></div>
        <dl className="today-grid">
          <dt>Weather</dt>
          <dd>{today.weather.icon} {today.weather.temp} · {today.weather.label}</dd>
          <dt>Energy</dt>
          <dd>
            <span className="energy-bar"><i style={{ width: `${today.energy * 10}%` }} /></span>
            {today.energy}/10
          </dd>
          <dt>Mood</dt>
          <dd>{today.mood.icon} {today.mood.label}</dd>
          <dt>Main Identity</dt>
          <dd>{you.identityIcon} {you.identity}</dd>
        </dl>
      </section>

      {/* Seeds */}
      <section className="panel">
        <div className="panel-head"><h3>Seeds</h3><button className="panel-link">View all</button></div>
        <ul className="seed-list">
          {seeds.map((s) => {
            const t = threadById[s.thread];
            return (
              <li key={s.id} className="seed">
                <span className="seed-dot" style={{ background: t?.color }}>{t?.icon}</span>
                <span className="seed-main">
                  <b>{s.name}</b>
                  <i>{s.agoLabel}</i>
                </span>
                <StagePill stage={s.stage} />
              </li>
            );
          })}
        </ul>
        <button className="seed-add">＋ Plant a new seed</button>
      </section>

      {/* Recent Harvests */}
      <section className="panel">
        <div className="panel-head"><h3>Recent Harvests</h3><button className="panel-link">View all</button></div>
        <ul className="harvest-list">
          {harvests.map((h) => {
            const t = threadById[h.thread];
            return (
              <li key={h.id} className="harvest">
                <span className="harvest-badge" style={{ "--hc": t?.color }}>{t?.icon}</span>
                <span className="harvest-main">
                  <b>{h.name}</b>
                  <i>{h.dateLabel}</i>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
