// In dev the client (:5200) talks to the API server (:4000). In production the
// server serves the built client, so a same-origin relative "/api" works.
// Override anytime with VITE_API_URL (e.g. a separate API host).
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

// ── Milestones ──
export const addMilestone = (regionId, milestone) => request(`/regions/${regionId}/milestones`, { method: "POST", body: milestone });
export const updateMilestone = (regionId, msId, data) => request(`/regions/${regionId}/milestones/${msId}`, { method: "PUT", body: data });
export const deleteMilestone = (regionId, msId) => request(`/regions/${regionId}/milestones/${msId}`, { method: "DELETE" });

// ── Analysis ──
export const analyzeAll = () => request("/regions/analyze/all");
export const analyzeBed = (id) => request(`/regions/${id}/analyze`);
