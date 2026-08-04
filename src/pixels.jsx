// Top-down pixel-art sprites (crisp SVG rects). Letters map to colours; L/P take
// the region's thread colour (so flower petals carry the thread's identity).
const FIXED = {
  T: "#6b4a2b", // trunk / wood
  V: "#4e8c3f", // tree canopy light
  v: "#37692b", // tree canopy dark
  r: "#d1493f", // fruit
  G: "#57a05f", // leaf light
  g: "#3c7a49", // leaf dark
  O: "#ffd94a", // flower centre
  C: "#e08a3a", // carrot
  R: "#d1443a", // tomato
  B: "#74b45c", // cabbage light
  b: "#4e8c43", // cabbage dark
  W: "#4aa6cf", // water
  w: "#9aa0a8", // stone light
  s: "#6a7078", // stone dark
  M: "#5a4230", // soil mound
  D: "#3f2c1d", // dark soil
  K: "#4e8c3f", // grass tuft
  e: "#eef3ea", // white petal
  Y: "#ffd700", // star gold
  F: "#ffe066", // firefly glow
  u: "#c8e6ff", // cloud white
  U: "#a8d4f0", // cloud shadow
  N: "#f5c842", // sun body
  n: "#e8a020", // sun ray
  H: "#5a8a3c", // hill light
  h: "#3d6a28", // hill dark
  l: "#c05020", // autumn leaf
  S: "#e8eef5", // snow
};

function hexA(hex, a) {
  const n = hex.replace("#", "");
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`;
}

export const SPRITES = {
  // crop maturity (shared)
  seed: [".......", "...L...", ".MMMMM.", "MMMMMMM"],
  sprout: [".......", "..L.L..", "..LLL..", "...S...", ".MMMMM.", "MMMMMMM"],
  leafy: [
    "..GGG..",
    ".GgGgG.",
    "GGGgGGG",
    "GgGGGgG",
    "GGGgGGG",
    ".GgGgG.",
    "..GGG..",
  ],
  // full crops — more detailed so they read as real plants
  flower: [
    "..P.P..",
    ".PPPPP.",
    "PPOOOPP",
    "PPOOOPP",
    "PPOOOPP",
    ".PPPPP.",
    "..P.P..",
  ],
  cabbage: [
    "..bbb..",
    ".bBBBb.",
    "bBGGGBb",
    "bBGgGBb",
    "bBGGGBb",
    ".bBBBb.",
    "..bbb..",
  ],
  carrot: [
    ".G.G.G.",
    "GGGGGGG",
    ".GGGGG.",
    "..CCC..",
    "..CCC..",
    "...C...",
  ],
  tomato: [
    ".GGGGG.",
    "GGGGGGG",
    "GGrGrGG",
    "GgGGGgG",
    "GrGGGrG",
    "GGGGGGG",
    ".GGGGG.",
  ],
  // decorations
  tree: [
    "...VVVVV...",
    "..VVVvVVV..",
    ".VVrVVVrVV.",
    "VVVVVVVVVVV",
    "VvVVVrVVVvV",
    "VVVVVVVVVVV",
    ".VVrVVVVvV.",
    "..VVVVVVV..",
    "...VVVVV...",
    "....TTT....",
  ],
  well: [
    "TwwwwwT",
    "wWWWWWw",
    "wWWWWWw",
    "wWWWWWw",
    "sssssss",
    "T.....T",
    "T.....T",
  ],
  pond: ["..WWWWW..", ".WWWWWWW.", "WWWWWWWWW", ".WWWWWWW.", "..WWWWW.."],
  sign: ["TTTTTT", "T....T", "TTTTTT", "..TT..", "..TT.."],
  can: [".sss..", "sssss.", "sssssS", "sssss.", ".sss.."],
  tuft: ["K.K.K", "KKKKK"],
  daisy: [".e.", "eOe", ".e."],
  // scene sprites
  cloud: ["..uuuu..", "uuuuuuuu", "uuUuUuuu", ".uuuuuu."],
  sun: [".nnn.", "nNNNn", "nNNNn", "nNNNn", ".nnn."],
  hill: [".hHHHh.", "hHHHHHh", "HHHHHHH", "HHHHHHH"],
  leaf: ["..l..", ".lLl.", "lLLLl", ".lLl.", "..l.."],
  snow: [".S.S.", "SSSSS", "S.S.S", "SSSSS", ".S.S."],
};

export function PixelSprite({ kind, color = "#8fe39a", size = 40 }) {
  const rows = SPRITES[kind] || SPRITES.leafy;
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
          return c ? <rect key={`${x}-${y}`} x={x} y={y} width="1.03" height="1.03" fill={c} /> : null;
        })
      )}
    </svg>
  );
}
