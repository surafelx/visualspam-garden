import mongoose from "mongoose";

/* An archived reference to something on the web — a link, never a copy of the
   thing itself. YouTube entries keep a videoId so they can play through
   YouTube's own embed. */
const trackSchema = new mongoose.Schema({
  url: { type: String, required: true },
  kind: { type: String, enum: ["video", "audio", "image", "link"], default: "link" },
  videoId: { type: String, default: "" },
  title: { type: String, required: true },
  channel: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  regionId: { type: String, default: null, index: true },
  // your own filing, independent of the garden's beds
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  // an entry can hang off a specific fruit inside a bed, not just the bed
  plantId: { type: String, default: null },
  fruitId: { type: String, default: null },
  note: { type: String, default: "" },
  transcript: { type: String, default: "" },
}, { timestamps: true });

// the same link can sit in two different beds, but not twice in one
trackSchema.index({ regionId: 1, url: 1 }, { unique: true });

export default mongoose.model("Track", trackSchema);
