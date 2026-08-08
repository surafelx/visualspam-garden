import { useState, useCallback } from "react";

function getBlocksText(blocks) {
  if (!blocks || blocks.length === 0) return "";
  return blocks
    .filter((b) => b.type === "text" || b.type === "h2" || b.type === "h3")
    .map((b) => b.content)
    .join("\n\n");
}

export default function WritingAnalysis({ article, settings, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const analyze = useCallback(async () => {
    if (!settings?.apiKey) {
      setError("Add an OpenRouter API key in Settings to use AI analysis.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const blocksText = getBlocksText(article.blocks);
    const prompt = `You are a professional writing editor. Analyze the following ${article.kind || "essay"} and provide constructive feedback. Be specific and actionable.

Focus on these areas:
- **Spelling**: Any misspelled words
- **Grammar**: Grammatical errors or awkward phrasing
- **Structure**: Organization, flow, paragraph order, transitions
- **Clarity**: Unclear sentences, wordiness, passive voice overuse
- **Style**: Tone consistency, word variety, readability

For each issue found, provide:
1. The category (Spelling/Grammar/Structure/Clarity/Style)
2. The original text (quote the problematic passage)
3. A suggested fix or improvement
4. A brief explanation of why it's an issue

If the writing is strong in an area, mention that too — don't just list problems.

At the end, provide:
- An overall quality score out of 10
- A 2-3 sentence summary of the top things to improve

Title: ${article.title}
Thread: ${article.thread || "general"}
Kind: ${article.kind || "Essay"}

Content:
${blocksText}`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model || "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `API error: ${res.status}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response from AI model");
      setResult(text);
    } catch (e) {
      setError(e.message || "Analysis failed. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  }, [article, settings]);

  return (
    <div className="wa-panel">
      <div className="wa-head">
        <h3 className="wa-title">✍️ Writing Analysis</h3>
        <button className="wa-close" onClick={onClose}>✕</button>
      </div>

      {!result && !loading && !error && (
        <div className="wa-intro">
          <p>AI-powered check for spelling, grammar, structure, and style issues.</p>
          <p className="wa-note">Requires an OpenRouter API key in Settings.</p>
          <button className="wa-btn" onClick={analyze} disabled={!settings?.apiKey}>
            Analyze Writing
          </button>
        </div>
      )}

      {loading && (
        <div className="wa-loading">
          <div className="wa-spinner" />
          <span>Analyzing…</span>
        </div>
      )}

      {error && (
        <div className="wa-error">
          <p>{error}</p>
          <button className="wa-btn" onClick={analyze}>Retry</button>
        </div>
      )}

      {result && (
        <div className="wa-result">
          <div className="wa-result-body">
            {result.split("\n").map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <br key={i} />;
              if (trimmed.startsWith("##") || trimmed.startsWith("**") && trimmed.endsWith("**")) {
                const text = trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "");
                return <h4 key={i} className="wa-result-heading">{text}</h4>;
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return <div key={i} className="wa-result-item">{trimmed.slice(2)}</div>;
              }
              if (/^\d+\.\s/.test(trimmed)) {
                return <div key={i} className="wa-result-item">{trimmed}</div>;
              }
              return <p key={i} className="wa-result-line">{trimmed}</p>;
            })}
          </div>
          <div className="wa-result-actions">
            <button className="wa-btn wa-btn-secondary" onClick={() => setResult(null)}>Clear</button>
            <button className="wa-btn" onClick={analyze}>Re-analyze</button>
          </div>
        </div>
      )}
    </div>
  );
}
