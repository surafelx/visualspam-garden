export default function PublicPage({ onAdmin }) {
  return (
    <div className="lp">
      <div className="lp-center">
        <div className="lp-hero-icon">🌱</div>
        <h1 className="lp-hero-title">VisualSpam Garden</h1>
        <p className="lp-hero-sub">A place for growing ideas, tending thoughts, and reading what matters.</p>
        <button className="lp-admin-link" onClick={onAdmin}>admin</button>
      </div>
    </div>
  );
}
