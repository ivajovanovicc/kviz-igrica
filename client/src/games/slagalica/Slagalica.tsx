import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

interface Config {
  gameId: string;
  letters: string[];
  timeLimitSeconds: number;
}

interface Result {
  word: string;
  accepted: boolean;
  timeUp: boolean;
  points: number;
  longest: string | null;
}

const upper = (s: string) => s.toLocaleUpperCase("sr-Latn");

export default function Slagalica({ onExit, preset }: { onExit?: () => void; preset?: Config }) {
  const [config, setConfig] = useState<Config | null>(preset ?? null);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    setPicked([]);
    setResult(null);
    try {
      setConfig(await post<Config>("/api/slagalica/new"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!preset) start();
  }, [start, preset]);

  const submit = useCallback(async () => {
    if (!config || busy) return;
    setBusy(true);
    try {
      setResult(await post<Result>(`/api/slagalica/${config.gameId}/submit`, { tiles: picked }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [config, picked, busy]);

  // Kad igrač 2 sekunde ne menja reč, proveri da li postoji u rečniku
  const [check, setCheck] = useState<{ key: string; exists: boolean } | null>(null);
  const pickedKey = picked.join(",");
  useEffect(() => {
    if (!config || result || picked.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const r = await post<{ exists: boolean }>(`/api/slagalica/${config.gameId}/check`, { tiles: picked });
        setCheck({ key: pickedKey, exists: r.exists });
      } catch {
        /* provera nije bitna za tok igre */
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [pickedKey, config, result]); // eslint-disable-line react-hooks/exhaustive-deps
  const checkInfo = check && check.key === pickedKey && !result ? check : null;

  const timeLeft = useCountdown(config?.timeLimitSeconds ?? 60, !!config && !result, submit, config?.gameId);

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

  const word = picked.map((i) => upper(config.letters[i])).join("");

  return (
    <main className="screen">
      <GameHeader title="Slagalica" timeLeft={timeLeft} timeLimit={config.timeLimitSeconds} onExit={onExit} />

      <div className="tiles">
        {config.letters.map((l, i) => (
          <button
            key={i}
            className="tile"
            disabled={!!result || picked.includes(i)}
            onClick={() => setPicked([...picked, i])}
          >
            {upper(l)}
          </button>
        ))}
      </div>

      <div className="expression word">
        <span>{word || "Složi reč…"}</span>
        <span className="expression-value">{picked.length ? `${picked.length} slova` : ""}</span>
      </div>
      {checkInfo && (
        <p className={`word-check ${checkInfo.exists ? "ok" : "bad"}`}>
          {checkInfo.exists ? "✓ Reč postoji" : "✗ Ta reč nije u rečniku (0 poena)"}
        </p>
      )}

      {result ? (
        <div className="result">
          <p className="result-text">
            {result.accepted
              ? `Bravo! „${upper(result.word)}“ donosi ${result.points} poena.`
              : result.timeUp
                ? "Vreme je isteklo."
                : result.word
                  ? `Reč „${upper(result.word)}“ nije u rečniku.`
                  : "Reč nije složena."}
          </p>
          {result.longest && (
            <p className="best">
              Najduža moguća reč: <strong>{upper(result.longest)}</strong>
            </p>
          )}
          {preset ? <p className="waiting-note">Čeka se protivnik…</p> : <button className="action" onClick={start}>Nova partija</button>}
        </div>
      ) : (
        <>
          <div className="row-buttons">
            <button className="op-button" disabled={!picked.length} onClick={() => setPicked(picked.slice(0, -1))}>
              ⌫ Obriši
            </button>
            <button className="op-button" disabled={!picked.length} onClick={() => setPicked([])}>
              Poništi sve
            </button>
          </div>
          <button className="action wide" onClick={submit} disabled={busy || !picked.length}>
            Potvrdi
          </button>
        </>
      )}
    </main>
  );
}
