import { useEffect, useRef, useState } from "react";
import { getSocket } from "../shared/socket";
import { kzzStore } from "./asocStore";

// Ko zna zna u dvoje: oba igrača istovremeno odgovaraju na isto pitanje.
// Sledeće pitanje dolazi tek kad oba odgovore ili istekne vreme.

interface State {
  index: number;
  total: number;
  question: string;
  options: string[];
  phase: "question" | "reveal";
  secondsLeft: number;
  myAnswer: number | null | undefined;
  opponentAnswered: boolean;
  correct: number | null;
  opponentAnswer: number | null | undefined;
  deltas: [number, number] | null;
  points: [number, number];
  finished: boolean;
  you: number;
}

const SECONDS = 10;

export default function KoZnaZnaDuel({ names }: { names: string[] }) {
  const [state, setState] = useState<State | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const endsAt = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: State) => {
      setState(s);
      endsAt.current = Date.now() + s.secondsLeft * 1000;
      setLeft(s.secondsLeft);
    };
    socket.on("kzz:state", onState);
    if (kzzStore.last) onState(kzzStore.last as State);
    return () => {
      socket.off("kzz:state", onState);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, []);

  if (!state) return <main className="screen">Učitavanje…</main>;

  const answered = state.myAnswer !== undefined;
  const reveal = state.phase === "reveal" || state.finished;
  const answer = (option: number | null) => {
    if (answered || reveal) return;
    getSocket().emit("kzz:answer", { question: state.index, option });
  };

  const opp = names[1 - state.you];
  let note: string;
  if (reveal) {
    const mine = state.deltas?.[state.you] ?? 0;
    const theirs = state.deltas?.[1 - state.you] ?? 0;
    const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
    note = `Ti ${fmt(mine)} · ${opp} ${fmt(theirs)}`;
  } else if (answered) {
    note = state.opponentAnswered ? "" : `Čeka se da ${opp} odgovori…`;
  } else {
    note = state.opponentAnswered ? `${opp} je već odgovorio/la!` : "Brži tačan odgovor nosi 10 poena.";
  }

  return (
    <main className="screen">
      <header className="game-header">
        <span className="header-spacer" />
        <h2>Ko zna zna</h2>
        <span className={`timer ${left <= 3 && !reveal ? "low" : ""}`}>{reveal ? "" : `${left}s`}</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${reveal ? 0 : (left / SECONDS) * 100}%` }} />
      </div>
      <div className="kzz-meta">
        <span>
          Pitanje {state.index + 1} / {state.total}
        </span>
      </div>
      <div className="question">{state.question}</div>
      <div className="options">
        {state.options.map((o, i) => {
          let cls = "";
          if (reveal && i === state.correct) cls = "highlight";
          else if (reveal && i === state.myAnswer) cls = "wrong";
          else if (!reveal && i === state.myAnswer) cls = "chosen";
          const oppMark = reveal && i === state.opponentAnswer;
          return (
            <button key={i} className={`option ${cls}`} disabled={answered || reveal} onClick={() => answer(i)}>
              {o}
              {oppMark && <span className="opp-mark">{opp}</span>}
            </button>
          );
        })}
      </div>
      {!answered && !reveal && (
        <button className="op-button skip" onClick={() => answer(null)}>
          Preskoči
        </button>
      )}
      <p className="hint">{note}</p>
    </main>
  );
}
