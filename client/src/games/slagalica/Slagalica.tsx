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

  // red ispod reči: provera reči (dok se slaže) ili konačna ocena (posle potvrde)
  let status: { text: string; cls: string } | null = null;
  if (result) {
    if (result.accepted) status = { text: "✓ Reč je pronađena", cls: "ok" };
    else if (result.word) status = { text: "✗ Reč nije pronađena", cls: "bad" };
  } else if (picked.length >= 2) {
    status = checkInfo
      ? checkInfo.exists
        ? { text: "✓ Reč je pronađena", cls: "ok" }
        : { text: "✗ Reč nije pronađena", cls: "bad" }
      : { text: "Proveravam…", cls: "pending" };
  }

  return (
    <main className="screen slagalica-screen">
      <GameHeader title="Slagalica" timeLeft={timeLeft} timeLimit={config.timeLimitSeconds} onExit={onExit} />

      {/* Reč na vrhu, ispod nje provera, pa dugme, pa slova */}
      <div className="word-box">
        <span className="word-text">{result ? upper(result.word) : word}</span>
        {/* u dvoje poeni zavise od protivnikove reči, pa se prikazuju tek na kraju */}
        {result && result.accepted && !preset && <span className="word-points">+{result.points}</span>}
        {!result && picked.length > 0 && (
          <button className="word-backspace" onClick={() => setPicked(picked.slice(0, -1))} aria-label="obriši slovo">
            ⌫
          </button>
        )}
      </div>
      <p className={`word-check ${status?.cls ?? ""}`}>{status?.text ?? "\u00a0"}</p>

      {!result && (
        <>
          <button className="action wide slagalica-confirm" onClick={submit} disabled={busy || !picked.length}>
            Potvrdi
          </button>
          <div className="tiles">
            {config.letters.map((l, i) => (
              <button
                key={i}
                className="tile"
                disabled={picked.includes(i)}
                onClick={() => setPicked([...picked, i])}
              >
                {upper(l)}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Vežbanje: rezultat i najduža moguća reč. U igri u dvoje poređenje prikazuje partija. */}
      {result && !preset && (
        <>
          {result.longest && (
            <div className="compare">
              <span className="compare-label">Kompjuter:</span>
              <div className="word-box small">
                <span className="word-text">{upper(result.longest)}</span>
              </div>
            </div>
          )}
          <div className="result">
            <button className="action" onClick={start}>Nova partija</button>
          </div>
        </>
      )}
    </main>
  );
}
