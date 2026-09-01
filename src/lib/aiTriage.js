/* Asks the model to sift incoming feed items: what is worth keeping, and
   which bed each one belongs to. Uses the OpenRouter key already in Settings,
   the same as the garden analysis and the writing analysis. */

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
const MAX_ITEMS = 25;

/* Models like to wrap JSON in prose or code fences. Pull out the array. */
export function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* items: [{ title, excerpt, source }]  beds: [{ id, label }]
   returns Map(index -> { keep, bedId, why }) */
export async function triageItems({ items, beds, settings }) {
  const apiKey = settings?.apiKey;
  if (!apiKey) throw new Error("Add an OpenRouter API key in Settings to use this.");
  if (!items.length) throw new Error("Nothing to sort.");

  const slice = items.slice(0, MAX_ITEMS);
  const bedList = beds.map((b) => `${b.id} = ${b.label}`).join("\n");
  const itemList = slice
    .map((it, i) => `${i}. [${it.source}] ${it.title}${it.excerpt ? ` — ${it.excerpt.slice(0, 160)}` : ""}`)
    .join("\n");

  const prompt = `You help someone tend a digital garden. Their beds are areas of life they are working on:

${bedList || "(no beds yet)"}

Below are items from feeds they follow. For each one decide:
- "keep": true if it is worth their attention given their beds, false if it is noise.
- "bed": the id of the single most relevant bed, or null if none fit.
- "why": at most 8 words on the connection.

Items:
${itemList}

Reply with ONLY a JSON array, one object per item, in the same order:
[{"i":0,"keep":true,"bed":"philosophy","why":"about attention and focus"}]`;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: settings.model || DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.2,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `AI request failed (${res.status})`);

  const parsed = extractJson(data.choices?.[0]?.message?.content);
  if (!parsed) throw new Error("The model did not return usable JSON.");

  const validBed = new Set(beds.map((b) => b.id));
  const out = new Map();
  parsed.forEach((row) => {
    const i = Number(row?.i);
    if (!Number.isInteger(i) || i < 0 || i >= slice.length) return;
    out.set(i, {
      keep: row.keep !== false,
      // never trust a bed id the garden does not have
      bedId: validBed.has(row.bed) ? row.bed : null,
      why: String(row.why || "").slice(0, 80),
    });
  });
  return out;
}

export { MAX_ITEMS };
