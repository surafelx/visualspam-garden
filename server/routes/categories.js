import { Router } from "express";
import Category from "../models/Category.js";
import Track from "../models/Track.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", w(async (req, res) => {
  const cats = await Category.find().sort({ name: 1 }).lean();
  // how many archive entries sit in each, so the UI can show counts
  const counts = await Track.aggregate([
    { $match: { categoryId: { $ne: null } } },
    { $group: { _id: "$categoryId", n: { $sum: 1 } } },
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(cats.map((c) => ({ ...c, count: byId[String(c._id)] || 0 })));
}));

router.post("/", w(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "a name is required" });

  const parentId = req.body?.parentId || null;
  if (parentId) {
    const parent = await Category.findById(parentId);
    if (!parent) return res.status(400).json({ error: "that parent category does not exist" });
    // keep it to two levels so the UI stays honest about what it shows
    if (parent.parentId) {
      return res.status(400).json({ error: "subcategories cannot have subcategories" });
    }
  }

  try {
    const cat = await Category.create({
      name: name.slice(0, 80),
      parentId,
      colour: String(req.body?.colour || "").slice(0, 20),
    });
    res.status(201).json({ ...cat.toObject(), count: 0 });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "there is already one of those here" });
    }
    throw err;
  }
}));

router.put("/:id", w(async (req, res) => {
  const patch = {};
  if (req.body?.name !== undefined) patch.name = String(req.body.name).trim().slice(0, 80);
  if (req.body?.colour !== undefined) patch.colour = String(req.body.colour).slice(0, 20);
  if (!patch.name && req.body?.name !== undefined) {
    return res.status(400).json({ error: "a name is required" });
  }
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, patch, { new: true });
    if (!cat) return res.status(404).json({ error: "not found" });
    res.json(cat);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "there is already one of those here" });
    }
    throw err;
  }
}));

/* Deleting a category takes its subcategories with it. Archived entries are
   never deleted — they just lose the label. */
router.delete("/:id", w(async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) return res.status(404).json({ error: "not found" });

  const children = await Category.find({ parentId: cat._id }).select("_id").lean();
  const ids = [cat._id, ...children.map((c) => c._id)];

  const { modifiedCount } = await Track.updateMany(
    { categoryId: { $in: ids } },
    { $set: { categoryId: null } }
  );
  await Category.deleteMany({ _id: { $in: ids } });

  res.json({ ok: true, removed: ids.length, unfiled: modifiedCount });
}));

export default router;
