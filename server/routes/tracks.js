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
  const {
    url, kind = "link", videoId = "", title, channel = "", thumbnail = "",
    regionId = null, plantId = null, fruitId = null, categoryId = null,
    note = "", transcript = "",
  } = req.body || {};
  if (!url || !title) {
    return res.status(400).json({ error: "url and title are required" });
  }
  const doc = {
    url: String(url).slice(0, 2000),
    kind: ["video", "audio", "image", "link"].includes(kind) ? kind : "link",
    videoId: String(videoId).slice(0, 32),
    title: String(title).slice(0, 300),
    channel: String(channel).slice(0, 200),
    thumbnail: String(thumbnail).slice(0, 500),
    regionId: regionId || null,
    plantId: plantId || null,
    fruitId: fruitId || null,
    categoryId: categoryId || null,
    note: String(note).slice(0, 500),
    transcript: String(transcript).slice(0, 100000),
  };
  try {
    const track = await Track.create(doc);
    res.status(201).json(track);
  } catch (err) {
    // the compound index makes saving the same track to a bed twice a no-op
    if (err.code === 11000) {
      // saving the same link to the same bed twice is a no-op, not an error
      const existing = await Track.findOne({ url: doc.url, regionId: doc.regionId });
      if (existing) return res.status(200).json(existing);
      // a collision with no matching row means a stale index is rejecting a
      // valid write — say so instead of answering with null
      return res.status(409).json({ error: "conflicted with an existing index" });
    }
    throw err;
  }
}));

router.put("/:id", w(async (req, res) => {
  const { regionId, plantId, fruitId, categoryId, note, transcript } = req.body || {};
  const patch = {};
  if (regionId !== undefined) {
    patch.regionId = regionId || null;
    // moving a track to another bed must not leave it pointing at a fruit
    // that lives in the bed it came from
    patch.plantId = null;
    patch.fruitId = null;
  }
  if (plantId !== undefined) patch.plantId = plantId || null;
  if (categoryId !== undefined) patch.categoryId = categoryId || null;
  if (fruitId !== undefined) patch.fruitId = fruitId || null;
  if (note !== undefined) patch.note = String(note).slice(0, 500);
  if (transcript !== undefined) patch.transcript = String(transcript).slice(0, 100000);
  const track = await Track.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!track) return res.status(404).json({ error: "not found" });
  res.json(track);
}));

router.delete("/:id", w(async (req, res) => {
  await Track.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
