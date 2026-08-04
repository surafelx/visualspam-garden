import { Router } from "express";
import Checkin from "../models/Checkin.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", w(async (req, res) => {
  const checkins = await Checkin.find().sort({ ts: -1 });
  res.json(checkins);
}));

router.post("/", w(async (req, res) => {
  const checkin = await Checkin.create(req.body);
  res.status(201).json(checkin);
}));

router.delete("/:id", w(async (req, res) => {
  const checkin = await Checkin.findByIdAndDelete(req.params.id);
  if (!checkin) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
}));

export default router;
