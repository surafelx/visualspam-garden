import { Router } from "express";
import Message from "../models/Message.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", w(async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
}));

router.post("/", w(async (req, res) => {
  const message = await Message.create(req.body);
  res.status(201).json(message);
}));

router.put("/:id", w(async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!message) return res.status(404).json({ error: "not found" });
  res.json(message);
}));

router.delete("/:id", w(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
