import { Router } from "express";
import Region from "../models/Region.js";

const router = Router();
// wrap async handlers so a rejection goes to the error middleware (never hangs)
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const STAGE_ORDER = ["seed", "sprout", "growing", "flourishing"];

function analyzeBed(region) {
  const now = Date.now();
  const lastTs = new Date(region.lastTs).getTime();
  const daysSinceWater = (now - lastTs) / 864e5;
  const stageIdx = STAGE_ORDER.indexOf(region.stage);
  const milestones = region.milestones || [];
  const pendingMs = milestones.filter((m) => !m.done);
  const doneMs = milestones.filter((m) => m.done);
  const overdueMs = pendingMs.filter((m) => new Date(m.deadline).getTime() < now);
  const soonMs = pendingMs.filter((m) => {
    const diff = (new Date(m.deadline).getTime() - now) / 864e5;
    return diff >= 0 && diff <= 3;
  });
  const logs = region.logs || [];
  const recentLogs = logs.filter((l) => (now - new Date(l.ts).getTime()) / 864e5 <= 7);
  const sunMins = region.sunshine || 0;

  let score = 50;
  if (region.stage === "flourishing") score += 20;
  else if (region.stage === "growing") score += 10;
  if (daysSinceWater < 2) score += 15;
  else if (daysSinceWater < 4) score += 5;
  else score -= 15;
  if (region.growth > 0) score += 5;
  if (doneMs.length > 0) score += Math.min(doneMs.length * 5, 15);
  if (overdueMs.length > 0) score -= overdueMs.length * 10;
  if (sunMins > 30) score += 5;
  if (recentLogs.length >= 3) score += 5;
  else if (recentLogs.length === 0) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const recs = [];
  if (daysSinceWater >= 4) {
    recs.push({ priority: "high", icon: "💧", text: `Needs water — last tended ${Math.floor(daysSinceWater)} days ago` });
  }
  if (overdueMs.length > 0) {
    recs.push({ priority: "high", icon: "⏰", text: `${overdueMs.length} overdue milestone${overdueMs.length > 1 ? "s" : ""}: ${overdueMs.map((m) => m.title).join(", ")}` });
  }
  if (soonMs.length > 0) {
    recs.push({ priority: "medium", icon: "📅", text: `${soonMs.length} milestone${soonMs.length > 1 ? "s" : ""} due within 3 days` });
  }
  if (region.growth === 0 && region.stage !== "flourishing") {
    recs.push({ priority: "medium", icon: "🌱", text: "No growth yet — tend this bed more often to advance its stage" });
  }
  if (sunMins === 0 && region.stage !== "seed") {
    recs.push({ priority: "low", icon: "☀️", text: "No sunshine logged — dedicate some focused time to this area" });
  }
  if (recentLogs.length === 0 && daysSinceWater > 2) {
    recs.push({ priority: "medium", icon: "📝", text: "No recent activity — even a quick note keeps the bed alive" });
  }
  if (region.stage === "flourishing" && doneMs.length === milestones.length && milestones.length > 0) {
    recs.push({ priority: "low", icon: "🌸", text: "All milestones complete! Time to set new goals or harvest this bed" });
  }
  if (region.growth === 3 && stageIdx < STAGE_ORDER.length - 1) {
    recs.push({ priority: "medium", icon: "🚀", text: `One more tending to reach the next stage` });
  }
  if (pendingMs.length === 0 && milestones.length === 0) {
    recs.push({ priority: "low", icon: "🎯", text: "No milestones set — define a goal to give this bed direction" });
  }

  const stageLabel = (STAGE_ORDER.includes(region.stage) ? region.stage : "seed");
  const stageNames = { seed: "seed", sprout: "sprouting", growing: "growing", flourishing: "flourishing" };
  const insight = `This bed is ${stageNames[stageLabel]}${region.stage !== "flourishing" ? `, ${region.growth}/4 toward the next stage` : " — in full bloom"}. ` +
    `It's been tended ${region.tended} time${region.tended !== 1 ? "s" : ""} with ${sunMins}m of sunshine total. ` +
    (overdueMs.length > 0 ? `${overdueMs.length} milestone${overdueMs.length > 1 ? "s are" : " is"} overdue.` :
     pendingMs.length > 0 ? `${pendingMs.length} milestone${pendingMs.length > 1 ? "s pending" : " pending"}.` :
     "No active milestones.");

  return {
    regionId: region.id,
    label: region.label,
    score,
    stage: region.stage,
    insight,
    recommendations: recs.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      return p[a.priority] - p[b.priority];
    }),
    stats: {
      daysSinceWater: Math.floor(daysSinceWater),
      totalSunshine: sunMins,
      tended: region.tended,
      growth: region.growth,
      milestonesDone: doneMs.length,
      milestonesTotal: milestones.length,
      recentActivity: recentLogs.length,
    },
  };
}

// ── Analysis (must come before /:id routes) ──
router.get("/analyze/all", w(async (req, res) => {
  const regions = await Region.find().sort({ x: 1 });
  const analyses = regions.map(analyzeBed);
  const avgScore = Math.round(analyses.reduce((s, a) => s + a.score, 0) / analyses.length);
  const highPriority = analyses.flatMap((a) => a.recommendations.filter((r) => r.priority === "high").map((r) => ({ ...r, bed: a.label })));
  res.json({ beds: analyses, avgScore, highPriority });
}));

router.get("/:id/analyze", w(async (req, res) => {
  const region = await Region.findOne({ id: req.params.id });
  if (!region) return res.status(404).json({ error: "not found" });
  res.json(analyzeBed(region));
}));

// ── Regions CRUD ──

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
