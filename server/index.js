import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import regionsRouter from "./routes/regions.js";
import checkinsRouter from "./routes/checkins.js";
import essaysRouter from "./routes/essays.js";
import commentsRouter from "./routes/comments.js";
import messagesRouter from "./routes/messages.js";
import Essay from "./models/Essay.js";
import { addClient, removeClient } from "./lib/broadcast.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visualspam-garden";

app.use(cors());
app.use(express.json());

app.use("/api/regions", regionsRouter);
app.use("/api/checkins", checkinsRouter);
app.use("/api/essays", essaysRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/messages", messagesRouter);
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ── SSE live sync ──
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = addClient(res);
  // Comment-only heartbeat: proxies and load balancers close idle streams.
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => {
    clearInterval(ping);
    removeClient(clientId);
  });
});

// In production, serve the built client. Checks both ../dist (monorepo) and
// ./dist (independent server deployment). Set SERVE_CLIENT=false to skip.
const serveClient = process.env.SERVE_CLIENT !== "false";
const clientDist = fs.existsSync(path.join(__dirname, "dist"))
  ? path.join(__dirname, "dist")
  : path.join(__dirname, "..", "dist");

const escapeHtml = (str) =>
  String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// Must match slugify() on the client, which is how essay URLs are built.
const slugify = (text) =>
  String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const setMeta = (html, attr, key, value) =>
  html.replace(
    new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
    `$1${escapeHtml(value)}$2`
  );

// Crawlers building a link preview do not run the client bundle, so a shared
// /essay/<slug> would otherwise preview with the generic site title. Fill the
// tags in server-side before handing over the shell.
async function pageHtml(reqPath, indexHtml) {
  const match = reqPath.match(/^\/essay\/([^/]+)\/?$/);
  if (!match) return indexHtml;

  const slug = decodeURIComponent(match[1]);
  let essay;
  try {
    const essays = await Essay.find({ draft: false })
      .select("title excerpt body")
      .lean();
    essay = essays.find((e) => slugify(e.title) === slug);
  } catch {
    return indexHtml;
  }
  if (!essay) return indexHtml;

  const title = `${essay.title} · Garden`;
  const description =
    (essay.excerpt || essay.body || "").replace(/\s+/g, " ").trim().slice(0, 200) ||
    "Essays, notes and logs.";

  let html = indexHtml.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`
  );
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  return html;
}

if (serveClient) {
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    const indexHtml = fs.readFileSync(path.join(clientDist, "index.html"), "utf8");
    app.use(express.static(clientDist));
    // SPA fallback: /essay/<slug> and friends are client routes, not files, so
    // a direct hit or a refresh has to be answered with index.html.
    app.get(/^(?!\/api).*/, async (req, res, next) => {
      try {
        res.type("html").send(await pageHtml(req.path, indexHtml));
      } catch (err) {
        next(err);
      }
    });
  } else {
    // Without this the server answers 404 for every page, which looks like a
    // routing bug rather than a missing build.
    console.warn(
      `No client build at ${clientDist} — run "npm run build", or set SERVE_CLIENT=false for API-only hosting.`
    );
  }
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
