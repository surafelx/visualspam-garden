import { Router } from "express";
import Essay from "../models/Essay.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Essays CRUD ──

router.get("/", w(async (req, res) => {
  const essays = await Essay.find().sort({ createdAt: -1 });
  res.json(essays);
}));

router.get("/public", w(async (req, res) => {
  const essays = await Essay.find({ draft: false }).sort({ createdAt: -1 });
  res.json(essays);
}));

router.get("/:id", w(async (req, res) => {
  const essay = await Essay.findOne({ id: req.params.id });
  if (!essay) return res.status(404).json({ error: "not found" });
  res.json(essay);
}));

router.post("/", w(async (req, res) => {
  const essay = await Essay.create(req.body);
  res.status(201).json(essay);
}));

router.put("/:id", w(async (req, res) => {
  const essay = await Essay.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!essay) return res.status(404).json({ error: "not found" });
  res.json(essay);
}));

router.delete("/:id", w(async (req, res) => {
  const essay = await Essay.findOneAndDelete({ id: req.params.id });
  if (!essay) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

export default router;
