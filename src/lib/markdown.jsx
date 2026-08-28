/* Inline markdown shared by the editor preview, the admin reader and the
   public essay page — so what you type in one place renders the same in the
   other two. Returns React nodes, never HTML strings, so nothing a comment or
   an essay contains can inject markup. */

// Order matters: the two-character marks have to be tried before the
// single-character ones, or **bold** parses as *italic* wrapping *text*.
const RULES = [
  { re: /\*\*([\s\S]+?)\*\*/, tag: "strong" },
  { re: /__([\s\S]+?)__/, tag: "u" },
  { re: /~~([\s\S]+?)~~/, tag: "s" },
  { re: /==([\s\S]+?)==/, tag: "mark" },
  { re: /`([^`]+?)`/, tag: "code", raw: true },
  { re: /\[([^\]]+?)\]\(([^)\s]+?)\)/, tag: "a" },
  { re: /\*([\s\S]+?)\*/, tag: "em" },
  { re: /_([\s\S]+?)_/, tag: "em" },
];

const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/i;

export function renderInline(text, keyPrefix = "i") {
  if (!text) return null;
  const out = [];
  let rest = String(text);
  let n = 0;

  while (rest) {
    // find whichever mark appears earliest in what's left
    let best = null;
    for (const rule of RULES) {
      const m = rest.match(rule.re);
      if (m && (best === null || m.index < best.m.index)) best = { rule, m };
    }
    if (!best) {
      out.push(rest);
      break;
    }

    const { rule, m } = best;
    if (m.index > 0) out.push(rest.slice(0, m.index));

    const key = `${keyPrefix}-${n++}`;
    if (rule.tag === "a") {
      const href = m[2];
      // never render a javascript: or data: URL as a link
      if (SAFE_HREF.test(href)) {
        out.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer">
            {renderInline(m[1], key)}
          </a>
        );
      } else {
        out.push(m[1]);
      }
    } else if (rule.raw) {
      // code spans are literal — no nested parsing
      out.push(<code key={key}>{m[1]}</code>);
    } else {
      const Tag = rule.tag;
      out.push(<Tag key={key}>{renderInline(m[1], key)}</Tag>);
    }

    rest = rest.slice(m.index + m[0].length);
  }

  return out;
}

/* Renders a block's text, keeping single newlines as line breaks. */
export function renderText(text, keyPrefix = "t") {
  const lines = String(text || "").split("\n");
  return lines.map((line, i) => (
    <span key={`${keyPrefix}-${i}`}>
      {i > 0 && <br />}
      {renderInline(line, `${keyPrefix}-${i}`)}
    </span>
  ));
}

/* The formatting marks the editor toolbar can apply. */
export const MARKS = [
  { id: "bold", label: "B", title: "Bold", wrap: "**" },
  { id: "italic", label: "I", title: "Italic", wrap: "*" },
  { id: "underline", label: "U", title: "Underline", wrap: "__" },
  { id: "strike", label: "S", title: "Strikethrough", wrap: "~~" },
  { id: "mark", label: "H", title: "Highlight", wrap: "==" },
  { id: "code", label: "<>", title: "Code", wrap: "`" },
];

/* Wraps (or unwraps) the current selection of a textarea in a mark and
   returns the new value plus where the caret should land. */
export function applyMark(value, start, end, wrap) {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const w = wrap.length;

  // already wrapped? toggle it off
  if (
    selected.startsWith(wrap) &&
    selected.endsWith(wrap) &&
    selected.length >= w * 2
  ) {
    const inner = selected.slice(w, -w);
    return { value: before + inner + after, start, end: start + inner.length };
  }
  if (before.endsWith(wrap) && after.startsWith(wrap)) {
    return {
      value: before.slice(0, -w) + selected + after.slice(w),
      start: start - w,
      end: end - w,
    };
  }

  return {
    value: `${before}${wrap}${selected}${wrap}${after}`,
    start: start + w,
    end: end + w,
  };
}
