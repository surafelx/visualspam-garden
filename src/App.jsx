import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { STAGES, threadById, timeAgo, dayKey } from "./data.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
import * as api from "./api.js";
import GardenScene from "./components/GardenScene.jsx";
import Library from "./components/Library.jsx";
import CalendarView from "./components/CalendarView.jsx";
import DaySchedule from "./components/DaySchedule.jsx";
import DurationPicker from "./components/DurationPicker.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";
import BedForm from "./components/BedForm.jsx";
import BedDetailPage from "./components/BedDetailPage.jsx";
import LoginGate from "./components/LoginGate.jsx";
import PublicPage from "./components/PublicPage.jsx";

function getSettings() {
  try { return JSON.parse(localStorage.getItem("vsg_settings")) || {}; }
  catch { return {}; }
}
function saveSettings(s) { localStorage.setItem("vsg_settings", JSON.stringify(s)); }

async function aiAnalyze(regions, settings) {
  const { apiKey, model } = settings;
  if (!apiKey || !regions.length) return null;
  const prompt = `You are a garden life-coach AI. Analyze these garden beds and give a short 2-3 sentence overall summary plus one top priority action. Be concise and warm.\n\nBeds:\n${regions.map((r) => {
    const days = Math.floor((Date.now() - new Date(r.lastTs).getTime()) / 864e5);
    const plants = (r.plants || []).length;
    return `- ${r.label} (tended ${r.tended}x, ${r.sunshine || 0}m sun, ${days}d since water, ${plants} plants)`;
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
  const [admin, setAdmin] = useState(() => localStorage.getItem("vsg_admin") === "1");
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(getSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const aiRan = useRef(false);

  const handleLogin = () => setAdmin(true);
  const handleLogout = () => { localStorage.removeItem("vsg_admin"); setAdmin(false); };
  const handleAdminFromPublic = () => {
    if (!admin) { localStorage.setItem("vsg_admin", "1"); setAdmin(true); }
  };

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
  const [timerPlantId, setTimerPlantId] = useState(null);
  const [timerMins, setTimerMins] = useState(0);

  // Water log modal
  const [waterLog, setWaterLog] = useState(null);
  const [waterText, setWaterText] = useState("");

  const applyGrow = (regionData) => {
    setRegions((rs) => rs.map((r) => r.id === regionData.id ? regionData : r));
  };

  const grow = async (id, log, extra = {}) => {
    const region = regions.find((r) => r.id === id);
    if (!region) return;
    const nowIso = new Date().toISOString();
    const logs = [{ ts: nowIso, ...log }, ...region.logs];
    const extraData = typeof extra === "function" ? extra(region) : extra;
    const updated = { ...region, logs, tended: region.tended + 1, lastTs: nowIso, ...extraData };
    try {
      const saved = await api.updateRegion(id, updated);
      applyGrow(saved);
    } catch (e) { console.error(e); }
  };

  const openWaterLog = (id) => { setWaterLog(id); setWaterText(""); };
  const submitWater = () => {
    if (!waterLog) return;
    const text = waterText.trim() || "watered";
    grow(waterLog, { type: "water", text });
    setWaterLog(null); setWaterText("");
  };

  const openPicker = (id) => {
    setTimerRegionId(id);
    const region = regions.find((r) => r.id === id);
    if (region?.plants?.length > 0) setTimerPhase("picking-plant");
    else setTimerPhase("picking");
  };
  const pickPlant = (plantId) => { setTimerPlantId(plantId); setTimerPhase("picking"); };
  const startCountdown = (mins) => { setTimerMins(mins); setTimerPhase("countdown"); };
  const cancelTimer = () => { setTimerPhase("idle"); setTimerRegionId(null); setTimerPlantId(null); setTimerMins(0); };
  const completeCountdown = (mins, note) => {
    if (timerRegionId) {
      const region = regions.find((r) => r.id === timerRegionId);
      const plant = timerPlantId ? region?.plants?.find((p) => p.id === timerPlantId) : null;
      const plantName = plant ? ` — ${plant.name}` : "";
      const text = note ? `${mins}m of sunshine${plantName} — ${note}` : `${mins}m of sunshine${plantName}`;
      grow(timerRegionId, { type: "sun", text, mins }, (r) => ({ sunshine: (r.sunshine || 0) + mins }));
    }
    setTimerPhase("idle"); setTimerRegionId(null); setTimerPlantId(null); setTimerMins(0);
  };

  const timerRegion = timerRegionId && regions.find((r) => r.id === timerRegionId);

  const [bedForm, setBedForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const createBed = async (bed) => {
    try { const saved = await api.createRegion(bed); setRegions((rs) => [...rs, saved]); setBedForm(null); } catch (e) { console.error(e); }
  };
  const updateBed = async (bed) => {
    try { const saved = await api.updateRegion(bed.id, bed); applyGrow(saved); setBedForm(null); } catch (e) { console.error(e); }
  };
  const deleteBed = async (id) => {
    try { await api.deleteRegion(id); setRegions((rs) => rs.filter((r) => r.id !== id)); setSelected(null); setConfirmDelete(null); setView("garden"); } catch (e) { console.error(e); }
  };

  const viewBedDetail = (id) => { setView("bed"); setSelected(id); };

  const nextPlan = useMemo(() => {
    const now = new Date();
    const currentH = now.getHours();
    const today = dayKey(now);
    try {
      const sched = JSON.parse(localStorage.getItem(`vsg_schedule_${today}`)) || {};
      for (let h = currentH; h < 24; h++) {
        const tasks = sched[h];
        if (Array.isArray(tasks)) {
          const filled = tasks.filter((t) => t && (t.bedId || (t.text && t.text.trim())));
          if (filled.length > 0) return { hour: h, tasks: filled };
        } else if (tasks && (tasks.bedId || tasks.text)) {
          return { hour: h, tasks: [tasks] };
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }, [clock]);

  if (loading) {
    return <div className="app-min" style={{ display: "grid", placeItems: "center", color: "#6b6455" }}>loading…</div>;
  }

  if (!admin) {
    return <PublicPage onAdmin={handleAdminFromPublic} />;
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

  return (
    <div className="dash">
      <aside className="dash-left">
        <nav className="dash-nav">
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => setView(n.id)} title={n.label}>
              {n.icon}
            </button>
          ))}
          <button className={showSettings ? "on" : ""} onClick={() => setShowSettings(true)} title="Settings">⚙</button>
          <button onClick={handleLogout} title="Logout" className="nav-logout">⏻</button>
        </nav>
      </aside>

      <main className="dash-main">
        {view === "garden" ? (
          <GardenScene
            regions={regions}
            hover={hover}
            selected={timerPhase !== "idle" ? null : selected}
            timerId={timerPhase === "countdown" ? timerRegionId : null}
            onHover={setHover}
            onSelect={viewBedDetail}
            onWater={openWaterLog}
            onStartTimer={openPicker}
            onEditBed={(bed) => setBedForm(bed)}
            onDeleteBed={(id) => setConfirmDelete(id)}
          />
        ) : view === "bed" && selected ? (
          <BedDetailPage
            region={regions.find((r) => r.id === selected)}
            onBack={() => setView("garden")}
            onRefresh={refetchRegions}
            onWater={openWaterLog}
            onStartTimer={openPicker}
            timerRunning={timerPhase === "countdown" && timerRegionId === selected}
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
        {nextPlan && (
          <div className="rail-next-plan">
            <div className="rail-head rail-head-sub">🕐 Next up · {String(nextPlan.hour).padStart(2, "0")}:00</div>
            <ul className="rail-next-list">
              {nextPlan.tasks.map((t, i) => {
                const bed = t.bedId ? regions.find((r) => r.id === t.bedId) : null;
                const thread = bed ? threadById[bed.thread] : null;
                return (
                  <li key={i} className="rail-next-item" onClick={() => bed && viewBedDetail(bed.id)}>
                    {thread && <span className="rail-next-dot" style={{ background: thread.color }} />}
                    <span className="rail-next-info">
                      {bed && <b>{bed.label}</b>}
                      {t.text && <span className="rail-next-text">{t.text}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="rail-head">
          <span>Your beds</span>
          <button className="rail-add-btn" onClick={() => setBedForm("new")} title="Add new bed">+</button>
          {thirsty > 0 && <span className="rail-thirsty">💧 {thirsty}</span>}
        </div>
        <ul className="bed-rail">
          {regions.map((r) => {
            const t = threadById[r.thread];
            const lastLog = (r.logs || [])[0];
            return (
              <li key={r.id} className="bed-rail-item" onClick={() => viewBedDetail(r.id)}>
                <span className="bed-rail-dot" style={{ background: t?.color }} />
                <span className="bed-rail-main">
                  <b>{r.label}</b>
                  <span className="bed-rail-stage">{t?.icon} {t?.label}</span>
                  {lastLog && (
                    <span className="bed-rail-log">
                      {lastLog.type === "water" ? "💧" : lastLog.type === "sun" ? "☀️" : lastLog.type === "note" ? "✎" : "•"} {lastLog.text?.slice(0, 35)}
                    </span>
                  )}
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

      {timerPhase === "picking-plant" && timerRegion && (
        <div className="modal-backdrop" onClick={cancelTimer}>
          <div className="modal plant-picker" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelTimer}>✕</button>
            <h2 className="ms-title">Choose a plant</h2>
            <p className="ms-region">in {timerRegion.label}</p>
            <div className="pp-list">
              {timerRegion.plants.map((p) => (
                <button key={p.id} className="pp-item" onClick={() => pickPlant(p.id)}>
                  <span className="pp-name">{p.name}</span>
                  <span className="pp-crop">{p.crop}</span>
                </button>
              ))}
            </div>
            <button className="ms-save" style={{ marginTop: 12 }} onClick={() => { setTimerPlantId(null); setTimerPhase("picking"); }}>
              Skip — sunshine for whole bed
            </button>
          </div>
        </div>
      )}
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
            <p className="ms-region">This will remove {regions.find((r) => r.id === confirmDelete)?.label || "this bed"} and all its plants.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="ms-save" style={{ flex: 1 }} onClick={() => deleteBed(confirmDelete)}>Delete</button>
              <button className="ed-clear" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {waterLog && (
        <div className="modal-backdrop" onClick={() => setWaterLog(null)}>
          <div className="modal water-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setWaterLog(null)}>✕</button>
            <h2 className="ms-title">💧 Water log</h2>
            <p className="ms-region">{regions.find((r) => r.id === waterLog)?.label}</p>
            <div className="ms-field">
              <label className="ms-label">What did you do?</label>
              <input className="ms-input" autoFocus value={waterText}
                onChange={(e) => setWaterText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitWater()}
                placeholder="e.g. reviewed code, went for a run…" />
            </div>
            <button className="ms-save" onClick={submitWater}>Log it</button>
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
