import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import { spojniceStore } from "./asocStore";

// Spojnice u dvoje, na smenu. Sve odluke donosi server, ovde je samo prikaz i slanje poteza.

interface State {
  half: number;
  halves: number;
  tema: string;
  left: string[];
  right: string[];
  solvedBy: (number | null)[];
  missed: boolean[];
  rightOwner: (number | null)[];
  answers: number[] | null;
  current: number | null;
  actor: number;
  isSecondChance: boolean;
  phase: "play" | "reveal";
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
  // boja igrača koji je spojio: igrač 1 plav, igrač 2 crven
  const owner = (by: number | null) => (by === null ? "" : `owner-p${by}`);

  const pick = (right: number) => {
    getSocket().emit("spojnice:pick", { right }, (r: { error?: string | null }) => {
      if (r?.error) setError(r.error);
    });
  };

  let status: string;
  if (state.phase === "reveal" || state.finished)
    status = state.half + 1 < state.halves ? "Kraj prve polovine. Tačni parovi su ispod." : "Kraj Spojnica.";
  else if (myTurn) status = state.isSecondChance ? "Tvoja šansa: protivnik je promašio!" : "Tvoj potez: spoji označeni pojam.";
  else status = `Na potezu je ${names[state.actor]}${state.isSecondChance ? " (šansa posle promašaja)" : ""}.`;

  return (
    <main className={`screen spojnice-duel ${playing && !myTurn ? "dimmed" : ""}`}>
      <header className="game-header">
        <span className="header-spacer" />
        <h2>Spojnice</h2>
        <span className={`timer ${left <= 3 && playing ? "low" : ""}`}>{playing ? `${left}s` : ""}</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${playing ? (left / 6) * 100 : 0}%` }} />
      </div>

      <div className={`turn-banner ${myTurn ? "mine" : ""}`}>{status}</div>
      {state.lastAction && <p className="last-action">{state.lastAction}</p>}
      <p className="theme">{state.tema}</p>

      {/* Svaki red: levi pojam i desni pojam jedan pored drugog.
          Na kraju se desna kolona poređa uz tačne parove: spojeni u boji igrača, nespojeni žuti. */}
      <div className="pairs-rows">
        {state.left.map((l, i) => {
          const by = state.solvedBy[i];
          if (state.answers) {
            const cls = by !== null ? owner(by) : "unsolved";
            return (
              <div key={i} className="pair-row">
                <div className={`pair-item ${cls}`}>{l}</div>
                <div className={`pair-item ${cls}`}>{state.right[state.answers[i]]}</div>
              </div>
            );
          }
          const cls = by !== null ? owner(by) : state.missed[i] ? "missed" : i === state.current ? "current" : "";
          return (
            <div key={i} className="pair-row">
              <div className={`pair-item ${cls}`}>{l}</div>
              <button
                className={`pair-item pair-button ${owner(state.rightOwner[i])}`}
                disabled={!myTurn || state.rightOwner[i] !== null}
                onClick={() => pick(i)}
              >
                {state.right[i]}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="error center">{error}</p>}
    </main>
  );
}
