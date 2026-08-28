import { Router } from "express";
import Message from "../models/Message.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Messages are private contact-form submissions and carry the sender's email,
// so reading or mutating them requires the admin token. Only POST is open.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
if (!ADMIN_TOKEN) {
  console.warn("ADMIN_TOKEN is not set — /api/messages reads are disabled.");
}

const adminOnly = (req, res, next) => {
  if (!ADMIN_TOKEN || req.get("x-admin-token") !== ADMIN_TOKEN) {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
};

router.get("/", adminOnly, w(async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
}));

router.post("/", w(async (req, res) => {
  const { name = "", email = "", content } = req.body || {};
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: "content is required" });
  }
  const message = await Message.create({ name, email, content });
  // Never echo the stored document back to an anonymous sender.
  res.status(201).json({ ok: true, id: message._id });
}));

router.put("/:id", adminOnly, w(async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!message) return res.status(404).json({ error: "not found" });
  res.json(message);
}));

router.delete("/:id", adminOnly, w(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
