import * as api from "../api.js";

const KEY = "vsg_api_queue";
const MAX_RETRIES = 8;

// Jobs are persisted across reloads, so a job has to survive JSON.stringify.
// Functions do not — a queue of { fn } rehydrates as { } and every job then
// fails with "job.fn is not a function" forever, blocking every later write.
// So jobs store the *name* of an allowed action and we look the function up.
const ACTIONS = {
  updateRegion: api.updateRegion,
  createRegion: api.createRegion,
  deleteRegion: api.deleteRegion,
  updateEssay: api.updateEssay,
  createEssay: api.createEssay,
  deleteEssay: api.deleteEssay,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((j) => j && ACTIONS[j.action]) : [];
  } catch {
    return [];
  }
}

let queue = load();
let processing = false;
const listeners = new Set();

function persist() {
  try {
    // resolve/reject are per-session only; they must not reach localStorage.
    localStorage.setItem(
      KEY,
      JSON.stringify(queue.map(({ action, args, retries }) => ({ action, args, retries })))
    );
  } catch {}
  listeners.forEach((fn) => fn(queue.length));
}

async function drain() {
  if (processing || !queue.length) return;
  processing = true;
  try {
    while (queue.length) {
      const job = queue[0];
      try {
        const result = await ACTIONS[job.action](...job.args);
        queue.shift();
        persist();
        job.resolve?.(result);
      } catch (e) {
        job.retries = (job.retries || 0) + 1;
        if (job.retries >= MAX_RETRIES) {
          queue.shift();
          persist();
          job.reject?.(e);
          continue;
        }
        persist();
        const delay = Math.min(1000 * 2 ** (job.retries - 1), 60000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  } finally {
    processing = false;
  }
}

export function enqueue(action, ...args) {
  if (!ACTIONS[action]) return Promise.reject(new Error(`unknown queue action: ${action}`));
  return new Promise((resolve, reject) => {
    queue.push({ action, args, retries: 0, resolve, reject });
    persist();
    drain();
  });
}

export function queueLength() {
  return queue.length;
}

export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Pick up anything left over from a previous session.
drain();
