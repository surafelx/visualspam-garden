import { Router } from "express";
import Track from "../models/Track.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/tracks           — everything
// GET /api/tracks?regionId= — one bed ("none" for tracks not tied to a bed)
router.get("/", w(async (req, res) => {
  const { regionId } = req.query;
  const filter = {};
  if (regionId) filter.regionId = regionId === "none" ? null : regionId;
  const tracks = await Track.find(filter).sort({ createdAt: -1 });
  res.json(tracks);
}));

router.post("/", w(async (req, res) => {
  const { videoId, title, channel = "", thumbnail = "", regionId = null, note = "" } = req.body || {};
  if (!videoId || !title) {
    return res.status(400).json({ error: "videoId and title are required" });
  }
  const doc = {
    videoId: String(videoId).slice(0, 32),
    title: String(title).slice(0, 300),
    channel: String(channel).slice(0, 200),
    thumbnail: String(thumbnail).slice(0, 500),
    regionId: regionId || null,
    note: String(note).slice(0, 500),
  };
  try {
    const track = await Track.create(doc);
    res.status(201).json(track);
  } catch (err) {
    // the compound index makes saving the same track to a bed twice a no-op
    if (err.code === 11000) {
      const existing = await Track.findOne({ videoId: doc.videoId, regionId: doc.regionId });
      return res.status(200).json(existing);
    }
    throw err;
  }
}));

router.put("/:id", w(async (req, res) => {
  const { regionId, note } = req.body || {};
  const patch = {};
  if (regionId !== undefined) patch.regionId = regionId || null;
  if (note !== undefined) patch.note = String(note).slice(0, 500);
  const track = await Track.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!track) return res.status(404).json({ error: "not found" });
  res.json(track);
}));

router.delete("/:id", w(async (req, res) => {
  await Track.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
