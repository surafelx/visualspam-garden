import { useState, useEffect, useCallback, useRef } from "react";
import { STAGE_ORDER, GROWTH_PER_STAGE, STAGES, threadById, timeAgo, dayKey } from "./data.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
import * as api from "./api.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";
import CalendarView from "./components/CalendarView.jsx";
import DaySchedule from "./components/DaySchedule.jsx";
import DurationPicker from "./components/DurationPicker.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";
import BedForm from "./components/BedForm.jsx";

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem("vsg_settings")) || {};
  } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem("vsg_settings", JSON.stringify(s)); }

async function aiAnalyze(regions, settings) {
  const { apiKey, model } = settings;
  if (!apiKey || !regions.length) return null;
  const prompt = `You are a garden life-coach AI. Analyze these garden beds and give a short 2-3 sentence overall summary plus one top priority action. Be concise and warm.\n\nBeds:\n${regions.map((r) => {
    const days = Math.floor((Date.now() - new Date(r.lastTs).getTime()) / 864e5);
    const ms = (r.milestones || []).filter((m) => !m.done);
    return `- ${r.label} (${r.stage}, tended ${r.tended}x, ${r.sunshine || 0}m sun, ${days}d since water, ${ms.length} pending milestones)`;
  }).join("\n")}`;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || "google/gemini-2.0-flash-001", messages: [{ role: "user", content: prompt }], max_tokens: 200 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

export default function App() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(getSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const aiRan = useRef(false);

  const refetchRegions = useCallback(async () => {
    const data = await api.fetchRegions();
    setRegions(data);
  }, []);

  useEffect(() => {
    api.fetchRegions()
      .then((r) => { setRegions(r); return r; })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!aiRan.current && regions.length > 0 && settings.apiKey) {
      aiRan.current = true;
      aiAnalyze(regions, settings).then((t) => t && setAiInsight(t));
    }
  }, [regions, settings]);

  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("garden");
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const [timerPhase, setTimerPhase] = useState("idle");
  const [timerRegionId, setTimerRegionId] = useState(null);
  const [timerMins, setTimerMins] = useState(0);

  const applyGrow = (regionData) => {
    setRegions((rs) => rs.map((r) => r.id === regionData.id ? regionData : r));
  };

  const grow = async (id, log, extra = {}) => {
    const region = regions.find((r) => r.id === id);
    if (!region) return;
    const nowIso = new Date().toISOString();
    const logs = [{ ts: nowIso, ...log }, ...region.logs];
    let stage = region.stage;
    let growth = region.growth + 1;
    const i = STAGE_ORDER.indexOf(stage);
    if (growth >= GROWTH_PER_STAGE && i < STAGE_ORDER.length - 1) {
      stage = STAGE_ORDER[i + 1];
      growth = 0;
      logs.unshift({ ts: nowIso, type: "grow", text: `grew to ${STAGES[stage].label}` });
    }
    const extraData = typeof extra === "function" ? extra(region) : extra;
    const updated = { ...region, logs, stage, growth, tended: region.tended + 1, lastTs: nowIso, ...extraData };
    try {
      const saved = await api.updateRegion(id, updated);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  const tend = (id, type, text) =>
    grow(id, { type, text: text || (type === "water" ? "watered" : "paid attention") }, () => ({}));

  const setCrop = async (id, crop) => {
    try {
      const saved = await api.updateRegion(id, { crop });
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  const openPicker = (id) => { setTimerRegionId(id); setTimerPhase("picking"); };
  const startCountdown = (mins) => { setTimerMins(mins); setTimerPhase("countdown"); };
  const cancelTimer = () => { setTimerPhase("idle"); setTimerRegionId(null); setTimerMins(0); };
  const completeCountdown = (mins, note) => {
    if (timerRegionId) {
      const text = note ? `${mins}m of sunshine — ${note}` : `${mins}m of sunshine`;
      grow(timerRegionId, { type: "sun", text, mins }, (r) => ({ sunshine: (r.sunshine || 0) + mins }));
    }
    setTimerPhase("idle"); setTimerRegionId(null); setTimerMins(0);
  };

  const timerRegion = timerRegionId && regions.find((r) => r.id === timerRegionId);

  const addMilestone = async (regionId, milestone) => {
    try { const saved = await api.addMilestone(regionId, milestone); applyGrow(saved); } catch (e) { console.error(e); }
  };
  const updateMilestone = async (regionId, milestone) => {
    try { const saved = await api.updateMilestone(regionId, milestone.id, milestone); applyGrow(saved); } catch (e) { console.error(e); }
  };
  const toggleMilestone = async (regionId, milestoneId) => {
    const region = regions.find((r) => r.id === regionId);
    const ms = region?.milestones?.find((m) => m.id === milestoneId);
    if (!ms) return;
    try {
      const saved = await api.updateMilestone(regionId, milestoneId, { done: !ms.done, doneTs: !ms.done ? new Date().toISOString() : null });
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };
  const deleteMilestone = async (regionId, milestoneId) => {
    try { const saved = await api.deleteMilestone(regionId, milestoneId); applyGrow(saved); } catch (e) { console.error(e); }
  };

  const [bedForm, setBedForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const createBed = async (bed) => {
    try { const saved = await api.createRegion(bed); setRegions((rs) => [...rs, saved]); setBedForm(null); } catch (e) { console.error(e); }
  };
  const updateBed = async (bed) => {
    try { const saved = await api.updateRegion(bed.id, bed); applyGrow(saved); setBedForm(null); } catch (e) { console.error(e); }
  };
  const deleteBed = async (id) => {
    try { await api.deleteRegion(id); setRegions((rs) => rs.filter((r) => r.id !== id)); setSelected(null); setConfirmDelete(null); } catch (e) { console.error(e); }
  };

  if (loading) {
    return <div className="app-min" style={{ display: "grid", placeItems: "center", color: "#6b6455" }}>loading…</div>;
  }

  const NAV = [
    { id: "garden", icon: "🌱", label: "Garden" },
    { id: "day", icon: "🕐", label: "Day plan" },
    { id: "calendar", icon: "📅", label: "Timeline" },
    { id: "library", icon: "📖", label: "Library" },
  ];
  const thirsty = regions.filter((r) => (Date.now() - new Date(r.lastTs).getTime()) / 864e5 >= 4).length;
  const recent = regions
    .flatMap((r) => (r.logs || []).map((l) => ({ ...l, region: r.label, color: threadById[r.thread]?.color })))
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 8);

  const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
  const H = clock.getHours();
  let sched = {};
  try { sched = JSON.parse(localStorage.getItem(`vsg_schedule_${dayKey(clock)}`)) || {}; } catch (e) { /* ignore */ }
  const nextSlots = [];
  for (let o = 0; o < 4 && H + o < 24; o++) {
    const slot = sched[H + o];
    if (slot) nextSlots.push({ h: H + o, slot });
  }

  return (
    <div className="dash">
      <aside className="dash-left">
        <div className="dash-brand" title="VisualSpam">🌱</div>
        <nav className="dash-nav">
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => setView(n.id)} title={n.label}>
              {n.icon}
            </button>
          ))}
          <button className={showSettings ? "on" : ""} onClick={() => setShowSettings(true)} title="Settings">⚙</button>
        </nav>
      </aside>

      <main className="dash-main">
        {view === "garden" && (
          <div className="garden-clock-bar">
            <div className="garden-clock">
              <span className="garden-clock-time">{fmtHour(H)}:{String(clock.getMinutes()).padStart(2, "0")}</span>
              <span className="garden-clock-date">{WEEKDAY_FULL[clock.getDay()]}, {MONTH[clock.getMonth()]} {clock.getDate()}</span>
            </div>
            {nextSlots.length > 0 && (
              <div className="garden-schedule">
                {nextSlots.map(({ h, slot }) => {
                  const bed = slot?.bedId ? byId[slot.bedId] : null;
                  const t = bed ? threadById[bed.thread] : null;
                  return (
                    <div key={h} className={`garden-sched-item ${h === H ? "now" : ""}`} onClick={() => setView("day")}>
                      <span className="garden-sched-time">{fmtHour(h)}</span>
                      {t && <span className="garden-sched-dot" style={{ background: t.color }} />}
                      <span className="garden-sched-text">
                        {bed ? <><b>{bed.label}</b>{slot.text ? ` · ${slot.text}` : ""}</> : (slot?.text || "open")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {view === "garden" && aiInsight && (
          <div className="ai-insight-bar">{aiInsight}</div>
        )}
        {view === "garden" ? (
          <GardenScene
            regions={regions}
            hover={hover}
            selected={timerPhase !== "idle" ? null : selected}
            timerId={timerPhase === "countdown" ? timerRegionId : null}
            onHover={setHover}
            onSelect={setSelected}
            onWater={(id, text) => tend(id, "water", text)}
            onNote={(id, text) => tend(id, "note", text)}
            onSetCrop={setCrop}
            onStartTimer={openPicker}
            onAddMilestone={addMilestone}
            onUpdateMilestone={updateMilestone}
            onToggleMilestone={toggleMilestone}
            onDeleteMilestone={deleteMilestone}
            onEditBed={(bed) => setBedForm(bed)}
            onDeleteBed={(id) => setConfirmDelete(id)}
          />
        ) : view === "day" ? (
          <DaySchedule regions={regions} />
        ) : view === "calendar" ? (
          <CalendarView regions={regions} view={view} />
        ) : (
          <Library />
        )}
      </main>

      <aside className="dash-right">
        <div className="rail-head">
          <span>Your beds</span>
          <button className="rail-add-btn" onClick={() => setBedForm("new")} title="Add new bed">+</button>
          {thirsty > 0 && <span className="rail-thirsty">💧 {thirsty}</span>}
        </div>
        <ul className="bed-rail">
          {regions.map((r) => {
            const t = threadById[r.thread];
            const st = STAGES[r.stage];
            const idx = STAGE_ORDER.indexOf(r.stage);
            return (
              <li key={r.id} className="bed-rail-item" onClick={() => { setView("garden"); setSelected(r.id); }}>
                <span className="bed-rail-dot" style={{ background: t?.color }} />
                <span className="bed-rail-main">
                  <b>{r.label}</b>
                  <span className="bed-rail-stage">{st.icon} {st.label}</span>
                </span>
                <span className="bed-rail-pips">
                  {STAGE_ORDER.map((s, i) => <i key={s} className={i <= idx ? "on" : ""} style={{ background: i <= idx ? t?.color : undefined }} />)}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="rail-head rail-head-sub">Recent</div>
        <ul className="log-feed">
          {recent.length ? recent.map((l, i) => (
            <li key={i} className="feed-item">
              <span className="feed-dot" style={{ background: l.color }} />
              <span className="feed-main">
                <span className="feed-text">{FEED_ICON[l.type] || "•"} {l.text}</span>
                <span className="feed-sub">{l.region} · {timeAgo(l.ts)}</span>
              </span>
            </li>
          )) : <li className="feed-empty">no activity yet — tend a bed</li>}
        </ul>
      </aside>

      {timerPhase === "picking" && timerRegion && (
        <DurationPicker regionLabel={timerRegion.label} onStart={startCountdown} onCancel={cancelTimer} />
      )}
      {timerPhase === "countdown" && timerRegion && (
        <CountdownTimer regionLabel={timerRegion.label} durationMins={timerMins} onComplete={completeCountdown} onCancel={cancelTimer} />
      )}
      {bedForm === "new" && <BedForm onSave={createBed} onCancel={() => setBedForm(null)} />}
      {bedForm && bedForm !== "new" && <BedForm bed={bedForm} onSave={updateBed} onCancel={() => setBedForm(null)} />}
      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            <h2 className="ms-title">Delete bed?</h2>
            <p className="ms-region">This will remove {regions.find((r) => r.id === confirmDelete)?.label || "this bed"} and all its milestones.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="ms-save" style={{ flex: 1 }} onClick={() => deleteBed(confirmDelete)}>Delete</button>
              <button className="ed-clear" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettings(false)}>✕</button>
            <h2 className="ms-title">Settings</h2>
            <p className="ms-region">Configure AI analysis powered by OpenRouter</p>
            <div className="ms-field">
              <label className="ms-label">OpenRouter API Key</label>
              <input
                type="password"
                className="ms-input"
                placeholder="sk-or-..."
                value={settings.apiKey || ""}
                onChange={(e) => {
                  const s = { ...settings, apiKey: e.target.value };
                  setSettings(s); saveSettings(s);
                }}
              />
            </div>
            <div className="ms-field">
              <label className="ms-label">Model</label>
              <input
                type="text"
                className="ms-input"
                placeholder="google/gemini-2.0-flash-001"
                value={settings.model || ""}
                onChange={(e) => {
                  const s = { ...settings, model: e.target.value };
                  setSettings(s); saveSettings(s);
                }}
              />
              <p style={{ fontSize: "0.72rem", color: "#857c69", marginTop: 6 }}>
                Leave blank for default (Gemini 2.0 Flash). Get an API key at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" style={{ color: "#4c9a63" }}>openrouter.ai/keys</a>
              </p>
            </div>
            <button className="ms-save" onClick={() => {
              setShowSettings(false);
              aiRan.current = false;
              setAiInsight(null);
              if (settings.apiKey && regions.length) {
                aiAnalyze(regions, settings).then((t) => t && setAiInsight(t));
              }
            }}>Save & Analyze</button>
          </div>
        </div>
      )}
    </div>
  );
}
