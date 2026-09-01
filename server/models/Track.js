import mongoose from "mongoose";

/* A saved reference to a YouTube video — never the audio itself. Playback
   happens through YouTube's embed, so nothing here is a copy of the work. */
const trackSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  channel: { type: String, default: "" },
  thumbnail: { type: String, default: "" },
  regionId: { type: String, default: null, index: true },
  note: { type: String, default: "" },
}, { timestamps: true });

trackSchema.index({ regionId: 1, videoId: 1 }, { unique: true });

export default mongoose.model("Track", trackSchema);
