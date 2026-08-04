import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import regionsRouter from "./routes/regions.js";
import checkinsRouter from "./routes/checkins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visualspam-garden";

app.use(cors());
app.use(express.json());

app.use("/api/regions", regionsRouter);
app.use("/api/checkins", checkinsRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// In production, serve the built client. Checks both ../dist (monorepo) and
// ./dist (independent server deployment). Set SERVE_CLIENT=false to skip.
const serveClient = process.env.SERVE_CLIENT !== "false";
const clientDist = fs.existsSync(path.join(__dirname, "dist"))
  ? path.join(__dirname, "dist")
  : path.join(__dirname, "..", "dist");

if (serveClient && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

// Global error handler — never leave a request hanging on a bad payload.
app.use((err, req, res, next) => {
  console.error("API error:", err.message);
  const code = err.name === "ValidationError" || err.name === "CastError" ? 400 : 500;
  res.status(code).json({ error: err.message });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("connected to mongo");
    app.listen(PORT, () => console.log(`api on :${PORT}`));
  })
  .catch((err) => {
    console.error("mongo connection failed:", err.message);
    process.exit(1);
  });
