import { useCallback, useEffect, useRef, useState } from "react";

// Sopstveni set simbola (ne kopiramo originalne)
const SYMBOLS = [
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

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Greška na serveru");
  return data;
}

function Symbol({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="slot" />;
  const s = SYMBOLS[value];
  return (
    <span className="slot filled" style={{ color: s.color }} aria-label={s.label}>
      {s.glyph}
    </span>
  );
}

export default function Skocko({ onExit }: { onExit: () => void }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [current, setCurrent] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endsAt = useRef(0);

  const start = useCallback(async () => {
    setError(null);
    setRows([]);
    setCurrent([]);
    setResult(null);
    try {
      const cfg = await post<Config>("/api/skocko/new");
      setConfig(cfg);
      endsAt.current = Date.now() + cfg.timeLimitSeconds * 1000;
      setTimeLeft(cfg.timeLimitSeconds);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  // Tajmer
  useEffect(() => {
    if (!config || result) return;
    const t = setInterval(async () => {
      const left = Math.max(0, Math.ceil((endsAt.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(t);
        try {
          setResult(await post<Result>(`/api/skocko/${config.gameId}/timeout`));
        } catch (e) {
          setError((e as Error).message);
        }
      }
    }, 250);
    return () => clearInterval(t);
  }, [config, result]);

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

  const pick = (symbol: number) => {
    if (!config || result || busy) return;
    const next = [...current, symbol];
    if (next.length === config.codeLength) submit(next);
    else setCurrent(next);
  };

  const removeLast = () => setCurrent((c) => c.slice(0, -1));

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

  const totalRows = Array.from({ length: config.maxAttempts }, (_, i) => i);

  return (
    <main className="screen">
      <header className="game-header">
        <button className="link" onClick={onExit}>← Nazad</button>
        <h2>Skočko</h2>
        <span className={`timer ${timeLeft <= 10 ? "low" : ""}`}>{timeLeft}s</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${(timeLeft / config.timeLimitSeconds) * 100}%` }} />
      </div>

      <div className="board">
        {totalRows.map((i) => {
          const row = rows[i];
          const guess = row ? row.guess : i === rows.length && !result ? current : [];
          return (
            <div key={i} className={`board-row ${i === rows.length && !result ? "active" : ""}`}>
              <div className="slots">
                {Array.from({ length: config.codeLength }, (_, j) => (
                  <Symbol key={j} value={guess[j]} />
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
          <button className="action" onClick={start}>Nova partija</button>
        </div>
      ) : (
        <div className="picker">
          {SYMBOLS.map((s, i) => (
            <button key={i} className="symbol-button" style={{ color: s.color }} onClick={() => pick(i)} disabled={busy} aria-label={s.label}>
              {s.glyph}
            </button>
          ))}
          <button className="symbol-button delete" onClick={removeLast} disabled={busy || current.length === 0} aria-label="obriši">
            ⌫
          </button>
        </div>
      )}
    </main>
  );
}
