import mongoose from "mongoose";

const checkinSchema = new mongoose.Schema({
  ts: { type: Date, default: Date.now },
  note: { type: String, default: "checked in" },
  mood: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model("Checkin", checkinSchema);
