// Mock data for the Garden home. This is the shape the real backend will fill
// later — Life Threads, garden Regions, Seeds (goals in-flight), Harvests
// (milestones reached), and today's ambient state.

// Life Threads — the colour + emoji language used everywhere. A thread maps to
// a region of the garden.
const threads = [
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

// The four growth stages a plant moves through. Order matters (index = progress).
export const STAGES = {
  seed:        { label: "Seed",        icon: "🌰", verb: "just planted" },
  sprout:      { label: "Sprouting",   icon: "🌱", verb: "breaking ground" },
  growing:     { label: "Growing",     icon: "🌿", verb: "taking root" },
  flourishing: { label: "Flourishing", icon: "🌸", verb: "in full bloom" },
};
export const STAGE_ORDER = ["seed", "sprout", "growing", "flourishing"];

// how much tending (waters/notes) grows a plant to its next stage
export const GROWTH_PER_STAGE = 4;
// a plant that hasn't been tended in this many days is asking to be watered
export const WATER_AFTER_DAYS = 4;

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString();

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

// Aggregate every tending action + check-in into per-day activity for the
// calendar: total sunshine minutes, action count, and the day's mood.
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

// Regions placed in the garden. x/y are percentages within the garden canvas.
// `stage` drives the sprite; `growth` is progress (0..GROWTH_PER_STAGE) toward
// the next stage; `lastTs` drives "needs water"; `logs` is your tending history.
export const regions = [
  { id: "studio", label: "Studio", sub: "Greenhouse", thread: "technology", x: 80, y: 52, kind: "greenhouse",
    stage: "flourishing", growth: 2, tended: 12, lastTs: daysAgo(2),
    note: "The AI automation system shipped — new experiments already sprouting under glass.",
    logs: [{ ts: daysAgo(2), type: "water", text: "reviewed the pipeline" }],
    milestones: [
      { id: "m1", title: "Ship v1.0 of the automation tool", deadline: daysFromNow(14), done: true, doneTs: daysAgo(2) },
      { id: "m2", title: "Write 3 blog posts about the build", deadline: daysFromNow(30), done: false },
    ] },
  { id: "philosophy", label: "Philosophy", sub: "Grove", thread: "philosophy", x: 22, y: 58, kind: "grove",
    stage: "growing", growth: 2, tended: 5, lastTs: daysAgo(5),
    note: "An essay is taking root, fed by three long walks of thought.",
    logs: [{ ts: daysAgo(5), type: "note", text: "long walk — outline clicked" }],
    milestones: [
      { id: "m3", title: "Finish first draft of essay", deadline: daysFromNow(5), done: false },
    ] },
  { id: "business", label: "Business", sub: "Orchard", thread: "business", x: 40, y: 54, kind: "orchard",
    stage: "sprout", growth: 1, tended: 2, lastTs: daysAgo(7),
    note: "The first client proposal is planted. Early leaves showing.",
    logs: [],
    milestones: [
      { id: "m4", title: "Send 5 client proposals", deadline: daysFromNow(21), done: false },
    ] },
  { id: "health", label: "Health", sub: "Herb Garden", thread: "health", x: 62, y: 62, kind: "herbs",
    stage: "flourishing", growth: 3, tended: 20, lastTs: daysAgo(0),
    note: "Daily movement — the bed is dense, green and fragrant.",
    logs: [{ ts: daysAgo(0), type: "water", text: "morning run" }],
    milestones: [
      { id: "m5", title: "Run a 5K without stopping", deadline: daysFromNow(10), done: false },
      { id: "m6", title: "30-day streak of morning walks", deadline: daysAgo(3), done: false },
    ] },
  { id: "rest", label: "Rest", sub: "Pond", thread: "nature", x: 30, y: 78, kind: "pond",
    stage: "growing", growth: 3, tended: 6, lastTs: daysAgo(3),
    note: "Quiet is returning: more sleep, slower evenings.",
    logs: [],
    milestones: [] },
  { id: "relationships", label: "Relationships", sub: "Meadow", thread: "relationships", x: 52, y: 80, kind: "meadow",
    stage: "sprout", growth: 2, tended: 3, lastTs: daysAgo(4),
    note: "Reconnecting — a few messages sent, the meadow stirring.",
    logs: [],
    milestones: [
      { id: "m7", title: "Call 3 old friends this month", deadline: daysFromNow(18), done: false },
    ] },
  { id: "ideas", label: "Ideas", sub: "Seedbed", thread: "ideas", x: 84, y: 74, kind: "seedbed",
    stage: "seed", growth: 0, tended: 1, lastTs: daysAgo(14),
    note: "Many seeds resting here, waiting for their season.",
    logs: [],
    milestones: [] },
];

// The Library — what you're reading & writing. `body` is markdown-ish plain text.
export const articles = [
  {
    id: "foundations", title: "On Building Foundations", thread: "philosophy",
    kind: "Essay", minutes: 4, dateLabel: "May 14, 2025",
    excerpt: "Why the slow, unglamorous work of laying roots is the work that lasts.",
    body: `Everyone wants the tree. Few want the years of quiet root.

A foundation is invisible by design. You do not admire it; you stand on it. The danger is that because no one claps for foundations, we skip them — and build tall things on sand.

Lay the roots. Build the system. Then let the season do what seasons do.

This is not patience for its own sake. It is a bet that depth compounds: that a small thing tended daily outgrows a large thing tended once.`,
  },
  {
    id: "long-walk", title: "Notes From a Long Walk", thread: "philosophy",
    kind: "Note", minutes: 2, dateLabel: "May 13, 2025",
    excerpt: "Three miles, no phone, and the outline finally clicked.",
    body: `Walked the long loop. No podcast, no notes app — just the problem and the road.

Somewhere around the second mile the essay reorganised itself without me. The argument I'd been forcing into three parts wanted only two.

Movement is a kind of thinking. The body walks the idea forward.`,
  },
  {
    id: "automation", title: "Shipping the Automation System", thread: "technology",
    kind: "Log", minutes: 3, dateLabel: "May 12, 2025",
    excerpt: "What broke, what held, and what I'd grow differently next time.",
    body: `The pipeline shipped. It is not elegant, but it is alive.

Three things held: small functions, boring data, and tests written before I was proud. Two things broke: the parts I rushed, and the parts I was too clever about.

A system, like a garden, rewards the gardener who returns.`,
  },
  {
    id: "iceland", title: "Iceland: A Travel Film Diary", thread: "travel",
    kind: "Book", minutes: 6, dateLabel: "Apr 28, 2025",
    excerpt: "Black sand, low light, and learning to film patience.",
    body: `The light in Iceland does not hurry, so neither could the camera.

I learned to hold a shot longer than felt comfortable, until the landscape started to breathe on its own. Most of the film is waiting. The rest is weather.`,
  },
];

export const threadById = Object.fromEntries(threads.map((t) => [t.id, t]));

// crops the user can choose for a bed
export const CROP_CHOICES = [
  { id: "flower", label: "Flower" },
  { id: "cabbage", label: "Cabbage" },
  { id: "carrot", label: "Carrot" },
  { id: "tomato", label: "Tomato" },
  { id: "leafy", label: "Leafy" },
];
