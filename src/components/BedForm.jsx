import { useState, useRef, useEffect } from "react";
import { threads } from "../data.js";

const BED_KINDS = ["greenhouse", "grove", "orchard", "herbs", "pond", "meadow", "seedbed"];

export default function BedForm({ bed, onSave, onCancel }) {
  const [label, setLabel] = useState(bed?.label || "");
  const [sub, setSub] = useState(bed?.sub || "");
  const [thread, setThread] = useState(bed?.thread || threads[0].id);
  const [note, setNote] = useState(bed?.note || "");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (!label.trim()) return;
    const threadObj = threads.find((t) => t.id === thread);
    onSave({
      id: bed?.id || `bed_${Date.now()}`,
      label: label.trim(),
      sub: sub.trim() || threadObj?.name || "Bed",
      thread,
      note: note.trim(),
      kind: bed?.kind || BED_KINDS[Math.floor(Math.random() * BED_KINDS.length)],
      stage: bed?.stage || "seed",
      growth: bed?.growth || 0,
      tended: bed?.tended || 0,
      sunshine: bed?.sunshine || 0,
      lastTs: bed?.lastTs || new Date().toISOString(),
      crop: bed?.crop || null,
      logs: bed?.logs || [],
      milestones: bed?.milestones || [],
    });
  };

  const selectedThread = threads.find((t) => t.id === thread);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal bed-form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h2 className="ms-title">{bed ? "Edit" : "New"} bed</h2>
        <div className="ms-field">
          <label className="ms-label">Name</label>
          <input
            ref={inputRef}
            type="text"
            className="ms-input"
            placeholder="e.g. Studio, Health, Travel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="ms-field">
          <label className="ms-label">Subtitle</label>
          <input
            type="text"
            className="ms-input"
            placeholder="e.g. Greenhouse, Grove, Pond"
            value={sub}
            onChange={(e) => setSub(e.target.value)}
          />
        </div>
        <div className="ms-field">
          <label className="ms-label">Life thread</label>
          <div className="thread-grid">
            {threads.map((t) => (
              <button
                key={t.id}
                className={`thread-chip ${thread === t.id ? "on" : ""}`}
                style={{ "--tc": t.color }}
                onClick={() => setThread(t.id)}
              >
                <span className="thread-chip-dot" style={{ background: t.color }} />
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>
        {bed && (
          <div className="ms-field">
            <label className="ms-label">Note</label>
            <input
              type="text"
              className="ms-input"
              placeholder="What's growing here?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
        <button className="ms-save" disabled={!label.trim()} onClick={submit}>
          {bed ? "Save changes" : "Plant bed"}
        </button>
      </div>
    </div>
  );
}
