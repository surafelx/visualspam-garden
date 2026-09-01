import { Router } from "express";
import Subscription from "../models/Subscription.js";
import { loadFeed, normaliseFeedUrl, discoverFeed, clearCache } from "../lib/feeds.js";

const router = Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", w(async (req, res) => {
  res.json(await Subscription.find().sort({ title: 1 }));
}));

router.post("/", w(async (req, res) => {
  const raw = String(req.body?.url || "").trim();
  if (!/^https?:\/\//i.test(raw)) {
    return res.status(400).json({ error: "a full http(s) feed URL is required" });
  }
  const normalised = normaliseFeedUrl(raw);
  let url = normalised.url;
  const kind = normalised.kind;

  // people paste a site, not its feed — find the feed the site advertises,
  // then fall back to the paths publishers conventionally use
  let feed;
  try {
    url = await discoverFeed(url);
    feed = await loadFeed(url);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const existing = await Subscription.findOne({ url });
  if (existing) return res.status(200).json(existing);

  const sub = await Subscription.create({
    url,
    kind,
    title: req.body?.title || feed.title || url,
    siteUrl: feed.siteUrl || "",
    regionId: req.body?.regionId || null,
    topics: Array.isArray(req.body?.topics) ? req.body.topics.slice(0, 20) : [],
  });
  res.status(201).json(sub);
}));

router.put("/:id", w(async (req, res) => {
  const { title, regionId, active, topics } = req.body || {};
  const patch = {};
  if (title !== undefined) patch.title = String(title).slice(0, 200);
  if (regionId !== undefined) patch.regionId = regionId || null;
  if (active !== undefined) patch.active = !!active;
  if (topics !== undefined) {
    patch.topics = (Array.isArray(topics) ? topics : String(topics).split(","))
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20);
  }
  const sub = await Subscription.findByIdAndUpdate(req.params.id, patch, { new: true });
  if (!sub) return res.status(404).json({ error: "not found" });
  res.json(sub);
}));

router.delete("/:id", w(async (req, res) => {
  const sub = await Subscription.findByIdAndDelete(req.params.id);
  if (sub) clearCache(sub.url);
  res.json({ ok: true });
}));

/* Everything recent across the active subscriptions, newest first. One slow
   or broken feed reports itself instead of failing the whole request. */
router.get("/items", w(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const force = req.query.refresh === "1";
  const subs = await Subscription.find({ active: true });

  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        const feed = await loadFeed(sub.url, { force });
        if (sub.lastError) await Subscription.findByIdAndUpdate(sub._id, { lastError: "" });
        // a subscription with topics only surfaces what matches them
        const topics = sub.topics || [];
        const matches = (item) =>
          topics.length === 0 ||
          topics.some((t) => `${item.title} ${item.excerpt}`.toLowerCase().includes(t));
        return feed.items.filter(matches).map((item) => ({
          ...item,
          at: item.at ? new Date(item.at).toISOString() : null,
          source: sub.title,
          sourceId: String(sub._id),
          kind: sub.kind,
          regionId: sub.regionId,
        }));
      } catch (err) {
        await Subscription.findByIdAndUpdate(sub._id, { lastError: err.message });
        return [];
      }
    })
  );

  const items = results
    .flat()
    .filter((i) => i.url)
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, limit);

  res.json(items);
}));

export default router;
