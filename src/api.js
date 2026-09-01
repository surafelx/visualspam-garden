const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000/api" : "/api");

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Regions ──
export const fetchRegions = () => request("/regions");
export const createRegion = (data) => request("/regions", { method: "POST", body: data });
export const updateRegion = (id, data) => request(`/regions/${id}`, { method: "PUT", body: data });
export const deleteRegion = (id) => request(`/regions/${id}`, { method: "DELETE" });

// ── Plants ──
export const addPlant = (regionId, plant) => request(`/regions/${regionId}/plants`, { method: "POST", body: plant });
export const updatePlant = (regionId, plantId, data) => request(`/regions/${regionId}/plants/${plantId}`, { method: "PUT", body: data });
export const deletePlant = (regionId, plantId) => request(`/regions/${regionId}/plants/${plantId}`, { method: "DELETE" });

// ── Fruits (on a specific plant) ──
export const addFruit = (regionId, plantId, fruit) => request(`/regions/${regionId}/plants/${plantId}/fruits`, { method: "POST", body: fruit });
export const updateFruit = (regionId, plantId, fruitId, data) => request(`/regions/${regionId}/plants/${plantId}/fruits/${fruitId}`, { method: "PUT", body: data });
export const deleteFruit = (regionId, plantId, fruitId) => request(`/regions/${regionId}/plants/${plantId}/fruits/${fruitId}`, { method: "DELETE" });

// ── Essays ──
export const fetchEssays = () => request("/essays");
export const fetchPublicEssays = () => request("/essays/public");
export const createEssay = (data) => request("/essays", { method: "POST", body: data });
export const updateEssay = (id, data) => request(`/essays/${id}`, { method: "PUT", body: data });
export const deleteEssay = (id) => request(`/essays/${id}`, { method: "DELETE" });
export const addReaction = (essayId, emoji) => request(`/essays/${essayId}/reactions`, { method: "POST", body: { emoji } });

// ── Comments ──
export const fetchComments = (essayId) => request(`/comments/${essayId}`);
export const createComment = (data) => request("/comments", { method: "POST", body: data });

// ── Messages ──
export const fetchMessages = () => request("/messages");
export const createMessage = (data) => request("/messages", { method: "POST", body: data });
export const markMessageRead = (id) => request(`/messages/${id}`, { method: "PUT", body: { read: true } });

// ── Archive (saved links) ──
export const fetchTracks = (regionId) =>
  request(`/tracks${regionId ? `?regionId=${encodeURIComponent(regionId)}` : ""}`);
export const createTrack = (data) => request("/tracks", { method: "POST", body: data });
export const updateTrack = (id, data) => request(`/tracks/${id}`, { method: "PUT", body: data });
export const deleteTrack = (id) => request(`/tracks/${id}`, { method: "DELETE" });

// ── Subscriptions (feeds you follow) ──
export const fetchSubs = () => request("/subs");
export const createSub = (data) => request("/subs", { method: "POST", body: data });
export const updateSub = (id, data) => request(`/subs/${id}`, { method: "PUT", body: data });
export const deleteSub = (id) => request(`/subs/${id}`, { method: "DELETE" });
export const fetchSubItems = (refresh) => request(`/subs/items${refresh ? "?refresh=1" : ""}`);

// ── Local Garden Analysis (no API needed) ──
export function analyzeAll(regions) {
  if (!regions || !regions.length) return null;

  const beds = regions.map((r) => {
    const now = Date.now();
    const lastTs = r.lastTs ? new Date(r.lastTs).getTime() : 0;
    const daysSinceWater = lastTs ? Math.floor((now - lastTs) / 864e5) : 99;
    const plants = r.plants || [];
    const pendingFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => !f.done).length, 0);
    const doneFruits = plants.reduce((n, p) => n + (p.fruits || []).filter((f) => f.done).length, 0);
    const totalFruits = pendingFruits + doneFruits;

    // Score: 0-100
    let score = 50;
    const tended = r.tended || 0;
    const sunshine = r.sunshine || 0;

    if (tended >= 10) score += 15;
    else if (tended >= 5) score += 10;
    else if (tended >= 1) score += 5;
    else score -= 10;

    if (sunshine >= 30) score += 10;
    else if (sunshine >= 10) score += 5;

    if (daysSinceWater <= 2) score += 10;
    else if (daysSinceWater <= 4) score += 5;
    else if (daysSinceWater <= 7) score -= 5;
    else score -= 15;

    if (plants.length >= 3) score += 5;
    else if (plants.length === 0) score -= 10;

    if (totalFruits > 0 && doneFruits > 0) score += Math.min(10, Math.floor((doneFruits / totalFruits) * 10));

    score = Math.max(0, Math.min(100, score));

    // Insights
    const insights = [];
    if (daysSinceWater > 4) insights.push(`Needs water — last tended ${daysSinceWater}d ago`);
    if (tended === 0) insights.push("No activity yet — time to plant something");
    if (plants.length === 0) insights.push("Empty bed — add plants to start growing");
    if (sunshine === 0 && tended > 0) insights.push("No sunshine logged yet");
    if (pendingFruits > 0) insights.push(`${pendingFruits} fruit${pendingFruits > 1 ? "s" : ""} pending`);
    if (doneFruits > 0) insights.push(`${doneFruits} fruit${doneFruits > 1 ? "s" : ""} completed`);
    if (insights.length === 0) insights.push("Looking good — keep it up");

    // Recommendations
    const recs = [];
    if (daysSinceWater > 4) recs.push({ icon: "💧", text: "Water this bed soon", priority: "high" });
    if (plants.length === 0) recs.push({ icon: "🌱", text: "Add some plants", priority: "medium" });
    if (sunshine < 10 && tended > 0) recs.push({ icon: "☀️", text: "Log more sunshine", priority: "medium" });
    if (pendingFruits > 2) recs.push({ icon: "🍊", text: "Focus on completing pending fruits", priority: "medium" });
    if (tended >= 10 && score < 70) recs.push({ icon: "✨", text: "Try a different approach", priority: "low" });

    return {
      regionId: r.id,
      label: r.label,
      score,
      insight: insights[0] || "",
      recommendations: recs,
      daysSinceWater,
      plants: plants.length,
      sunshine,
      tended,
    };
  });

  const avgScore = Math.round(beds.reduce((s, b) => s + b.score, 0) / beds.length);
  const highPriority = beds
    .filter((b) => b.score < 40 || b.recommendations.some((r) => r.priority === "high"))
    .flatMap((b) => b.recommendations.filter((r) => r.priority === "high").map((r) => ({ ...r, bed: b.label })));

  return { beds, avgScore, highPriority };
}
