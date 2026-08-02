import { useState } from "react";
import GardenScene from "./components/GardenScene.jsx";

export default function App() {
  const [region, setRegion] = useState(null);
  return (
    <div className="app-min">
      <GardenScene activeRegion={region} onRegion={setRegion} />
    </div>
  );
}
