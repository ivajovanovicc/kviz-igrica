import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import AnswerBox from "../shared/AnswerBox";
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
  const [editing, setEditing] = useState<Target | null>(null); // polje rešenja u koje se trenutno kuca
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
  // boja igrača koji je rešio: igrač 1 plav, igrač 2 crven
  const ownerClass = (by: number | null) => (by === null ? "" : `owner-p${by}`);

  const guess = (target: Target, answer: string) => {
    if (!answer.trim()) return;
    send("asoc:guess", { target, answer });
    setEditing(null);
  };

  let status: string;
  if (state.finished) status = state.lastAction ?? "Kraj igre.";
  else if (myTurn) status = state.phase === "open" ? "Tvoj potez: otvori jedno polje." : "Tvoj potez: klikni na rešenje i kucaj, ili predaj potez.";
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
                <AnswerBox
                  className={`asoc-solution ${ownerClass(col.solvedBy)}`}
                  label={col.solution ?? `Kolona ${LETTERS[c]}`}
                  disabled={col.solvedBy !== null || !canGuess}
                  editing={editing === c}
                  placeholder={`Rešenje kolone ${LETTERS[c]}…`}
                  onStart={() => setEditing(c)}
                  onCancel={() => setEditing(null)}
                  onSubmit={(t) => guess(c, t)}
                />
              </div>
            );
          })}
        </div>
        <AnswerBox
          className={`asoc-final ${ownerClass(state.finalSolvedBy)}`}
          label={state.final ?? "Konačno rešenje"}
          disabled={!canGuess}
          editing={editing === "final"}
          placeholder={"Konačno rešenje…"}
          onStart={() => setEditing("final")}
          onCancel={() => setEditing(null)}
          onSubmit={(t) => guess("final", t)}
        />
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
                <AnswerBox
                  className={`asoc-solution ${ownerClass(col.solvedBy)}`}
                  label={col.solution ?? `Kolona ${LETTERS[c]}`}
                  disabled={col.solvedBy !== null || !canGuess}
                  editing={editing === c}
                  placeholder={`Rešenje kolone ${LETTERS[c]}…`}
                  onStart={() => setEditing(c)}
                  onCancel={() => setEditing(null)}
                  onSubmit={(t) => guess(c, t)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {canGuess && (
        <>
          <button className="op-button skip" onClick={() => send("asoc:pass", {})}>
            Dalje (predaj potez)
          </button>
        </>
      )}

      {error && <p className="error center">{error}</p>}
    </main>
  );
}
