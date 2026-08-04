import { useState, useEffect, useRef } from "react";
import PixelScene from "./PixelScene.jsx";

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.7);
    });
  } catch (e) { /* audio not available */ }
}

export default function CountdownTimer({ regionLabel, durationMins, onComplete, onCancel }) {
  const totalSec = durationMins * 60;
  const [remaining, setRemaining] = useState(totalSec);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (done) return;
    const h = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(h);
          setDone(true);
          playChime();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(h);
  }, [done]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = 1 - remaining / totalSec;

  if (done) {
    return (
      <div className="countdown-overlay done">
        <PixelScene />
        <div className="countdown-done">
          <div className="done-icon">☀️</div>
          <h1 className="done-title">Sunshine complete</h1>
          <p className="done-region">{regionLabel} received {durationMins}m of sunshine</p>
          {note && <p className="done-note">"{note}"</p>}
          <button className="done-btn" onClick={() => onComplete(durationMins, note)}>Continue gardening</button>
        </div>
      </div>
    );
  }

  return (
    <div className="countdown-overlay">
      <PixelScene />
      <button className="countdown-cancel" onClick={onCancel}>✕ cancel</button>

      <div className="countdown-center">
        <p className="countdown-label">giving sunshine to</p>
        <h2 className="countdown-region">{regionLabel}</h2>
        <div className="countdown-clock">
          <span className="clock-num">{mm}</span>
          <span className="clock-sep">:</span>
          <span className="clock-num">{ss}</span>
        </div>

        <div className="countdown-bar">
          <div className="countdown-bar-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="countdown-note">
          <label className="countdown-input-label">what's on your mind?</label>
          <textarea
            ref={inputRef}
            className="countdown-input"
            placeholder="write your thoughts, reflections, or notes about what you're working on…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
