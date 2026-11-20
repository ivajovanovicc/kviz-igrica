import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

interface BoardView {
  columns: { fields: (string | null)[]; solution: string | null; solved: boolean }[];
  final: string | null;
  score: number;
  finished: boolean;
  timeUp?: boolean;
}

type Target = number | "final";
const LETTERS = ["A", "B", "C", "D"];

export default function Asocijacije({ onExit }: { onExit: () => void }) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState(120);
  const [board, setBoard] = useState<BoardView | null>(null);
  const [target, setTarget] = useState<Target>("final");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    setMessage(null);
    setAnswer("");
    setTarget("final");
    try {
      const r = await post<BoardView & { gameId: string; timeLimitSeconds: number }>("/api/asocijacije/new");
      setGameId(r.gameId);
      setTimeLimit(r.timeLimitSeconds);
      setBoard(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const giveUp = useCallback(async () => {
    if (!gameId) return;
    try {
      setBoard(await post<BoardView>(`/api/asocijacije/${gameId}/give-up`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [gameId]);

  const finished = !!board?.finished;
  const timeLeft = useCountdown(timeLimit, !!board && !finished, giveUp, gameId);

  const open = async (column: number, field: number) => {
    if (!gameId || busy || finished) return;
    setBusy(true);
    try {
      setBoard(await post<BoardView>(`/api/asocijacije/${gameId}/open`, { column, field }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const guess = async () => {
    if (!gameId || busy || finished || !answer.trim()) return;
    setBusy(true);
    try {
      const r = await post<BoardView & { correct: boolean }>(`/api/asocijacije/${gameId}/guess`, { target, answer });
      setBoard(r);
      setMessage(r.correct ? "Tačno!" : `„${answer.trim()}“ nije tačno.`);
      setAnswer("");
      if (r.correct && target !== "final") setTarget("final");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main className="screen">
        <p className="error">{error}</p>
        <button className="action" onClick={start}>Pokušaj ponovo</button>
        <button className="link" onClick={onExit}>← Nazad</button>
      </main>
    );
  }
  if (!board) return <main className="screen">Učitavanje…</main>;

  return (
    <main className="screen">
      <GameHeader title="Asocijacije" timeLeft={timeLeft} timeLimit={timeLimit} onExit={onExit} />

      <div className="asoc-grid">
        {board.columns.map((col, c) => (
          <div key={c} className="asoc-column">
            {col.fields.map((f, i) => (
              <button
                key={i}
                className={`asoc-field ${f ? "open" : ""}`}
                disabled={!!f || finished || busy}
                onClick={() => open(c, i)}
              >
                {f ?? `${LETTERS[c]}${i + 1}`}
              </button>
            ))}
            <button
              className={`asoc-solution ${col.solved ? "solved" : ""} ${target === c ? "selected" : ""}`}
              disabled={col.solved || finished}
              onClick={() => setTarget(c)}
            >
              {col.solution ?? `Kolona ${LETTERS[c]}`}
            </button>
          </div>
        ))}
      </div>

      <button
        className={`asoc-final ${board.final && board.score > 0 ? "solved" : ""} ${target === "final" ? "selected" : ""}`}
        disabled={finished}
        onClick={() => setTarget("final")}
      >
        {board.final ?? "Konačno rešenje"}
      </button>

      {finished ? (
        <div className="result">
          <p className="result-text">
            {board.timeUp ? "Vreme je isteklo. " : ""}Osvojeno {board.score} poena.
          </p>
          <button className="action" onClick={start}>Nova partija</button>
        </div>
      ) : (
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
            />
            <button className="action" disabled={busy || !answer.trim()}>Pogodi</button>
          </form>
          <div className="kzz-meta">
            <span>{message ?? "Otvaraj polja i pogađaj."}</span>
            <span>{board.score} poena</span>
          </div>
          <button className="link give-up" onClick={giveUp}>Odustani i prikaži rešenja</button>
        </>
      )}
    </main>
  );
}
