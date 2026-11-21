import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

// Sopstveni set simbola (ne kopiramo originalne)
export const SYMBOLS = [
  { glyph: "☺", color: "#ffd23f", label: "smajli" },
  { glyph: "♣", color: "#2ecc71", label: "tref" },
  { glyph: "♠", color: "#1b1f3b", label: "pik" },
  { glyph: "♥", color: "#e63946", label: "herc" },
  { glyph: "♦", color: "#ff8c42", label: "karo" },
  { glyph: "★", color: "#4cc9f0", label: "zvezda" },
];

interface Config {
  gameId: string;
  codeLength: number;
  maxAttempts: number;
  timeLimitSeconds: number;
}

interface Row {
  guess: number[];
  red: number;
  yellow: number;
}

interface Result {
  solved: boolean;
  points: number;
  solution: number[];
  timeUp?: boolean;
}

function Symbol({ value, onClear }: { value: number | undefined; onClear?: () => void }) {
  if (value === undefined) return <span className="slot" />;
  const s = SYMBOLS[value];
  if (onClear) {
    // u aktivnom redu klik na popunjeno polje briše simbol
    return (
      <button className="slot filled clearable" style={{ color: s.color }} aria-label={`obriši ${s.label}`} onClick={onClear}>
        {s.glyph}
      </button>
    );
  }
  return (
    <span className="slot filled" style={{ color: s.color }} aria-label={s.label}>
      {s.glyph}
    </span>
  );
}

export default function Skocko({ onExit, preset }: { onExit?: () => void; preset?: Config }) {
  const [config, setConfig] = useState<Config | null>(preset ?? null);
  const [rows, setRows] = useState<Row[]>([]);
  const [current, setCurrent] = useState<(number | undefined)[]>([]); // prazno polje = undefined
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    setRows([]);
    setCurrent([]);
    setResult(null);
    try {
      const cfg = await post<Config>("/api/skocko/new");
      setConfig(cfg);
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
      setResult(await post<Result>(`/api/skocko/${config.gameId}/timeout`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [config]);
  const timeLeft = useCountdown(config?.timeLimitSeconds ?? 60, !!config && !result, onTimeUp, config?.gameId);

  const submit = useCallback(
    async (guess: number[]) => {
      if (!config) return;
      setBusy(true);
      try {
        const r = await post<{
          feedback?: { red: number; yellow: number };
          finished: boolean;
          solved: boolean;
          points: number;
          solution?: number[];
          timeUp?: boolean;
        }>(`/api/skocko/${config.gameId}/guess`, { guess });
        if (r.feedback) setRows((prev) => [...prev, { guess, ...r.feedback! }]);
        setCurrent([]);
        if (r.finished && r.solution) {
          setResult({ solved: r.solved, points: r.points, solution: r.solution, timeUp: r.timeUp });
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [config]
  );

  // Izabrani simbol ide u prvo slobodno polje (od 1. do 4.)
  const pick = (symbol: number) => {
    if (!config || result || busy) return;
    const next = Array.from({ length: config.codeLength }, (_, j) => current[j]);
    const free = next.findIndex((v) => v === undefined);
    if (free === -1) return;
    next[free] = symbol;
    setCurrent(next);
  };

  const clearSlot = (j: number) =>
    setCurrent((c) => {
      const next = [...c];
      next[j] = undefined;
      return next;
    });

  const filled = config ? Array.from({ length: config.codeLength }, (_, j) => current[j]) : [];
  const complete = filled.length > 0 && filled.every((v) => v !== undefined);

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

  const totalRows = Array.from({ length: config.maxAttempts }, (_, i) => i);

  return (
    <main className="screen">
      <GameHeader title="Skočko" timeLeft={timeLeft} timeLimit={config.timeLimitSeconds} onExit={onExit} />

      <div className="board">
        {totalRows.map((i) => {
          const row = rows[i];
          const active = i === rows.length && !result;
          const guess = row ? row.guess : active ? current : [];
          return (
            <div key={i} className={`board-row ${i === rows.length && !result ? "active" : ""}`}>
              <div className="slots">
                {Array.from({ length: config.codeLength }, (_, j) => (
                  <Symbol key={j} value={guess[j]} onClear={active && !busy ? () => clearSlot(j) : undefined} />
                ))}
              </div>
              <div className="pegs">
                {Array.from({ length: config.codeLength }, (_, j) => {
                  const cls = row ? (j < row.red ? "red" : j < row.red + row.yellow ? "yellow" : "") : "";
                  return <span key={j} className={`peg ${cls}`} />;
                })}
              </div>
            </div>
          );
        })}

        {result && (
          <div className="board-row solution">
            <div className="slots">
              {result.solution.map((s, j) => (
                <Symbol key={j} value={s} />
              ))}
            </div>
            <div className="solution-label">rešenje</div>
          </div>
        )}
      </div>

      {result ? (
        <div className="result">
          <p className="result-text">
            {result.solved ? `Bravo! Osvojeno ${result.points} poena.` : result.timeUp ? "Vreme je isteklo." : "Nije pogođeno."}
          </p>
          {!preset && <button className="action" onClick={start}>Nova partija</button>}
        </div>
      ) : (
        <div className="picker">
          {SYMBOLS.map((s, i) => (
            <button key={i} className="symbol-button" style={{ color: s.color }} onClick={() => pick(i)} disabled={busy} aria-label={s.label}>
              {s.glyph}
            </button>
          ))}
          <button
            className="symbol-button confirm"
            onClick={() => submit(filled as number[])}
            disabled={busy || !complete}
          >
            Potvrdi
          </button>
        </div>
      )}
    </main>
  );
}
