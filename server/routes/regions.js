import { Router } from "express";
import Region from "../models/Region.js";

const router = Router();
// wrap async handlers so a rejection goes to the error middleware (never hangs)
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET all regions
router.get("/", w(async (req, res) => {
  const regions = await Region.find().sort({ x: 1 });
  res.json(regions);
}));

// GET one region
router.get("/:id", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  res.json(region);
}));

// POST create region
router.post("/", w(async (req, res) => {
  const region = await Region.create(req.body);
  res.status(201).json(region);
}));

// PUT update region
router.put("/:id", w(async (req, res) => {
  const region = await Region.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!region) return res.status(404).json({ error: "not found" });
  res.json(region);
}));

// DELETE region
router.delete("/:id", w(async (req, res) => {
  const region = await Region.findOneAndDelete({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

// ── Logs ──
router.post("/:id/logs", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  region.logs.unshift(req.body);
  await region.save();
  res.status(201).json(region);
}));

router.delete("/:id/logs/:logIndex", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const idx = parseInt(req.params.logIndex, 10);
  if (idx < 0 || idx >= region.logs.length) return res.status(400).json({ error: "invalid index" });
  region.logs.splice(idx, 1);
  await region.save();
  res.json(region);
}));

// ── Milestones ──
router.post("/:id/milestones", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const ms = { id: `ms_${Date.now()}`, ...req.body }; // ensure an id
  region.milestones.push(ms);
  await region.save();
  res.status(201).json(region);
}));

router.put("/:id/milestones/:msId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const ms = region.milestones.find((m) => m.id === req.params.msId);
  if (!ms) return res.status(404).json({ error: "milestone not found" });
  Object.assign(ms, req.body);
  await region.save();
  res.json(region);
}));

router.delete("/:id/milestones/:msId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  region.milestones = region.milestones.filter((m) => m.id !== req.params.msId);
  await region.save();
  res.json(region);
}));

export default router;
