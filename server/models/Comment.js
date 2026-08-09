import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  essayId: { type: String, required: true },
  author: { type: String, default: "Anonymous" },
  content: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("Comment", commentSchema);
