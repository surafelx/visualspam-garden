import { useState } from "react";

const ADMIN_PASS = "garden2025";

export default function LoginGate({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      localStorage.setItem("vsg_admin", "1");
      onLogin();
    } else {
      setError(true);
      setPass("");
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🌱</div>
        <h1 className="login-title">VisualSpam Garden</h1>
        <p className="login-sub">Admin access</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="password"
            className={`login-input ${error ? "error" : ""}`}
            placeholder="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoFocus
          />
          <button type="submit" className="login-btn">Enter</button>
        </form>
        {error && <p className="login-err">wrong password</p>}
      </div>
    </div>
  );
}
