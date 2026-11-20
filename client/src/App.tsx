import { useState } from "react";
import Skocko from "./games/skocko/Skocko";
import MojBroj from "./games/moj-broj/MojBroj";
import Slagalica from "./games/slagalica/Slagalica";
import Spojnice from "./games/spojnice/Spojnice";
import KoZnaZna from "./games/ko-zna-zna/KoZnaZna";
import Asocijacije from "./games/asocijacije/Asocijacije";

// Redosled igara kao u originalu
const GAMES = [
  { id: "slagalica", name: "Slagalica", ready: true },
  { id: "moj-broj", name: "Moj broj", ready: true },
  { id: "spojnice", name: "Spojnice", ready: true },
  { id: "skocko", name: "Skočko", ready: true },
  { id: "ko-zna-zna", name: "Ko zna zna", ready: true },
  { id: "asocijacije", name: "Asocijacije", ready: true },
] as const;

type GameId = (typeof GAMES)[number]["id"];

export default function App() {
  const [current, setCurrent] = useState<GameId | null>(null);

  const exit = () => setCurrent(null);
  if (current === "spojnice") return <Spojnice onExit={exit} />;
  if (current === "ko-zna-zna") return <KoZnaZna onExit={exit} />;
  if (current === "asocijacije") return <Asocijacije onExit={exit} />;
  if (current === "slagalica") return <Slagalica onExit={() => setCurrent(null)} />;
  if (current === "moj-broj") return <MojBroj onExit={() => setCurrent(null)} />;
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
