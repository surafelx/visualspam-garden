import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  type: { type: String, enum: ["water", "note", "sun", "grow", "checkin"], required: true },
  text: { type: String, default: "" },
  mins: { type: Number, default: 0 },
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  deadline: { type: Date, required: true },
  done: { type: Boolean, default: false },
  doneTs: { type: Date, default: null },
}, { _id: false });

const regionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  sub: { type: String, default: "" },
  thread: { type: String, required: true },
  x: { type: Number, default: 50 },
  y: { type: Number, default: 50 },
  kind: { type: String, default: "greenhouse" },
  stage: { type: String, enum: ["seed", "sprout", "growing", "flourishing"], default: "sprout" },
  growth: { type: Number, default: 0 },
  tended: { type: Number, default: 0 },
  sunshine: { type: Number, default: 0 },
  lastTs: { type: Date, default: Date.now },
  note: { type: String, default: "" },
  crop: { type: String, default: null },
  logs: [logSchema],
  milestones: [milestoneSchema],
}, { timestamps: true });

export default mongoose.model("Region", regionSchema);
