import { Router } from "express";
import Region from "../models/Region.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Regions CRUD ──

router.get("/", w(async (req, res) => {
  const regions = await Region.find().sort({ x: 1 });
  res.json(regions);
}));

router.get("/:id", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  res.json(region);
}));

router.post("/", w(async (req, res) => {
  const region = await Region.create(req.body);
  res.status(201).json(region);
}));

router.put("/:id", w(async (req, res) => {
  const region = await Region.findOneAndUpdate(
    { id: req.params.id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!region) return res.status(404).json({ error: "not found" });
  res.json(region);
}));

router.delete("/:id", w(async (req, res) => {
  const region = await Region.findOneAndDelete({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

// ── Plants ──
router.post("/:id/plants", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const plant = { id: `plant_${Date.now()}`, fruits: [], ...req.body };
  if (!region.plants) region.plants = [];
  region.plants.push(plant);
  await region.save();
  res.status(201).json(region);
}));

router.put("/:id/plants/:plantId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const plant = (region.plants || []).find((p) => p.id === req.params.plantId);
  if (!plant) return res.status(404).json({ error: "plant not found" });
  Object.assign(plant, req.body);
  await region.save();
  res.json(region);
}));

router.delete("/:id/plants/:plantId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  region.plants = (region.plants || []).filter((p) => p.id !== req.params.plantId);
  await region.save();
  res.json(region);
}));

// ── Fruits (on a specific plant) ──
router.post("/:id/plants/:plantId/fruits", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const plant = (region.plants || []).find((p) => p.id === req.params.plantId);
  if (!plant) return res.status(404).json({ error: "plant not found" });
  const fruit = { id: `fruit_${Date.now()}`, ...req.body };
  if (!plant.fruits) plant.fruits = [];
  plant.fruits.push(fruit);
  await region.save();
  res.status(201).json(region);
}));

router.put("/:id/plants/:plantId/fruits/:fruitId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const plant = (region.plants || []).find((p) => p.id === req.params.plantId);
  if (!plant) return res.status(404).json({ error: "plant not found" });
  const fruit = (plant.fruits || []).find((f) => f.id === req.params.fruitId);
  if (!fruit) return res.status(404).json({ error: "fruit not found" });
  Object.assign(fruit, req.body);
  await region.save();
  res.json(region);
}));

router.delete("/:id/plants/:plantId/fruits/:fruitId", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  const plant = (region.plants || []).find((p) => p.id === req.params.plantId);
  if (!plant) return res.status(404).json({ error: "plant not found" });
  plant.fruits = (plant.fruits || []).filter((f) => f.id !== req.params.fruitId);
  await region.save();
  res.json(region);
}));

export default router;
