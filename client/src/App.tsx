import { useState } from "react";
import Slagalica from "./games/slagalica/Slagalica";
import MojBroj from "./games/moj-broj/MojBroj";
import Spojnice from "./games/spojnice/Spojnice";
import Skocko from "./games/skocko/Skocko";
import KoZnaZna from "./games/ko-zna-zna/KoZnaZna";
import Asocijacije from "./games/asocijacije/Asocijacije";
import Match from "./match/Match";
import { activeMatch, saveName, savedName } from "./shared/socket";

// Redosled igara kao u originalu
const GAMES = [
  { id: "slagalica", name: "Slagalica" },
  { id: "moj-broj", name: "Moj broj" },
  { id: "skocko", name: "Skočko" },
  { id: "ko-zna-zna", name: "Ko zna zna" },
  { id: "spojnice", name: "Spojnice" },
  { id: "asocijacije", name: "Asocijacije" },
] as const;

type GameId = (typeof GAMES)[number]["id"];

type Screen =
  | { kind: "home" }
  | { kind: "practice" }
  | { kind: "game"; id: GameId }
  | { kind: "name"; mode: "create" | "join"; code?: string }
  | { kind: "match"; mode: "create" | "join"; code?: string; name: string };

function initialScreen(): Screen {
  const code = new URLSearchParams(window.location.search).get("p");
  if (!code) return { kind: "home" };
  // Osvežena stranica usred partije: vrati igrača direktno u partiju
  if (activeMatch() === code && savedName()) return { kind: "match", mode: "join", code, name: savedName() };
  return { kind: "name", mode: "join", code };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [name, setName] = useState(savedName());
  const home = () => setScreen({ kind: "home" });
  const practice = () => setScreen({ kind: "practice" });

  if (screen.kind === "match") {
    return <Match mode={screen.mode} code={screen.code} name={screen.name} onExit={home} />;
  }

  if (screen.kind === "name") {
    return (
      <main className="screen">
        <h1 className="title">Kviz igrica</h1>
        <p className="subtitle">{screen.mode === "join" ? "Pozvan/a si u partiju!" : "Igra u dvoje"}</p>
        <form
          className="name-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            saveName(n);
            setScreen({ kind: "match", mode: screen.mode, code: screen.code, name: n });
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tvoje ime" maxLength={20} autoFocus />
          <button className="action wide" disabled={!name.trim()}>
            {screen.mode === "join" ? "Uđi u partiju" : "Napravi partiju"}
          </button>
        </form>
        <button
          className="link give-up"
          onClick={() => {
            window.history.replaceState(null, "", window.location.pathname);
            home();
          }}
        >
          ← Nazad
        </button>
      </main>
    );
  }

  if (screen.kind === "game") {
    const props = { onExit: practice };
    switch (screen.id) {
      case "slagalica": return <Slagalica {...props} />;
      case "moj-broj": return <MojBroj {...props} />;
      case "spojnice": return <Spojnice {...props} />;
      case "skocko": return <Skocko {...props} />;
      case "ko-zna-zna": return <KoZnaZna {...props} />;
      case "asocijacije": return <Asocijacije {...props} />;
    }
  }

  if (screen.kind === "practice") {
    return (
      <main className="screen">
        <h1 className="title">Vežbanje</h1>
        <p className="subtitle">Izaberi igru</p>
        <ul className="game-list">
          {GAMES.map((g, i) => (
            <li key={g.id}>
              <button className="game-button" onClick={() => setScreen({ kind: "game", id: g.id })}>
                <span className="game-number">{i + 1}</span>
                <span>{g.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="link give-up" onClick={home}>← Nazad</button>
      </main>
    );
  }

  return (
    <main className="screen">
      <h1 className="title">Kviz igrica</h1>
      <p className="subtitle">Šest igara, jedan pobednik</p>
      <div className="menu">
        <button className="action wide" onClick={() => setScreen({ kind: "name", mode: "create" })}>
          Igraj sa prijateljem
        </button>
        <button className="game-button center" onClick={practice}>
          Vežbaj sam/a
        </button>
      </div>
    </main>
  );
}
