import { Router } from "express";
import Comment from "../models/Comment.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/:essayId", w(async (req, res) => {
  const comments = await Comment.find({ essayId: req.params.essayId }).sort({ createdAt: -1 });
  res.json(comments);
}));

// Public write endpoint: only accept the fields we expect, and cap their size.
router.post("/", w(async (req, res) => {
  const { essayId, author, content } = req.body || {};
  if (!essayId || !content || !String(content).trim()) {
    return res.status(400).json({ error: "essayId and content are required" });
  }
  const comment = await Comment.create({
    essayId: String(essayId).slice(0, 200),
    author: String(author || "Anonymous").trim().slice(0, 60) || "Anonymous",
    content: String(content).trim().slice(0, 4000),
  });
  res.status(201).json(comment);
}));

export default router;
