import { PixelSprite } from "../pixels.jsx";

const STARS = [
  { x: 12, y: 8, s: 3, d: "0s" },
  { x: 28, y: 14, s: 2, d: "1.2s" },
  { x: 45, y: 6, s: 3, d: "0.5s" },
  { x: 62, y: 18, s: 2, d: "2s" },
  { x: 78, y: 10, s: 3, d: "0.8s" },
  { x: 88, y: 5, s: 2, d: "1.7s" },
  { x: 35, y: 3, s: 2, d: "2.5s" },
  { x: 55, y: 12, s: 3, d: "0.3s" },
  { x: 70, y: 4, s: 2, d: "1.5s" },
  { x: 20, y: 20, s: 2, d: "3s" },
];

const FIREFLIES = [
  { x: 25, y: 55, d: "0s", dur: "6s" },
  { x: 40, y: 65, d: "1.5s", dur: "7s" },
  { x: 60, y: 50, d: "3s", dur: "5.5s" },
  { x: 75, y: 60, d: "0.8s", dur: "8s" },
  { x: 50, y: 70, d: "2.2s", dur: "6.5s" },
  { x: 15, y: 58, d: "4s", dur: "7.5s" },
];

const PLANTS = [
  { x: 8, kind: "tree", size: 48, delay: "0s" },
  { x: 22, kind: "daisy", size: 14, delay: "-1.3s" },
  { x: 35, kind: "flower", size: 18, delay: "-0.7s" },
  { x: 52, kind: "tree", size: 40, delay: "-2s" },
  { x: 68, kind: "tuft", size: 14, delay: "-1s" },
  { x: 82, kind: "flower", size: 16, delay: "-1.8s" },
  { x: 92, kind: "daisy", size: 12, delay: "-0.5s" },
];

export default function PixelScene() {
  return (
    <div className="pixel-scene" aria-hidden>
      {/* stars */}
      {STARS.map((star, i) => (
        <span key={`s${i}`} className="scene-star"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s, animationDelay: star.d }} />
      ))}

      {/* sun */}
      <span className="scene-sun" style={{ left: "10%", top: "8%" }}>
        <PixelSprite kind="sun" size={56} />
      </span>

      {/* clouds */}
      <span className="scene-cloud cloud-1" style={{ top: "12%" }}>
        <PixelSprite kind="cloud" size={56} />
      </span>
      <span className="scene-cloud cloud-2" style={{ top: "20%" }}>
        <PixelSprite kind="cloud" size={72} />
      </span>
      <span className="scene-cloud cloud-3" style={{ top: "8%" }}>
        <PixelSprite kind="cloud" size={44} />
      </span>

      {/* hills */}
      <span className="scene-hill hill-back" style={{ bottom: "18%" }}>
        <PixelSprite kind="hill" size={200} />
      </span>
      <span className="scene-hill hill-front" style={{ bottom: "12%" }}>
        <PixelSprite kind="hill" size={280} />
      </span>

      {/* ground */}
      <div className="scene-ground" />

      {/* plants */}
      {PLANTS.map((p, i) => (
        <span key={`p${i}`} className="scene-plant"
          style={{ left: `${p.x}%`, bottom: p.kind === "tree" ? "22%" : "14%", animationDelay: p.delay }}>
          <PixelSprite kind={p.kind} size={p.size} />
        </span>
      ))}

      {/* fireflies */}
      {FIREFLIES.map((f, i) => (
        <span key={`f${i}`} className="scene-firefly"
          style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: f.d, animationDuration: f.dur }} />
      ))}
    </div>
  );
}
