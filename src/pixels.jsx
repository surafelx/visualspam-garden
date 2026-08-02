// Tiny hand-made pixel-art sprites, drawn as crisp SVG rects. Letters map to
// colours; L/P/A take the region's thread colour so each plant is tinted.
const FIXED = {
  T: "#6b4a2b", // trunk
  S: "#4f9a5f", // stem
  W: "#3f93b4", // water
  F: "#33453a", // frame
  D: "#3a2e22", // soil
  R: "#3f7a4e", // grass
};

function hexA(hex, a) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const SPRITES = {
  // early growth stages (universal, tinted by thread)
  seed: [
    ".......",
    "...P...",
    "..DDD..",
    ".DDDDD.",
    "DDDDDDD",
  ],
  sprout: [
    ".......",
    "..L.L..",
    "..LLL..",
    "...S...",
    "..DDD..",
    ".DDDDD.",
  ],
  grove: [
    "..LLLL..",
    ".LLLLLL.",
    "LLLLLLLL",
    "LLLLLLLL",
    ".LLLLLL.",
    "..LLLL..",
    "...TT...",
    "...TT...",
  ],
  orchard: [
    "..LLLL..",
    ".LLLLLL.",
    "LLLLLLLL",
    ".LLPLLL.",
    "..LLLL..",
    "...TT...",
    "...TT...",
  ],
  greenhouse: [
    "...FF...",
    "..FFFF..",
    ".FFFFFF.",
    "FFFFFFFF",
    "FAAAAAAF",
    "FAAAAAAF",
    "FAAAAAAF",
    "FFFFFFFF",
  ],
  herbs: [
    "........",
    ".L.L.L.L",
    "LLL.LLL.",
    ".S.S.S.S",
    ".S.S.S.S",
    "DDDDDDDD",
  ],
  pond: [
    "..WWWWWW..",
    ".WWWWWWWW.",
    "WWWWWWWWWW",
    ".WWWWWWWW.",
    "..WWWWWW..",
  ],
  meadow: [
    "..........",
    "...PP.....",
    "..PPPP...P",
    "...S....PP",
    ".L.S..L.S.",
    "RRRRRRRRRR",
  ],
  seedbed: [
    ".......",
    "..L.L..",
    "..LLL..",
    "...S...",
    "...S...",
    "..DDD..",
  ],
};

export function PixelSprite({ kind, color, size = 78 }) {
  const rows = SPRITES[kind] || SPRITES.grove;
  const w = rows[0].length, h = rows.length;
  const colorFor = (ch) => {
    if (ch === "L" || ch === "P") return color;
    if (ch === "A") return hexA(color, 0.5);
    return FIXED[ch] || null;
  };
  return (
    <svg className="psprite" viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges"
      style={{ width: size, height: (size * h) / w }} aria-hidden>
      {rows.map((row, y) =>
        [...row].map((ch, x) => {
          const c = colorFor(ch);
          return c ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={c} /> : null;
        })
      )}
    </svg>
  );
}
