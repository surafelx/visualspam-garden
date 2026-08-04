import { useState, useEffect } from "react";
import * as api from "../api.js";

const SCORE_COLOR = (s) => s >= 70 ? "#4c9a63" : s >= 40 ? "#e0a84a" : "#c0392b";
const PRIORITY_STYLE = { high: "color: #c0392b; font-weight: 600;", medium: "color: #b9852a;", low: "color: #8a9079;" };

export default function GardenAnalysis({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.analyzeAll()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-loading">Analyzing your garden…</div>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal analysis-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="ms-title">🌱 Garden Analysis</h2>
        <p className="ms-region">{data.beds.length} beds · overall health {data.avgScore}/100</p>

        <div className="analysis-score-bar">
          <div className="analysis-score-fill" style={{ width: `${data.avgScore}%`, background: SCORE_COLOR(data.avgScore) }} />
        </div>

        {data.highPriority.length > 0 && (
          <div className="analysis-section">
            <h3 className="analysis-section-title">⚠️ Needs Attention</h3>
            {data.highPriority.map((r, i) => (
              <div key={i} className="analysis-rec high">
                <span className="analysis-rec-icon">{r.icon}</span>
                <span className="analysis-rec-bed">{r.bed}</span>
                <span className="analysis-rec-text">{r.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="analysis-section">
          <h3 className="analysis-section-title">📊 Bed Breakdown</h3>
          {data.beds.map((b) => (
            <div key={b.regionId} className="analysis-bed">
              <div className="analysis-bed-head">
                <span className="analysis-bed-name">{b.label}</span>
                <span className="analysis-bed-score" style={{ color: SCORE_COLOR(b.score) }}>{b.score}</span>
              </div>
              <div className="analysis-bed-bar">
                <div className="analysis-bed-fill" style={{ width: `${b.score}%`, background: SCORE_COLOR(b.score) }} />
              </div>
              <p className="analysis-bed-insight">{b.insight}</p>
              {b.recommendations.length > 0 && (
                <div className="analysis-bed-recs">
                  {b.recommendations.map((r, i) => (
                    <div key={i} className="analysis-rec" style={PRIORITY_STYLE[r.priority]}>
                      <span>{r.icon}</span> {r.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
