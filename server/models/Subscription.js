import mongoose from "mongoose";

/* A feed you follow. Items are fetched on demand and cached in memory — the
   posts themselves are never stored, only where to find them. */
const subscriptionSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  title: { type: String, default: "" },
  siteUrl: { type: String, default: "" },
  kind: { type: String, enum: ["rss", "youtube"], default: "rss" },
  regionId: { type: String, default: null },
  // when set, only items mentioning one of these words are surfaced
  topics: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  lastError: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);
