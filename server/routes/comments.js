import { Router } from "express";
import Comment from "../models/Comment.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/:essayId", w(async (req, res) => {
  const comments = await Comment.find({ essayId: req.params.essayId }).sort({ createdAt: -1 });
  res.json(comments);
}));

router.post("/", w(async (req, res) => {
  const comment = await Comment.create(req.body);
  res.status(201).json(comment);
}));

export default router;
