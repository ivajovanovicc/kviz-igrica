import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import { asocStore } from "./asocStore";

// Asocijacije u dvoje, na smenu. Sve odluke donosi server, ovde je samo prikaz i slanje poteza.

interface DuelState {
  columns: { fields: (string | null)[]; solution: string | null; solvedBy: number | null }[];
  final: string | null;
  finalSolvedBy: number | null;
  turn: number;
  phase: "open" | "guess";
  turnSecondsLeft: number;
  totalSecondsLeft: number;
  points: [number, number];
  lastAction: string | null;
  finished: boolean;
  you: number;
}

type Target = number | "final";
const LETTERS = ["A", "B", "C", "D"];

export default function AsocijacijeDuel({ names }: { names: string[] }) {
  const [state, setState] = useState<DuelState | null>(null);
  const [target, setTarget] = useState<Target>("final");
  const [answer, setAnswer] = useState("");
  const [turnLeft, setTurnLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const turnEndsAt = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: DuelState) => {
      setState(s);
      setError(null);
      turnEndsAt.current = Date.now() + s.turnSecondsLeft * 1000;
      setTurnLeft(s.turnSecondsLeft);
    };
    socket.on("asoc:state", onState);
    if (asocStore.last) onState(asocStore.last as DuelState);
    return () => {
      socket.off("asoc:state", onState);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTurnLeft(Math.max(0, Math.ceil((turnEndsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, []);

  const send = (event: string, payload: unknown) => {
    getSocket().emit(event, payload, (r: { error?: string | null }) => {
      if (r?.error) setError(r.error);
    });
  };

  if (!state) return <main className="screen">Učitavanje…</main>;

  const myTurn = state.turn === state.you && !state.finished;
  const canOpen = myTurn && state.phase === "open";
  const canGuess = myTurn && state.phase === "guess";
  const ownerClass = (by: number | null) => (by === null ? "" : by === state.you ? "solved" : "solved-opp");

  const guess = () => {
    if (!answer.trim()) return;
    send("asoc:guess", { target, answer });
    setAnswer("");
    setTarget("final");
  };

  let status: string;
  if (state.finished) status = state.lastAction ?? "Kraj igre.";
  else if (myTurn) status = state.phase === "open" ? "Tvoj potez: otvori jedno polje." : "Tvoj potez: pogađaj ili predaj potez.";
  else status = `Na potezu je ${names[state.turn]}.`;

  return (
    <main className="screen">
      <header className="game-header">
        <span className="header-spacer" />
        <h2>Asocijacije</h2>
        <span className={`timer ${turnLeft <= 5 && !state.finished ? "low" : ""}`}>{state.finished ? "" : `${turnLeft}s`}</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${state.finished ? 0 : (turnLeft / 15) * 100}%` }} />
      </div>

      <div className={`turn-banner ${myTurn ? "mine" : ""}`}>{status}</div>
      {!state.finished && state.lastAction && <p className="last-action">{state.lastAction}</p>}

      {/* Raspored kao na TV-u: A i B gore, C i D dole, konačno rešenje u sredini */}
      <div className="asoc-board">
        <div className="asoc-grid">
          {[0, 1].map((c) => {
            const col = state.columns[c];
            return (
              <div key={c} className={`asoc-column ${c >= 2 ? "bottom" : ""}`}>
                {col.fields.map((f, i) => (
                  <button
                    key={i}
                    className={`asoc-field ${f ? "open" : ""}`}
                    disabled={!!f || !canOpen}
                    onClick={() => send("asoc:open", { column: c, field: i })}
                  >
                    {f ?? `${LETTERS[c]}${i + 1}`}
                  </button>
                ))}
                <button
                  className={`asoc-solution ${ownerClass(col.solvedBy)} ${canGuess && target === c ? "selected" : ""}`}
                  disabled={col.solvedBy !== null || !canGuess}
                  onClick={() => setTarget(c)}
                >
                  {col.solution ?? `Kolona ${LETTERS[c]}`}
                </button>
              </div>
            );
          })}
        </div>
        <button
          className={`asoc-final ${ownerClass(state.finalSolvedBy)} ${canGuess && target === "final" ? "selected" : ""}`}
          disabled={!canGuess}
          onClick={() => setTarget("final")}
        >
          {state.final ?? "Konačno rešenje"}
        </button>
        <div className="asoc-grid">
          {[2, 3].map((c) => {
            const col = state.columns[c];
            return (
              <div key={c} className={`asoc-column ${c >= 2 ? "bottom" : ""}`}>
                {col.fields.map((f, i) => (
                  <button
                    key={i}
                    className={`asoc-field ${f ? "open" : ""}`}
                    disabled={!!f || !canOpen}
                    onClick={() => send("asoc:open", { column: c, field: i })}
                  >
                    {f ?? `${LETTERS[c]}${i + 1}`}
                  </button>
                ))}
                <button
                  className={`asoc-solution ${ownerClass(col.solvedBy)} ${canGuess && target === c ? "selected" : ""}`}
                  disabled={col.solvedBy !== null || !canGuess}
                  onClick={() => setTarget(c)}
                >
                  {col.solution ?? `Kolona ${LETTERS[c]}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {canGuess && (
        <>
          <form
            className="asoc-input"
            onSubmit={(e) => {
              e.preventDefault();
              guess();
            }}
          >
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={target === "final" ? "Konačno rešenje…" : `Rešenje kolone ${LETTERS[target]}…`}
              autoFocus
            />
            <button className="action" disabled={!answer.trim()}>Pogodi</button>
          </form>
          <button className="op-button skip" onClick={() => send("asoc:pass", {})}>
            Dalje (predaj potez)
          </button>
        </>
      )}

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
