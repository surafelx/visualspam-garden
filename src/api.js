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
