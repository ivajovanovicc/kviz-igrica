import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import AnswerBox from "../../shared/AnswerBox";
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

export default function Asocijacije({ onExit, preset }: { onExit?: () => void; preset?: BoardView & { gameId: string; timeLimitSeconds: number } }) {
  const [gameId, setGameId] = useState<string | null>(preset?.gameId ?? null);
  const [timeLimit, setTimeLimit] = useState(preset?.timeLimitSeconds ?? 120);
  const [board, setBoard] = useState<BoardView | null>(preset ?? null);
  const [editing, setEditing] = useState<Target | null>(null); // polje rešenja u koje se trenutno kuca
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    setMessage(null);
    setEditing(null);
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
    if (!preset) start();
  }, [start, preset]);

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

  const guess = async (target: Target, answer: string) => {
    if (!gameId || busy || finished || !answer.trim()) return;
    setBusy(true);
    try {
      const r = await post<BoardView & { correct: boolean }>(`/api/asocijacije/${gameId}/guess`, { target, answer });
      setBoard(r);
      setMessage(r.correct ? "Tačno!" : `„${answer.trim()}“ nije tačno.`);
      setEditing(null);
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
        {onExit && <button className="link" onClick={onExit}>← Nazad</button>}
      </main>
    );
  }
  if (!board) return <main className="screen">Učitavanje…</main>;

  return (
    <main className="screen">
      <GameHeader title="Asocijacije" timeLeft={timeLeft} timeLimit={timeLimit} onExit={onExit} />

      {/* Raspored kao na TV-u: A i B gore, C i D dole, konačno rešenje u sredini */}
      <div className="asoc-board">
        <div className="asoc-grid">
          {[0, 1].map((c) => {
            const col = board.columns[c];
            return (
              <div key={c} className={`asoc-column ${c >= 2 ? "bottom" : ""}`}>
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
                <AnswerBox
                  className={`asoc-solution ${col.solved ? "solved" : ""}`}
                  label={col.solution ?? `Kolona ${LETTERS[c]}`}
                  disabled={col.solved || finished}
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
          className={`asoc-final ${board.final && board.score > 0 ? "solved" : ""}`}
          label={board.final ?? "Konačno rešenje"}
          disabled={finished}
          editing={editing === "final"}
          placeholder={"Konačno rešenje…"}
          onStart={() => setEditing("final")}
          onCancel={() => setEditing(null)}
          onSubmit={(t) => guess("final", t)}
        />
        <div className="asoc-grid">
          {[2, 3].map((c) => {
            const col = board.columns[c];
            return (
              <div key={c} className={`asoc-column ${c >= 2 ? "bottom" : ""}`}>
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
                <AnswerBox
                  className={`asoc-solution ${col.solved ? "solved" : ""}`}
                  label={col.solution ?? `Kolona ${LETTERS[c]}`}
                  disabled={col.solved || finished}
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

      {finished ? (
        <div className="result">
          <p className="result-text">
            {board.timeUp ? "Vreme je isteklo. " : ""}Osvojeno {board.score} poena.
          </p>
          {preset ? <p className="waiting-note">Čeka se protivnik…</p> : <button className="action" onClick={start}>Nova partija</button>}
        </div>
      ) : (
        <>
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
