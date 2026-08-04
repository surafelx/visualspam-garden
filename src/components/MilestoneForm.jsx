import { useState, useRef, useEffect } from "react";

export default function MilestoneForm({ milestone, regionLabel, onSave, onCancel }) {
  const [title, setTitle] = useState(milestone?.title || "");
  const [deadline, setDeadline] = useState(
    milestone?.deadline ? new Date(milestone.deadline).toISOString().split("T")[0] : ""
  );
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (!title.trim() || !deadline) return;
    onSave({
      id: milestone?.id || `ms_${Date.now()}`,
      title: title.trim(),
      deadline: new Date(deadline + "T23:59:59").toISOString(),
      done: milestone?.done || false,
      doneTs: milestone?.doneTs || null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal milestone-form" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>✕</button>
        <h2 className="ms-title">{milestone ? "Edit" : "New"} milestone</h2>
        <p className="ms-region">for {regionLabel}</p>
        <div className="ms-field">
          <label className="ms-label">What do you want to achieve?</label>
          <input
            ref={inputRef}
            type="text"
            className="ms-input"
            placeholder="e.g. Finish the first draft"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <div className="ms-field">
          <label className="ms-label">Deadline</label>
          <input
            type="date"
            className="ms-input ms-date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <button className="ms-save" disabled={!title.trim() || !deadline} onClick={submit}>
          {milestone ? "Save changes" : "Add milestone"}
        </button>
      </div>
    </div>
  );
}
