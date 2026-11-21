import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

interface Config {
  gameId: string;
  tema: string;
  left: string[];
  right: string[];
  timeLimitSeconds: number;
}

interface Summary {
  results: (boolean | null)[];
  answerFor: number[];
  points: number;
  timeUp?: boolean;
}

export default function Spojnice({ onExit, preset }: { onExit?: () => void; preset?: Config }) {
  const [config, setConfig] = useState<Config | null>(preset ?? null);
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(preset ? preset.left.map(() => null) : []);
  const [matchedRight, setMatchedRight] = useState<Record<number, number>>({}); // desni -> levi
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    setSummary(null);
    setCurrent(0);
    setMatchedRight({});
    try {
      const cfg = await post<Config>("/api/spojnice/new");
      setConfig(cfg);
      setResults(cfg.left.map(() => null));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!preset) start();
  }, [start, preset]);

  const onTimeUp = useCallback(async () => {
    if (!config) return;
    try {
      setSummary(await post<Summary>(`/api/spojnice/${config.gameId}/timeout`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [config]);

  const timeLeft = useCountdown(config?.timeLimitSeconds ?? 60, !!config && !summary, onTimeUp, config?.gameId);

  const choose = async (rightIndex: number) => {
    if (!config || busy || summary) return;
    setBusy(true);
    try {
      const r = await post<{ correct: boolean; finished: boolean } & Partial<Summary>>(
        `/api/spojnice/${config.gameId}/guess`,
        { left: current, right: rightIndex }
      );
      setResults((prev) => prev.map((v, i) => (i === current ? r.correct : v)));
      if (r.correct) setMatchedRight((m) => ({ ...m, [rightIndex]: current }));
      setCurrent((c) => c + 1);
      if (r.finished) setSummary(r as Summary);
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
  if (!config) return <main className="screen">Učitavanje…</main>;

  const shownResults = summary?.results ?? results;

  return (
    <main className="screen">
      <GameHeader title="Spojnice" timeLeft={timeLeft} timeLimit={config.timeLimitSeconds} onExit={onExit} />
      <p className="theme">{config.tema}</p>

      <div className="pairs">
        <div className="pair-column">
          {config.left.map((l, i) => {
            const r = shownResults[i];
            const cls = r === true ? "correct" : r === false ? "wrong" : !summary && i === current ? "active" : "";
            return (
              <div key={i} className={`pair-item ${cls}`}>
                {l}
                {summary && r !== true && (
                  <small className="pair-answer">→ {config.right[summary.answerFor[i]]}</small>
                )}
              </div>
            );
          })}
        </div>
        <div className="pair-column">
          {config.right.map((r, i) => (
            <button
              key={i}
              className={`pair-item pair-button ${matchedRight[i] !== undefined ? "correct" : ""}`}
              disabled={!!summary || busy || matchedRight[i] !== undefined}
              onClick={() => choose(i)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="result">
          <p className="result-text">
            {summary.timeUp ? "Vreme je isteklo. " : ""}Osvojeno {summary.points} poena.
          </p>
          {!preset && <button className="action" onClick={start}>Nova partija</button>}
        </div>
      )}
    </main>
  );
}
