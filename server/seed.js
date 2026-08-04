import mongoose from "mongoose";
import Region from "./models/Region.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visualspam-garden";

const daysAgo = (n) => new Date(Date.now() - n * 864e5);
const daysFromNow = (n) => new Date(Date.now() + n * 864e5);

const seedRegions = [
  { id: "studio", label: "Studio", sub: "Greenhouse", thread: "technology", x: 80, y: 52, kind: "greenhouse",
    stage: "flourishing", growth: 2, tended: 12, sunshine: 45, lastTs: daysAgo(2),
    note: "The AI automation system shipped — new experiments already sprouting under glass.",
    logs: [{ ts: daysAgo(2), type: "sun", text: "45m of sunshine", mins: 45 }, { ts: daysAgo(2), type: "water", text: "reviewed the pipeline" }],
    milestones: [
      { id: "m1", title: "Ship v1.0 of the automation tool", deadline: daysFromNow(14), done: true, doneTs: daysAgo(2) },
      { id: "m2", title: "Write 3 blog posts about the build", deadline: daysFromNow(30), done: false },
    ] },
  { id: "philosophy", label: "Philosophy", sub: "Grove", thread: "philosophy", x: 22, y: 58, kind: "grove",
    stage: "growing", growth: 2, tended: 5, sunshine: 20, lastTs: daysAgo(5),
    note: "An essay is taking root, fed by three long walks of thought.",
    logs: [{ ts: daysAgo(5), type: "note", text: "long walk — outline clicked" }],
    milestones: [
      { id: "m3", title: "Finish first draft of essay", deadline: daysFromNow(5), done: false },
    ] },
  { id: "business", label: "Business", sub: "Orchard", thread: "business", x: 40, y: 54, kind: "orchard",
    stage: "sprout", growth: 1, tended: 2, sunshine: 0, lastTs: daysAgo(7),
    note: "The first client proposal is planted. Early leaves showing.",
    logs: [],
    milestones: [
      { id: "m4", title: "Send 5 client proposals", deadline: daysFromNow(21), done: false },
    ] },
  { id: "health", label: "Health", sub: "Herb Garden", thread: "health", x: 62, y: 62, kind: "herbs",
    stage: "flourishing", growth: 3, tended: 20, sunshine: 90, lastTs: daysAgo(0),
    note: "Daily movement — the bed is dense, green and fragrant.",
    logs: [{ ts: daysAgo(0), type: "sun", text: "30m of sunshine", mins: 30 }, { ts: daysAgo(0), type: "water", text: "morning run" }],
    milestones: [
      { id: "m5", title: "Run a 5K without stopping", deadline: daysFromNow(10), done: false },
      { id: "m6", title: "30-day streak of morning walks", deadline: daysAgo(3), done: false },
    ] },
  { id: "rest", label: "Rest", sub: "Pond", thread: "nature", x: 30, y: 78, kind: "pond",
    stage: "growing", growth: 3, tended: 6, sunshine: 15, lastTs: daysAgo(3),
    note: "Quiet is returning: more sleep, slower evenings.",
    logs: [], milestones: [] },
  { id: "relationships", label: "Relationships", sub: "Meadow", thread: "relationships", x: 52, y: 80, kind: "meadow",
    stage: "sprout", growth: 2, tended: 3, sunshine: 0, lastTs: daysAgo(4),
    note: "Reconnecting — a few messages sent, the meadow stirring.",
    logs: [],
    milestones: [
      { id: "m7", title: "Call 3 old friends this month", deadline: daysFromNow(18), done: false },
    ] },
  { id: "ideas", label: "Ideas", sub: "Seedbed", thread: "ideas", x: 84, y: 74, kind: "seedbed",
    stage: "seed", growth: 0, tended: 1, sunshine: 0, lastTs: daysAgo(14),
    note: "Many seeds resting here, waiting for their season.",
    logs: [], milestones: [] },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("connected to mongo");

  const count = await Region.countDocuments();
  if (count > 0) {
    console.log(`database already has ${count} regions — skipping seed`);
  } else {
    await Region.insertMany(seedRegions);
    console.log(`seeded ${seedRegions.length} regions`);
  }

  await mongoose.disconnect();
  console.log("done");
}

seed().catch((err) => { console.error(err); process.exit(1); });
