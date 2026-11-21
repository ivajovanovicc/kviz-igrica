import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import { skockoStore } from "./asocStore";
import { SYMBOLS } from "../games/skocko/Skocko";

// Skočko u dvoje: kombinaciju pogađa vlasnik runde, protivnik gleda.
// Ako vlasnik ne pogodi, protivnik ima jedan pokušaj (donji red).

interface Row {
  guess: number[];
  feedback: { red: number; yellow: number };
}

interface State {
  rows: Row[];
  stealRow: Row | null;
  solution: number[] | null;
  phase: "owner" | "steal" | "reveal";
  owner: number;
  actor: number;
  secondsLeft: number;
  phaseSeconds: number;
  points: [number, number];
  solvedBy: number | null;
  finished: boolean;
  you: number;
}

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 6;

function Cell({ value, onClear }: { value: number | undefined; onClear?: () => void }) {
  if (value === undefined) return <span className="slot" />;
  const s = SYMBOLS[value];
  if (onClear)
    return (
      <button className="slot filled clearable" style={{ color: s.color }} onClick={onClear} aria-label={`obriši ${s.label}`}>
        {s.glyph}
      </button>
    );
  return (
    <span className="slot filled" style={{ color: s.color }} aria-label={s.label}>
      {s.glyph}
    </span>
  );
}

function Pegs({ row }: { row?: Row }) {
  return (
    <div className="pegs">
      {Array.from({ length: CODE_LENGTH }, (_, j) => {
        const cls = row ? (j < row.feedback.red ? "red" : j < row.feedback.red + row.feedback.yellow ? "yellow" : "") : "";
        return <span key={j} className={`peg ${cls}`} />;
      })}
    </div>
  );
}

export default function SkockoDuel({ names }: { names: string[] }) {
  const [state, setState] = useState<State | null>(null);
  const [current, setCurrent] = useState<(number | undefined)[]>([]);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const endsAt = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: State) => {
      setState((prev) => {
        // posle poslatog pokušaja ili promene faze isprazni unos
        if (!prev || prev.rows.length !== s.rows.length || prev.phase !== s.phase) setCurrent([]);
        return s;
      });
      setError(null);
      endsAt.current = Date.now() + s.secondsLeft * 1000;
      setLeft(s.secondsLeft);
    };
    socket.on("skocko:state", onState);
    if (skockoStore.last) onState(skockoStore.last as State);
    return () => {
      socket.off("skocko:state", onState);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, []);

  if (!state) return <main className="screen">Učitavanje…</main>;

  const playing = state.phase !== "reveal" && !state.finished;
  const myTurn = playing && state.actor === state.you;
  const filled = Array.from({ length: CODE_LENGTH }, (_, j) => current[j]);
  const complete = filled.every((v) => v !== undefined);

  const pick = (symbol: number) => {
    if (!myTurn) return;
    const next = [...filled];
    const free = next.findIndex((v) => v === undefined);
    if (free === -1) return;
    next[free] = symbol;
    setCurrent(next);
  };
  const clearSlot = (j: number) => {
    const next = [...filled];
    next[j] = undefined;
    setCurrent(next);
  };
  const confirm = () => {
    if (!myTurn || !complete) return;
    getSocket().emit("skocko:guess", { guess: filled }, (r: { error?: string | null }) => {
      if (r?.error) setError(r.error);
    });
  };

  let status: string;
  if (!playing) status = state.solvedBy !== null ? `${state.solvedBy === state.you ? "Pogodio/la si" : `${names[state.solvedBy]} je pogodio/la`} kombinaciju!` : "Kombinacija nije pogođena.";
  else if (state.phase === "steal") status = myTurn ? "Tvoja šansa: jedan pokušaj!" : `${names[state.actor]} ima jedan pokušaj.`;
  else status = myTurn ? "Pronađi tačnu kombinaciju." : `Na potezu je ${names[state.actor]}.`;

  const ownerTurnRow = state.phase === "owner" && state.rows.length;

  return (
    <main className={`screen skocko-duel ${playing && !myTurn ? "dimmed" : ""}`}>
      <header className="game-header">
        <span className="header-spacer" />
        <h2>Skočko</h2>
        <span className={`timer ${left <= 5 && playing ? "low" : ""}`}>{playing ? `${left}s` : ""}</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${playing ? (left / state.phaseSeconds) * 100 : 0}%` }} />
      </div>
      <div className={`turn-banner ${myTurn ? "mine" : ""}`}>{status}</div>

      <div className="board">
        {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
          const row = state.rows[i];
          const active = myTurn && state.phase === "owner" && i === ownerTurnRow;
          const guess = row ? row.guess : active ? filled : [];
          return (
            <div key={i} className={`board-row color-row-p${state.owner} ${active ? "active" : ""}`}>
              <div className="slots">
                {Array.from({ length: CODE_LENGTH }, (_, j) => (
                  <Cell key={j} value={guess[j]} onClear={active && guess[j] !== undefined ? () => clearSlot(j) : undefined} />
                ))}
              </div>
              <Pegs row={row} />
            </div>
          );
        })}

        {/* Pokušaj protivnika (ako vlasnik ne pogodi) */}
        <div className="board-sep" />
        {(() => {
          const active = myTurn && state.phase === "steal";
          const row = state.stealRow ?? undefined;
          const guess = row ? row.guess : active ? filled : [];
          return (
            <div className={`board-row color-row-p${1 - state.owner} ${active ? "active" : ""}`}>
              <div className="slots">
                {Array.from({ length: CODE_LENGTH }, (_, j) => (
                  <Cell key={j} value={guess[j]} onClear={active && guess[j] !== undefined ? () => clearSlot(j) : undefined} />
                ))}
              </div>
              <Pegs row={row} />
            </div>
          );
        })()}
        <div className="board-row solution">
          <div className="slots">
            {Array.from({ length: CODE_LENGTH }, (_, j) => (
              <Cell key={j} value={state.solution?.[j]} />
            ))}
          </div>
          <div className="solution-label">rešenje</div>
        </div>
      </div>

      {myTurn && (
        <div className="picker">
          {SYMBOLS.map((s, i) => (
            <button key={i} className="symbol-button" style={{ color: s.color }} onClick={() => pick(i)} aria-label={s.label}>
              {s.glyph}
            </button>
          ))}
          <button className="symbol-button confirm" onClick={confirm} disabled={!complete}>
            Potvrdi
          </button>
        </div>
      )}
      {error && <p className="error center">{error}</p>}
    </main>
  );
}
