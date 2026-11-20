import { useState } from "react";
import Skocko from "./games/skocko/Skocko";

// Redosled igara kao u originalu
const GAMES = [
  { id: "slagalica", name: "Slagalica", ready: false },
  { id: "moj-broj", name: "Moj broj", ready: false },
  { id: "spojnice", name: "Spojnice", ready: false },
  { id: "skocko", name: "Skočko", ready: true },
  { id: "ko-zna-zna", name: "Ko zna zna", ready: false },
  { id: "asocijacije", name: "Asocijacije", ready: false },
] as const;

type GameId = (typeof GAMES)[number]["id"];

export default function App() {
  const [current, setCurrent] = useState<GameId | null>(null);

  if (current === "skocko") return <Skocko onExit={() => setCurrent(null)} />;

  return (
    <main className="screen">
      <h1 className="title">Kviz igrica</h1>
      <p className="subtitle">Izaberi igru (vežbanje za jednog igrača)</p>
      <ul className="game-list">
        {GAMES.map((g, i) => (
          <li key={g.id}>
            <button className="game-button" disabled={!g.ready} onClick={() => setCurrent(g.id)}>
              <span className="game-number">{i + 1}</span>
              <span>{g.name}</span>
              {!g.ready && <span className="soon">uskoro</span>}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
