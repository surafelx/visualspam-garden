import mongoose from "mongoose";

/* Your own filing system for the archive, independent of the garden's
   beds. A category with a parent is a subcategory; two levels is what the
   UI offers, though the shape allows deeper if that changes. */
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
  colour: { type: String, default: "" },
}, { timestamps: true });

// no two siblings with the same name
categorySchema.index({ parentId: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
