import { useCallback, useEffect, useState } from "react";
import { post } from "../../shared/api";
import { useCountdown } from "../../shared/useCountdown";
import GameHeader from "../../shared/GameHeader";

interface Config {
  gameId: string;
  target: number;
  numbers: number[];
  timeLimitSeconds: number;
}

interface Result {
  value: number | null;
  invalidReason?: string;
  timeUp: boolean;
  points: number;
  target: number;
  best: { value: number; expr: string };
}

type Token = { kind: "num"; index: number } | { kind: "op"; value: string };

const OPS = ["+", "-", "*", "/", "(", ")"];
const OP_LABEL: Record<string, string> = { "*": "×", "/": "÷", "-": "−" };

function toText(tokens: Token[], numbers: number[]) {
  return tokens.map((t) => (t.kind === "num" ? String(numbers[t.index]) : t.value)).join(" ");
}

// Mali kalkulator za prikaz trenutne vrednosti (server svakako ponovo proverava)
function tryEvaluate(text: string): number | null {
  const tokens = text.split(" ").filter(Boolean);
  let pos = 0;
  const primary = (): number => {
    const t = tokens[pos++];
    if (t === "(") {
      const v = sum();
      if (tokens[pos++] !== ")") throw 0;
      return v;
    }
    if (t === undefined || isNaN(Number(t))) throw 0;
    return Number(t);
  };
  const product = (): number => {
    let v = primary();
    while (tokens[pos] === "*" || tokens[pos] === "/") {
      const op = tokens[pos++];
      const r = primary();
      if (op === "*") v *= r;
      else {
        if (r === 0 || v % r !== 0) throw 0;
        v /= r;
      }
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (tokens[pos] === "+" || tokens[pos] === "-") {
      const op = tokens[pos++];
      const r = product();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = sum();
    return pos === tokens.length ? v : null;
  } catch {
    return null;
  }
}

export default function MojBroj({ onExit, preset }: { onExit?: () => void; preset?: Config }) {
  const [config, setConfig] = useState<Config | null>(preset ?? null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    setError(null);
    setTokens([]);
    setResult(null);
    try {
      setConfig(await post<Config>("/api/moj-broj/new"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!preset) start();
  }, [start, preset]);

  const text = config ? toText(tokens, config.numbers) : "";
  const currentValue = text ? tryEvaluate(text) : null;

  const submit = useCallback(async () => {
    if (!config || busy) return;
    setBusy(true);
    try {
      const expression = tryEvaluate(text) !== null ? text : "";
      setResult(await post<Result>(`/api/moj-broj/${config.gameId}/submit`, { expression }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [config, text, busy]);

  const timeLeft = useCountdown(config?.timeLimitSeconds ?? 60, !!config && !result, submit, config?.gameId);

  // Pravila unosa: posle broja ide operacija ili ")", posle operacije ide broj ili "("
  const last = tokens[tokens.length - 1];
  const afterValue = last && (last.kind === "num" || last.value === ")");
  const openParens = tokens.filter((t) => t.kind === "op" && t.value === "(").length -
    tokens.filter((t) => t.kind === "op" && t.value === ")").length;
  const usedIndexes = new Set(tokens.filter((t) => t.kind === "num").map((t) => (t as { index: number }).index));

  const canUseOp = (op: string) => {
    if (op === "(") return !afterValue;
    if (op === ")") return !!afterValue && openParens > 0;
    return !!afterValue;
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

  return (
    <main className="screen">
      <GameHeader title="Moj broj" timeLeft={timeLeft} timeLimit={config.timeLimitSeconds} onExit={onExit} />

      <div className="target">{config.target}</div>

      <div className="numbers">
        {config.numbers.map((n, i) => (
          <button
            key={i}
            className={`number-button ${i >= 4 ? "big" : ""}`}
            disabled={!!result || afterValue || usedIndexes.has(i)}
            onClick={() => setTokens([...tokens, { kind: "num", index: i }])}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="expression">
        <span>{tokens.length ? text.replace(/\*/g, "×").replace(/\//g, "÷") : "Složi izraz…"}</span>
        <span className="expression-value">{currentValue !== null ? `= ${currentValue}` : ""}</span>
      </div>

      {result ? (
        <div className="result">
          <p className="result-text">
            {result.points > 0
              ? `Tačno! Osvojeno ${result.points} poena.`
              : result.invalidReason
                ? `Izraz nije ispravan: ${result.invalidReason}`
                : result.value !== null
                  ? `Tvoj rezultat: ${result.value} (razlika ${Math.abs(result.value - result.target)})`
                  : result.timeUp
                    ? "Vreme je isteklo."
                    : "Izraz nije složen."}
          </p>
          <p className="best">
            {result.best.value === result.target ? "Moguće rešenje" : `Najbliže moguće (${result.best.value})`}:{" "}
            <strong>{result.best.expr.replace(/\*/g, "×").replace(/\//g, "÷")}</strong>
          </p>
          {preset ? <p className="waiting-note">Čeka se protivnik…</p> : <button className="action" onClick={start}>Nova partija</button>}
        </div>
      ) : (
        <>
          <div className="ops">
            {OPS.map((op) => (
              <button key={op} className="op-button" disabled={!canUseOp(op)} onClick={() => setTokens([...tokens, { kind: "op", value: op }])}>
                {OP_LABEL[op] ?? op}
              </button>
            ))}
            <button className="op-button" disabled={!tokens.length} onClick={() => setTokens(tokens.slice(0, -1))} aria-label="obriši">
              ⌫
            </button>
          </div>
          <button className="action wide" onClick={submit} disabled={busy}>
            Potvrdi
          </button>
        </>
      )}
    </main>
  );
}
