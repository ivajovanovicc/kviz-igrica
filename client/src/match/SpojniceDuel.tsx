import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import { spojniceStore } from "./asocStore";

// Spojnice u dvoje, na smenu. Sve odluke donosi server, ovde je samo prikaz i slanje poteza.

interface State {
  half: number;
  tema: string;
  left: string[];
  right: string[];
  solvedBy: (number | null)[];
  rightOwner: (number | null)[];
  answers: number[] | null;
  current: number | null;
  actor: number;
  phase: "main" | "steal" | "reveal";
  moveSecondsLeft: number;
  points: [number, number];
  lastAction: string | null;
  finished: boolean;
  you: number;
}

export default function SpojniceDuel({ names }: { names: string[] }) {
  const [state, setState] = useState<State | null>(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const endsAt = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: State) => {
      setState(s);
      setError(null);
      endsAt.current = Date.now() + s.moveSecondsLeft * 1000;
      setLeft(s.moveSecondsLeft);
    };
    socket.on("spojnice:state", onState);
    if (spojniceStore.last) onState(spojniceStore.last as State);
    return () => {
      socket.off("spojnice:state", onState);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, []);

  if (!state) return <main className="screen">Učitavanje…</main>;

  const playing = state.phase !== "reveal" && !state.finished;
  const myTurn = playing && state.actor === state.you;
  const owner = (by: number | null) => (by === null ? "" : by === state.you ? "correct" : "correct-opp");

  const pick = (right: number) => {
    getSocket().emit("spojnice:pick", { right }, (r: { error?: string | null }) => {
      if (r?.error) setError(r.error);
    });
  };

  let status: string;
  if (state.phase === "reveal") status = state.half === 0 ? "Kraj prve polovine. Tačni parovi su ispod." : "Kraj Spojnica.";
  else if (myTurn) status = state.phase === "steal" ? "Tvoj potez: pokušaj promašeni par!" : "Tvoj potez: spoji označeni pojam.";
  else status = `Na potezu je ${names[state.actor]}${state.phase === "steal" ? " (pokušava promašene)" : ""}.`;

  return (
    <main className="screen">
      <header className="game-header">
        <span className="header-spacer" />
        <h2>Spojnice {state.half + 1}/2</h2>
        <span className={`timer ${left <= 3 && playing ? "low" : ""}`}>{playing ? `${left}s` : ""}</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${playing ? (left / 10) * 100 : 0}%` }} />
      </div>

      <div className={`turn-banner ${myTurn ? "mine" : ""}`}>{status}</div>
      {state.lastAction && <p className="last-action">{state.lastAction}</p>}
      <p className="theme">{state.tema}</p>

      <div className="pairs">
        <div className="pair-column">
          {state.left.map((l, i) => {
            const by = state.solvedBy[i];
            const cls = by !== null ? owner(by) : state.answers ? "wrong" : i === state.current ? "active" : "";
            return (
              <div key={i} className={`pair-item ${cls}`}>
                {l}
                {state.answers && by === null && <small className="pair-answer">→ {state.right[state.answers[i]]}</small>}
              </div>
            );
          })}
        </div>
        <div className="pair-column">
          {state.right.map((r, i) => (
            <button
              key={i}
              className={`pair-item pair-button ${owner(state.rightOwner[i])}`}
              disabled={!myTurn || state.rightOwner[i] !== null}
              onClick={() => pick(i)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error center">{error}</p>}
      <div className="kzz-meta">
        <span>Ti: {state.points[state.you]}</span>
        <span>
          {names[1 - state.you]}: {state.points[1 - state.you]}
        </span>
      </div>
      {state.finished && <p className="waiting-note">Rezultat uskoro…</p>}
    </main>
  );
}
