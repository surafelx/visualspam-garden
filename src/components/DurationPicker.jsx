import { useState, useRef, useEffect } from "react";

export default function DurationPicker({ regionLabel, onStart, onCancel }) {
  const [mins, setMins] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const n = parseInt(mins, 10);
    if (n > 0) onStart(n);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal duration-picker" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <div className="dp-icon">☀️</div>
        <h2 className="dp-title">Give sunshine to</h2>
        <p className="dp-region">{regionLabel}</p>
        <div className="dp-input-row">
          <input
            ref={inputRef}
            type="number"
            min="1"
            max="480"
            className="dp-input"
            placeholder="minutes"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <span className="dp-unit">min</span>
        </div>
        <button className="dp-start" disabled={!mins || parseInt(mins, 10) <= 0} onClick={submit}>
          Start countdown
        </button>
      </div>
    </div>
  );
}
