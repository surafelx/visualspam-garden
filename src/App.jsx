import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { threadById, timeAgo, dayKey } from "./data.js";
import { encryptText, decryptText } from "./crypto.js";

const FEED_ICON = { water: "💧", note: "✎", grow: "🌸", sun: "☀️", checkin: "🌱" };
import * as api from "./api.js";
import { enqueue } from "./lib/apiQueue.js";
import GardenScene from "./components/GardenScene.jsx";
import Library, { getAllArticles, getPublicArticles, syncEssaysToApi } from "./components/Library.jsx";
import PlanView from "./components/PlanView.jsx";
import DurationPicker from "./components/DurationPicker.jsx";
import CountdownTimer from "./components/CountdownTimer.jsx";
import BedForm from "./components/BedForm.jsx";
import BedDetailPage from "./components/BedDetailPage.jsx";
import RoadmapView from "./components/RoadmapView.jsx";
import LoginGate from "./components/LoginGate.jsx";
import PublicPage from "./components/PublicPage.jsx";
import GardenAnalysis from "./components/GardenAnalysis.jsx";
import ToolsView from "./components/ToolsView.jsx";

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem("vsg_settings")) || {};
    const apiKey = raw.encApiKey ? await decryptText(raw.encApiKey) : (raw.apiKey || "");
    const model = raw.encModel ? await decryptText(raw.encModel) : (raw.model || "");
    const ytKey = raw.encYtKey ? await decryptText(raw.encYtKey) : (raw.ytKey || "");
    return { apiKey, model, ytKey };
  } catch { return { apiKey: "", model: "", ytKey: "" }; }
}
async function saveSettings(s) {
  const encApiKey = s.apiKey ? await encryptText(s.apiKey) : "";
  const encModel = s.model ? await encryptText(s.model) : "";
  const encYtKey = s.ytKey ? await encryptText(s.ytKey) : "";
  localStorage.setItem("vsg_settings", JSON.stringify({ encApiKey, encModel, encYtKey }));
}

const aiAnalyze = async (regions, settings) => {
  const { apiKey, model } = settings;
  const prompt = `You are a garden life-coach AI. Analyze these garden beds and give a short 2-3 sentence overall summary plus one top priority action. Be concise and warm.\n\nBeds:\n${regions.map((r) => {
    const days = Math.floor((Date.now() - new Date(r.lastTs).getTime()) / 864e5);
    const plants = (r.plants || []).length;
    return `- ${r.label} (tended ${r.tended}x, ${r.sunshine || 0}m sun, ${days}d since water, ${plants} plants)`;
  }).join("\n")}`;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: model || "google/gemini-2.0-flash-001", messages: [{ role: "user", content: prompt }], max_tokens: 200 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
};

function PublicRoutes({ regions, publicArticles, darkMode, setDarkMode }) {
  // Both the index and a single essay are the same component; it reads the
  // slug from the route itself.
  const page = (
    <PublicPage
      regions={regions}
      articles={publicArticles}
      darkMode={darkMode}
      setDarkMode={setDarkMode}
    />
  );
  return (
    <Routes>
      <Route path="/essay/:slug" element={page} />
      <Route path="*" element={page} />
    </Routes>
  );
}

function AdminShell({ regions, setRegions, settings, showSettings, setShowSettings, darkMode, setDarkMode, handleLogout, libraryArticles, publicArticles }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [expandedBeds, setExpandedBeds] = useState({});
  const toggleBed = (id) => setExpandedBeds((m) => ({ ...m, [id]: !m[id] }));
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const isGarden = path === "/admin" || path === "/admin/";
  const bedMatch = path.match(/^\/admin\/bed\/(.+)$/);
  const isPlan = path === "/admin/plan";
  const isRoadmap = path === "/admin/roadmap";
  const isLibrary = path.startsWith("/admin/library");
  const isTools = path.startsWith("/admin/tools");
  const currentView = isGarden ? "garden" : bedMatch ? "bed" : isPlan ? "plan"
    : isRoadmap ? "roadmap" : isTools ? "tools" : "library";

  const viewBedDetail = (id) => { navigate(`/admin/bed/${id}`); };
  const navigateToArticle = useCallback((article) => {
    if (!article) { navigate("/admin/library"); return; }
    const slug = slugify(article.title);
    navigate(`/admin/library/${slug}`);
  }, [navigate]);

  // Water: phase can be "picking-plant", "picking-fruit", or "logging"
  const [waterPhase, setWaterPhase] = useState("idle");
  const [waterRegionId, setWaterRegionId] = useState(null);
  const [waterPlantId, setWaterPlantId] = useState(null);
  const [waterFruitId, setWaterFruitId] = useState(null);
  const [waterText, setWaterText] = useState("");

  // Sunshine: multiple concurrent timers
  const [timers, setTimers] = useState([]);
  const [editingTimerId, setEditingTimerId] = useState(null);
  let timerIdCounter = useRef(0);

  const getTimer = (id) => timers.find((t) => t.id === id);
  const updateTimer = (id, patch) => setTimers((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));
  const removeTimer = (id) => setTimers((ts) => ts.filter((t) => t.id !== id));

  const applyGrow = (regionData) => {
    setRegions((rs) => rs.map((r) => r.id === regionData.id ? regionData : r));
  };

  const grow = async (id, log, extra = {}) => {
    let updatedRegion;
    setRegions((rs) => {
      const region = rs.find((r) => r.id === id);
      if (!region) return rs;
      const nowIso = new Date().toISOString();
      const logs = [{ ts: nowIso, ...log }, ...region.logs];
      const extraData = typeof extra === "function" ? extra(region) : extra;
      updatedRegion = { ...region, logs, tended: region.tended + 1, lastTs: nowIso, ...extraData };
      return rs.map((r) => r.id === id ? updatedRegion : r);
    });
    if (updatedRegion) {
      enqueue("updateRegion", id, updatedRegion)
        .then((saved) => {
          setRegions((prev) => prev.map((r) => r.id === saved.id ? saved : r));
        })
        .catch((err) => console.error("failed to save region", id, err));
    }
  };

  // ── Water flow ──
  const openWater = (id) => {
    setWaterRegionId(id);
    const region = regions.find((r) => r.id === id);
    if (region?.plants?.length > 0) setWaterPhase("picking-plant");
    else setWaterPhase("logging");
  };
  const waterPickPlant = (plantId) => {
    setWaterPlantId(plantId);
    const region = regions.find((r) => r.id === waterRegionId);
    const plant = region?.plants?.find((p) => p.id === plantId);
    if (plant?.fruits?.filter((f) => !f.done).length > 0) setWaterPhase("picking-fruit");
    else setWaterPhase("logging");
  };
  const waterPickFruit = (fruitId) => { setWaterFruitId(fruitId); setWaterPhase("logging"); };
  const waterSkipFruit = () => { setWaterFruitId(null); setWaterPhase("logging"); };
  const submitWater = () => {
    if (!waterRegionId) return;
    const region = regions.find((r) => r.id === waterRegionId);
    const plant = waterPlantId ? region?.plants?.find((p) => p.id === waterPlantId) : null;
    const fruit = waterFruitId && plant ? (plant.fruits || []).find((f) => f.id === waterFruitId) : null;
    const parts = ["watered"];
    if (plant) parts[0] = `watered ${plant.name}`;
    if (fruit) parts[0] += ` — ${fruit.title}`;
    const text = waterText.trim() ? `${parts[0]} — ${waterText.trim()}` : parts[0];
    grow(waterRegionId, { type: "water", text });
    setWaterPhase("idle"); setWaterRegionId(null); setWaterPlantId(null); setWaterFruitId(null); setWaterText("");
  };
  const cancelWater = () => { setWaterPhase("idle"); setWaterRegionId(null); setWaterPlantId(null); setWaterFruitId(null); setWaterText(""); };

  const waterRegion = waterRegionId && regions.find((r) => r.id === waterRegionId);
  const waterPlant = waterPlantId && waterRegion?.plants?.find((p) => p.id === waterPlantId);

  // ── Sunshine flow ──
  const openPicker = (id) => {
    const newId = ++timerIdCounter.current;
    const region = regions.find((r) => r.id === id);
    const phase = region?.plants?.length > 0 ? "picking-plant" : "picking";
    setTimers((ts) => [...ts, { id: newId, regionId: id, plantId: null, fruitId: null, phase, mins: 0 }]);
    setEditingTimerId(newId);
  };
  const timerPickPlant = (timerId, plantId) => {
    const region = regions.find((r) => r.id === getTimer(timerId)?.regionId);
    const plant = region?.plants?.find((p) => p.id === plantId);
    const phase = plant?.fruits?.filter((f) => !f.done).length > 0 ? "picking-fruit" : "picking";
    updateTimer(timerId, { plantId, phase });
  };
  const timerPickFruit = (timerId, fruitId) => updateTimer(timerId, { fruitId, phase: "picking" });
  const timerSkipFruit = (timerId) => updateTimer(timerId, { fruitId: null, phase: "picking" });
  const startCountdown = (timerId, mins) => updateTimer(timerId, { mins, phase: "countdown" });
  const cancelTimer = (timerId) => { removeTimer(timerId); if (editingTimerId === timerId) setEditingTimerId(null); };
  const completeCountdown = (timerId, mins, note) => {
    const t = getTimer(timerId);
    if (t) {
      const region = regions.find((r) => r.id === t.regionId);
      const plant = t.plantId ? region?.plants?.find((p) => p.id === t.plantId) : null;
      const fruit = t.fruitId && plant ? (plant.fruits || []).find((f) => f.id === t.fruitId) : null;
      const parts = [`${mins}m of sunshine`];
      if (plant) parts[0] += ` — ${plant.name}`;
      if (fruit) parts[0] += ` — ${fruit.title}`;
      const text = note ? `${parts[0]} — ${note}` : parts[0];
      grow(t.regionId, { type: "sun", text, mins }, (r) => ({ sunshine: (r.sunshine || 0) + mins }));
    }
    removeTimer(timerId);
    if (editingTimerId === timerId) setEditingTimerId(null);
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
    try { await api.deleteRegion(id); setRegions((rs) => rs.filter((r) => r.id !== id)); setSelected(null); setConfirmDelete(null); navigate("/admin"); } catch (e) { console.error(e); }
  };

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

  const NAV = [
    { id: "garden", icon: "🌱", label: "Garden", path: "/admin" },
    { id: "plan", icon: "📋", label: "Plan", path: "/admin/plan" },
    { id: "roadmap", icon: "🎯", label: "Roadmap", path: "/admin/roadmap" },
    { id: "library", icon: "📖", label: "Library", path: "/admin/library" },
    { id: "tools", icon: "🧰", label: "Tools", path: "/admin/tools" },
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
            <Link key={n.id} to={n.path} className={currentView === n.id ? "on" : ""} title={n.label}>
              {n.icon}
            </Link>
          ))}
          <div className="dash-nav-utils">
            <button className={showSettings ? "on" : ""} onClick={() => setShowSettings(true)} title="Settings">⚙</button>
            <button onClick={() => setDarkMode((d) => !d)} title={darkMode ? "Light mode" : "Dark mode"}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={handleLogout} title="Logout" className="nav-logout">⏻</button>
          </div>
        </nav>
      </aside>

      <main className="dash-main">
        {isGarden && (
          <GardenScene
            regions={regions}
            articles={libraryArticles}
            hover={hover}
            selected={editingTimerId ? null : selected}
            timerIds={timers.filter((t) => t.phase === "countdown").map((t) => t.regionId)}
            onHover={setHover}
            onSelect={viewBedDetail}
            onWater={openWater}
            onStartTimer={openPicker}
            onSelectArticle={(article) => navigateToArticle(article)}
          />
        )}
        {bedMatch && (
          <BedDetailPage
            region={regions.find((r) => r.id === bedMatch[1])}
            onBack={() => navigate("/admin")}
            onUpdate={(updated) => setRegions((rs) => rs.map((r) => r.id === updated.id ? updated : r))}
            onWater={openWater}
            onStartTimer={openPicker}
            timerRunning={timers.some((t) => t.phase === "countdown" && t.regionId === bedMatch[1])}
            onEditBed={(bed) => setBedForm(bed)}
            onDeleteBed={(id) => setConfirmDelete(id)}
          />
        )}
        {isPlan && <PlanView regions={regions} onGrow={grow} />}
        {isRoadmap && <RoadmapView regions={regions} onSelectBed={viewBedDetail} />}
        {isTools && <ToolsView regions={regions} settings={settings} />}
        {!isTools && isLibrary && !bedMatch && (
          <Library regions={regions} settings={settings} />
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
        <p className="rail-dnd-hint">drag a bed into your plan →</p>
        <ul className="bed-rail">
          {regions.map((r) => {
            const t = threadById[r.thread];
            const lastLog = (r.logs || [])[0];
            const plants = r.plants || [];
            const pendingFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => !f.done).length, 0);
            const doneFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => f.done).length, 0);
            return (
              <li key={r.id} className="bed-rail-item" draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "bed", bedId: r.id, bedLabel: r.label, thread: r.thread }));
                  e.dataTransfer.effectAllowed = "copy";
                  e.currentTarget.classList.add("dragging");
                }}
                onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}>
                <div className="bed-rail-header" onClick={() => viewBedDetail(r.id)}>
                  <span className="bed-rail-drag-handle">⠿</span>
                  <span className="bed-rail-dot" style={{ background: t?.color }} />
                  <span className="bed-rail-main">
                    <b>{r.label}</b>
                    <span className="bed-rail-stage">{t?.icon} {t?.label}</span>
                  </span>
                  {plants.length > 0 && (
                    /* the plant list is collapsed by default; opening it must not
                       also navigate into the bed */
                    <button
                      className="bed-rail-toggle"
                      onClick={(e) => { e.stopPropagation(); toggleBed(r.id); }}
                      aria-expanded={!!expandedBeds[r.id]}
                      title={expandedBeds[r.id] ? "Hide plants" : "Show plants"}
                    >
                      <span className="bed-rail-count">{plants.length}🌱</span>
                      <span className="bed-rail-caret">{expandedBeds[r.id] ? "−" : "+"}</span>
                    </button>
                  )}
                </div>
                {plants.length > 0 && expandedBeds[r.id] && (
                  <ul className="bed-rail-plants">
                    {plants.map((p) => {
                      const pFruits = (p.fruits || []).filter((f) => !f.done);
                      const dFruits = (p.fruits || []).filter((f) => f.done);
                      return (
                        <li key={p.id} className="bed-rail-plant">
                          <span className="bed-rail-plant-icon">🌱</span>
                          <span className="bed-rail-plant-name">{p.name}</span>
                          {(pFruits.length > 0 || dFruits.length > 0) && (
                            <span className="bed-rail-plant-fruits">
                              {dFruits.length > 0 && <span className="bed-rail-fruit-done">✓{dFruits.length}</span>}
                              {pFruits.length > 0 && <span className="bed-rail-fruit-pending">🍊{pFruits.length}</span>}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
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

      {/* ── Sunshine pickers (one per editing timer) ── */}
      {timers.filter((t) => t.phase !== "idle" && t.phase !== "countdown" && t.id === editingTimerId).map((t) => {
        const region = regions.find((r) => r.id === t.regionId);
        const plant = t.plantId ? region?.plants?.find((p) => p.id === t.plantId) : null;
        if (!region) return null;

        if (t.phase === "picking-plant") return (
          <div key={t.id} className="modal-backdrop" onClick={() => cancelTimer(t.id)}>
            <div className="modal plant-picker" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => cancelTimer(t.id)}>✕</button>
              <h2 className="ms-title">☀️ Choose a plant</h2>
              <p className="ms-region">in {region.label}</p>
              <div className="pp-list">
                {region.plants.map((p) => (
                  <button key={p.id} className="pp-item" onClick={() => timerPickPlant(t.id, p.id)}>
                    <span className="pp-name">{p.name}</span>
                    <span className="pp-crop">{p.crop}</span>
                  </button>
                ))}
              </div>
              <button className="ms-save" style={{ marginTop: 12 }} onClick={() => updateTimer(t.id, { plantId: null, fruitId: null, phase: "picking" })}>
                Skip — sunshine for whole bed
              </button>
            </div>
          </div>
        );

        if (t.phase === "picking-fruit" && plant) return (
          <div key={t.id} className="modal-backdrop" onClick={() => cancelTimer(t.id)}>
            <div className="modal plant-picker" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => cancelTimer(t.id)}>✕</button>
              <h2 className="ms-title">☀️ Choose a fruit</h2>
              <p className="ms-region">{plant.name}</p>
              <div className="pp-list">
                {(plant.fruits || []).filter((f) => !f.done).map((f) => (
                  <button key={f.id} className="pp-item" onClick={() => timerPickFruit(t.id, f.id)}>
                    <span className="pp-name">🍊 {f.title}</span>
                  </button>
                ))}
              </div>
              <button className="ms-save" style={{ marginTop: 12 }} onClick={() => timerSkipFruit(t.id)}>
                Skip — sunshine for whole plant
              </button>
            </div>
          </div>
        );

        if (t.phase === "picking") return (
          <DurationPicker key={t.id} regionLabel={region.label} onStart={(mins) => startCountdown(t.id, mins)} onCancel={() => cancelTimer(t.id)} />
        );

        return null;
      })}

      {/* ── Sunshine countdowns (multiple can run at once) ── */}
      {timers.filter((t) => t.phase === "countdown").map((t) => {
        const region = regions.find((r) => r.id === t.regionId);
        if (!region) return null;
        return (
          <CountdownTimer key={t.id} regionLabel={region.label} durationMins={t.mins}
            onComplete={(mins, note) => completeCountdown(t.id, mins, note)}
            onCancel={() => cancelTimer(t.id)} />
        );
      })}

      {/* ── Water: pick plant ── */}
      {waterPhase === "picking-plant" && waterRegion && (
        <div className="modal-backdrop" onClick={cancelWater}>
          <div className="modal plant-picker" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelWater}>✕</button>
            <h2 className="ms-title">💧 Choose a plant</h2>
            <p className="ms-region">in {waterRegion.label}</p>
            <div className="pp-list">
              {waterRegion.plants.map((p) => (
                <button key={p.id} className="pp-item" onClick={() => waterPickPlant(p.id)}>
                  <span className="pp-name">{p.name}</span>
                  <span className="pp-crop">{p.crop}</span>
                </button>
              ))}
            </div>
            <button className="ms-save" style={{ marginTop: 12 }} onClick={() => { setWaterPlantId(null); setWaterFruitId(null); setWaterPhase("logging"); }}>
              Skip — water whole bed
            </button>
          </div>
        </div>
      )}

      {/* ── Water: pick fruit ── */}
      {waterPhase === "picking-fruit" && waterPlant && (
        <div className="modal-backdrop" onClick={cancelWater}>
          <div className="modal plant-picker" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelWater}>✕</button>
            <h2 className="ms-title">💧 Choose a fruit</h2>
            <p className="ms-region">{waterPlant.name}</p>
            <div className="pp-list">
              {(waterPlant.fruits || []).filter((f) => !f.done).map((f) => (
                <button key={f.id} className="pp-item" onClick={() => waterPickFruit(f.id)}>
                  <span className="pp-name">🍊 {f.title}</span>
                </button>
              ))}
            </div>
            <button className="ms-save" style={{ marginTop: 12 }} onClick={waterSkipFruit}>
              Skip — water whole plant
            </button>
          </div>
        </div>
      )}

      {/* ── Water: log ── */}
      {waterPhase === "logging" && waterRegion && (
        <div className="modal-backdrop" onClick={cancelWater}>
          <div className="modal water-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={cancelWater}>✕</button>
            <h2 className="ms-title">💧 Water log</h2>
            <p className="ms-region">
              {waterRegion.label}
              {waterPlant ? ` → ${waterPlant.name}` : ""}
              {waterFruitId && waterPlant ? ` → ${(waterPlant.fruits || []).find((f) => f.id === waterFruitId)?.title || ""}` : ""}
            </p>
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
                onChange={async (e) => {
                  const s = { ...settings, apiKey: e.target.value };
                  setSettings(s); await saveSettings(s);
                }}
              />
            </div>
            <div className="ms-field">
              <label className="ms-label">YouTube Data API Key</label>
              <input
                type="password"
                className="ms-input"
                placeholder="AIza… — for searching music in Tools"
                value={settings.ytKey || ""}
                onChange={async (e) => {
                  const s = { ...settings, ytKey: e.target.value };
                  setSettings(s); await saveSettings(s);
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
                onChange={async (e) => {
                  const s = { ...settings, model: e.target.value };
                  setSettings(s); await saveSettings(s);
                }}
              />
              <p style={{ fontSize: "0.72rem", color: "#857c69", marginTop: 6 }}>
                Leave blank for default (Gemini 2.0 Flash). Get an API key at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" style={{ color: "#4c9a63" }}>openrouter.ai/keys</a>
              </p>
            </div>
            <button className="ms-save" onClick={async () => {
              setShowSettings(false);
            }}>Save</button>
          </div>
        </div>
      )}
      {showAnalysis && <GardenAnalysis regions={regions} onClose={() => setShowAnalysis(false)} />}
    </div>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(() => localStorage.getItem("vsg_admin") === "1");
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ apiKey: "", model: "" });
  useEffect(() => { getSettings().then(setSettings); }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("vsg_dark");
    if (stored !== null) return stored === "1";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("vsg_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (localStorage.getItem("vsg_dark") === null) {
        setDarkMode(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleLogin = () => {
    setAdmin(true);
    syncEssaysToApi();
  };
  const handleLogout = () => { localStorage.removeItem("vsg_admin"); setAdmin(false); };

  useEffect(() => {
    api.fetchRegions()
      .then((r) => { setRegions(r); return r; })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── SSE live sync ──
  useEffect(() => {
    const es = new EventSource(`${import.meta.env.DEV ? "http://localhost:4000" : ""}/api/events`);
    es.addEventListener("region:created", (e) => {
      const region = JSON.parse(e.data);
      setRegions((prev) => [...prev, region]);
    });
    es.addEventListener("region:updated", (e) => {
      const region = JSON.parse(e.data);
      setRegions((prev) => prev.map((r) => r.id === region.id ? region : r));
    });
    es.addEventListener("region:deleted", (e) => {
      const { id } = JSON.parse(e.data);
      setRegions((prev) => prev.filter((r) => r.id !== id));
    });
    return () => es.close();
  }, []);

  const [libraryArticles, setLibraryArticles] = useState(() => getAllArticles());
  const [publicArticles, setPublicArticles] = useState([]);

  useEffect(() => {
    getPublicArticles().then(setPublicArticles);
    setLibraryArticles(getAllArticles());
  }, []);

  if (loading) {
    return <div className="app-min" style={{ display: "grid", placeItems: "center", color: "#6b6455" }}>loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={admin ? <Navigate to="/admin" replace /> : <LoginGate onLogin={handleLogin} />}
        />
        {/* The admin app lives under /admin. Signed out, it sends you to the
            login screen instead of quietly rendering the public site. */}
        <Route
          path="/admin/*"
          element={
            admin ? (
              <AdminShell
                regions={regions}
                setRegions={setRegions}
                settings={settings}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                handleLogout={handleLogout}
                libraryArticles={libraryArticles}
                publicArticles={publicArticles}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Everything else is the public site, signed in or not — being logged
            in used to replace the whole site with the admin shell. */}
        <Route
          path="*"
          element={
            <PublicRoutes
              regions={regions}
              publicArticles={publicArticles}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
