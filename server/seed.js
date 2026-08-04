import mongoose from "mongoose";
import Region from "./models/Region.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visualspam-garden";

const daysAgo = (n) => new Date(Date.now() - n * 864e5);

const seedRegions = [
  { id: "studio", label: "Studio", sub: "Greenhouse", thread: "technology", x: 80, y: 52, kind: "greenhouse",
    tended: 12, sunshine: 45, lastTs: daysAgo(2),
    note: "The AI automation system shipped — new experiments already sprouting under glass.",
    logs: [{ ts: daysAgo(2), type: "sun", text: "45m of sunshine", mins: 45 }, { ts: daysAgo(2), type: "water", text: "reviewed the pipeline" }],
    plants: [] },
  { id: "philosophy", label: "Philosophy", sub: "Grove", thread: "philosophy", x: 22, y: 58, kind: "grove",
    tended: 5, sunshine: 20, lastTs: daysAgo(5),
    note: "An essay is taking root, fed by three long walks of thought.",
    logs: [{ ts: daysAgo(5), type: "note", text: "long walk — outline clicked" }],
    plants: [] },
  { id: "business", label: "Business", sub: "Orchard", thread: "business", x: 40, y: 54, kind: "orchard",
    tended: 2, sunshine: 0, lastTs: daysAgo(7),
    note: "The first client proposal is planted. Early leaves showing.",
    logs: [],
    plants: [] },
  { id: "health", label: "Health", sub: "Herb Garden", thread: "health", x: 62, y: 62, kind: "herbs",
    tended: 20, sunshine: 90, lastTs: daysAgo(0),
    note: "Daily movement — the bed is dense, green and fragrant.",
    logs: [{ ts: daysAgo(0), type: "sun", text: "30m of sunshine", mins: 30 }, { ts: daysAgo(0), type: "water", text: "morning run" }],
    plants: [] },
  { id: "rest", label: "Rest", sub: "Pond", thread: "nature", x: 30, y: 78, kind: "pond",
    tended: 6, sunshine: 15, lastTs: daysAgo(3),
    note: "Quiet is returning: more sleep, slower evenings.",
    logs: [], plants: [] },
  { id: "relationships", label: "Relationships", sub: "Meadow", thread: "relationships", x: 52, y: 80, kind: "meadow",
    tended: 3, sunshine: 0, lastTs: daysAgo(4),
    note: "Reconnecting — a few messages sent, the meadow stirring.",
    logs: [],
    plants: [] },
  { id: "ideas", label: "Ideas", sub: "Seedbed", thread: "ideas", x: 84, y: 74, kind: "seedbed",
    tended: 1, sunshine: 0, lastTs: daysAgo(14),
    note: "Many seeds resting here, waiting for their season.",
    logs: [], plants: [] },
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
