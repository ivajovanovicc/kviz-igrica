import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

interface Config {
  gameId: string;
  questions: { question: string; options: string[] }[];
  secondsPerQuestion: number;
}

interface Feedback {
  chosen: number | null;
  correctOption: number;
  delta: number;
}

export default function KoZnaZna({ onExit }: { onExit: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, skipped: 0 });
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setIndex(0);
    setScore(0);
    setFeedback(null);
    setFinished(false);
    setStats({ correct: 0, wrong: 0, skipped: 0 });
    try {
      setConfig(await post<Config>("/api/ko-zna-zna/new"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const answer = useCallback(
    async (option: number | null) => {
      if (!config || feedback || finished) return;
      try {
        const r = await post<{ correct: boolean; correctOption: number; delta: number; score: number; finished: boolean }>(
          `/api/ko-zna-zna/${config.gameId}/answer`,
          { question: index, option }
        );
        setFeedback({ chosen: option, correctOption: r.correctOption, delta: r.delta });
        setScore(r.score);
        setStats((s) =>
          option === null || r.delta === 0
            ? { ...s, skipped: s.skipped + 1 }
            : r.correct
              ? { ...s, correct: s.correct + 1 }
              : { ...s, wrong: s.wrong + 1 }
        );
        // kratka pauza da se vidi tačan odgovor, pa sledeće pitanje
        setTimeout(() => {
          setFeedback(null);
          if (r.finished) setFinished(true);
          else setIndex((i) => i + 1);
        }, 1400);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [config, feedback, finished, index]
  );

  const timeLeft = useCountdown(
    config?.secondsPerQuestion ?? 10,
    !!config && !feedback && !finished,
    () => answer(null),
    `${config?.gameId}-${index}`
  );

  if (error) {
    return (
      <main className="screen">
        <p className="error">{error}</p>
        <button className="action" onClick={start}>Pokušaj ponovo</button>
        <button className="link" onClick={onExit}>← Nazad</button>
      </main>
    );
  }
  if (!config) return <main className="screen">Učitavanje…</main>;

  if (finished) {
    return (
      <main className="screen">
        <GameHeader title="Ko zna zna" timeLeft={0} timeLimit={config.secondsPerQuestion} onExit={onExit} />
        <div className="result">
          <p className="result-text">Ukupno: {score} poena</p>
          <p className="best">
            Tačnih: {stats.correct} · Netačnih: {stats.wrong} · Preskočenih: {stats.skipped}
          </p>
          <button className="action" onClick={start}>Nova partija</button>
        </div>
      </main>
    );
  }

  const q = config.questions[index];

  return (
    <main className="screen">
      <GameHeader title="Ko zna zna" timeLeft={timeLeft} timeLimit={config.secondsPerQuestion} onExit={onExit} />
      <div className="kzz-meta">
        <span>Pitanje {index + 1} / {config.questions.length}</span>
        <span>{score} poena</span>
      </div>
      <div className="question">{q.question}</div>
      <div className="options">
        {q.options.map((o, i) => {
          let cls = "";
          if (feedback) {
            if (i === feedback.correctOption) cls = "correct";
            else if (i === feedback.chosen) cls = "wrong";
          }
          return (
            <button key={i} className={`option ${cls}`} disabled={!!feedback} onClick={() => answer(i)}>
              {o}
            </button>
          );
        })}
      </div>
      <button className="op-button skip" disabled={!!feedback} onClick={() => answer(null)}>
        Preskoči
      </button>
      <p className="hint">Tačan odgovor +10, netačan −5, preskočeno 0</p>
    </main>
  );
}
