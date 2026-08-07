export const threads = [
  { id: "technology", name: "Technology", color: "#6ec1ff", icon: "💻" },
  { id: "philosophy", name: "Philosophy", color: "#c7a6ff", icon: "📜" },
  { id: "architecture", name: "Architecture", color: "#ffcf8b", icon: "📐" },
  { id: "music", name: "Music", color: "#ff9ec7", icon: "🎵" },
  { id: "business", name: "Business", color: "#ffd166", icon: "🏛️" },
  { id: "nature", name: "Nature", color: "#8fe39a", icon: "🌿" },
  { id: "health", name: "Health", color: "#7ee0c0", icon: "❤️" },
  { id: "relationships", name: "Relationships", color: "#ff8f8f", icon: "👥" },
  { id: "travel", name: "Travel", color: "#77d0ff", icon: "✈️" },
  { id: "writing", name: "Writing", color: "#cbd5b0", icon: "✍️" },
  { id: "documentary", name: "Documentary", color: "#b0a0ff", icon: "🎬" },
  { id: "ideas", name: "Ideas", color: "#ffe08a", icon: "💡" },
];

export const STAGES = {
  seed:        { label: "Seed",        icon: "🌰", verb: "just planted" },
  sprout:      { label: "Sprouting",   icon: "🌱", verb: "breaking ground" },
  growing:     { label: "Growing",     icon: "🌿", verb: "taking root" },
  flourishing: { label: "Flourishing", icon: "🌸", verb: "in full bloom" },
};

export const WATER_AFTER_DAYS = 4;

export function milestoneStatus(ms) {
  if (ms.done) return "done";
  const diff = (new Date(ms.deadline).getTime() - Date.now()) / 864e5;
  if (diff < 0) return "overdue";
  if (diff <= 3) return "soon";
  return "on-track";
}

export function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 864e5;
  if (d < 1) return "today";
  if (d < 2) return "yesterday";
  if (d < 7) return `${Math.floor(d)} days ago`;
  if (d < 14) return "1 week ago";
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  const m = Math.floor(d / 30);
  return `${m} month${m > 1 ? "s" : ""} ago`;
}

export function needsWater(ts) {
  return (Date.now() - new Date(ts).getTime()) / 864e5 >= WATER_AFTER_DAYS;
}

export const dayKey = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export function activityByDay(regions, checkins = []) {
  const map = {};
  const bump = (k) => (map[k] = map[k] || { mins: 0, count: 0, mood: null, items: [] });
  regions.forEach((r) =>
    (r.logs || []).forEach((l) => {
      const k = dayKey(l.ts);
      const a = bump(k);
      a.count++;
      if (l.type === "sun") a.mins += l.mins || 0;
      a.items.push({ ts: l.ts, type: l.type, text: l.text, region: r.label });
    })
  );
  checkins.forEach((c) => {
    const k = dayKey(c.ts);
    const a = bump(k);
    a.count++;
    a.mood = c.mood;
    a.items.push({ ts: c.ts, type: "checkin", text: c.note || "checked in", region: null });
  });
  return map;
}

export const threadById = Object.fromEntries(threads.map((t) => [t.id, t]));

export const CROP_CHOICES = [
  { id: "flower", label: "Flower" },
  { id: "cabbage", label: "Cabbage" },
  { id: "carrot", label: "Carrot" },
  { id: "tomato", label: "Tomato" },
  { id: "leafy", label: "Leafy" },
];

export const articles = [];
