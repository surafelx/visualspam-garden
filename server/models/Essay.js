import mongoose from "mongoose";

const blockSchema = new mongoose.Schema({
  type: { type: String, enum: ["text", "h2", "h3", "image", "audio", "video"], default: "text" },
  content: { type: String, default: "" },
  url: { type: String, default: "" },
  caption: { type: String, default: "" },
}, { _id: false });

const essaySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  thread: { type: String, default: "philosophy" },
  kind: { type: String, enum: ["Essay", "Note", "Log", "Book"], default: "Essay" },
  minutes: { type: Number, default: 1 },
  dateLabel: { type: String, default: "" },
  excerpt: { type: String, default: "" },
  body: { type: String, default: "" },
  blocks: [blockSchema],
  bgMusic: { type: String, default: "" },
  draft: { type: Boolean, default: false },
  slug: { type: String, default: "" },
  regionId: { type: String, default: null },
  plantId: { type: String, default: null },
  fruitId: { type: String, default: null },
  reactions: { type: Map, of: Number, default: {} },
}, { timestamps: true });

export default mongoose.model("Essay", essaySchema);
