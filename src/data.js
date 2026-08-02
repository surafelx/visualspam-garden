// Mock data for the Garden home. This is the shape the real backend will fill
// later — Life Threads, garden Regions, Seeds (goals in-flight), Harvests
// (milestones reached), and today's ambient state.

export const you = { name: "Alex", identity: "Builder", identityIcon: "🛠️" };

export const today = {
  dateLabel: "Sunday · May 18, 2025",
  weather: { icon: "☀️", temp: "22°C", label: "Clear" },
  energy: 7, // out of 10
  mood: { icon: "🙂", label: "Good" },
  quote: {
    text: "The best time to plant a tree was 20 years ago. The second best time is today.",
    source: "Chinese proverb",
  },
  focus: ["Finish AI client proposal", "Record piano piece", "Morning workout"],
  chapter: {
    title: "Building Foundations",
    lines: ["Lay the roots.", "Build the system."],
  },
};

// Life Threads — the colour + emoji language used everywhere. A thread maps to
// a region of the garden.
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

// Regions placed in the garden. x/y are percentages within the garden canvas.
export const regions = [
  { id: "studio", label: "Studio", sub: "Greenhouse", thread: "technology", icon: "🪴", x: 70, y: 24, kind: "greenhouse" },
  { id: "philosophy", label: "Philosophy", sub: "Grove", thread: "philosophy", icon: "🌳", x: 30, y: 26, kind: "grove" },
  { id: "business", label: "Business", sub: "Orchard", thread: "business", icon: "🍎", x: 22, y: 46, kind: "orchard" },
  { id: "health", label: "Health", sub: "Herb Garden", thread: "health", icon: "🌱", x: 74, y: 47, kind: "herbs" },
  { id: "rest", label: "Rest", sub: "Pond", thread: "nature", icon: "🌙", x: 26, y: 70, kind: "pond" },
  { id: "relationships", label: "Relationships", sub: "Meadow", thread: "relationships", icon: "👥", x: 50, y: 74, kind: "meadow" },
  { id: "ideas", label: "Ideas", sub: "Seedbed", thread: "ideas", icon: "💡", x: 76, y: 70, kind: "seedbed" },
];

// Seeds — things quietly growing. stage: seed → sprout → (harvest elsewhere)
export const seeds = [
  { id: 1, name: "AI Documentary Series", thread: "documentary", stage: "sprout", agoLabel: "Seeded 3 days ago" },
  { id: 2, name: "Sustainable Home Design", thread: "architecture", stage: "sprout", agoLabel: "Seeded 1 week ago" },
  { id: 3, name: "Philosophy Essay", thread: "philosophy", stage: "seed", agoLabel: "Seeded 2 weeks ago" },
  { id: 4, name: "Music EP", thread: "music", stage: "sprout", agoLabel: "Seeded 3 weeks ago" },
  { id: 5, name: "Orphanage Project", thread: "relationships", stage: "seed", agoLabel: "Seeded 1 month ago" },
];

// Harvests — milestones already reached.
export const harvests = [
  { id: 1, name: "AI Automation System", thread: "technology", dateLabel: "May 12, 2025" },
  { id: 2, name: "Iceland Travel Film", thread: "travel", dateLabel: "Apr 28, 2025" },
  { id: 3, name: "Greenhouse Prototype", thread: "architecture", dateLabel: "Apr 15, 2025" },
];

export const nav = [
  { id: "garden", label: "Garden", icon: "🏡" },
  { id: "timeline", label: "Timeline", icon: "🗓️" },
  { id: "studio", label: "Studio", icon: "🎛️" },
  { id: "library", label: "Library", icon: "📚" },
  { id: "self", label: "Self", icon: "🧭" },
];

export const threadById = Object.fromEntries(threads.map((t) => [t.id, t]));
