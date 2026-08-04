import { useState, useRef, useEffect } from "react";

const PRESET_MINS = [5, 10, 15, 25, 30, 45, 60, 90];

export default function DurationPicker({ regionLabel, onStart, onCancel }) {
  const [mins, setMins] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (n) => {
    const val = n || parseInt(mins, 10);
    if (val > 0) onStart(val);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal duration-picker" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <div className="dp-icon">☀️</div>
        <h2 className="dp-title">Give sunshine to</h2>
        <p className="dp-region">{regionLabel}</p>
        <div className="dp-presets">
          {PRESET_MINS.map((m) => (
            <button key={m} className={`dp-preset ${mins === String(m) ? "on" : ""}`}
              onClick={() => { setMins(String(m)); submit(m); }}>
              {m}m
            </button>
          ))}
        </div>
        <div className="dp-divider"><span>or</span></div>
        <div className="dp-input-row">
          <input
            ref={inputRef}
            type="number"
            min="1"
            max="480"
            className="dp-input"
            placeholder="custom"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <span className="dp-unit">min</span>
        </div>
        <button className="dp-start" disabled={!mins || parseInt(mins, 10) <= 0} onClick={() => submit()}>
          Start
        </button>
      </div>
    </div>
  );
}
