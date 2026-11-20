// Pravila Mog broja:
// - traženi broj je od 100 do 999
// - igrač dobija 6 brojeva: četiri jednocifrena (1-9), jedan od 10/15/20 i jedan od 25/50/75/100
// - koristeći + - * / i zagrade pravi izraz čija je vrednost što bliža traženom broju
// - svaki broj može da se iskoristi najviše jednom, deljenje mora da bude bez ostatka

export const TIME_LIMIT_SECONDS = 60;
export const MEDIUM = [10, 15, 20];
export const LARGE = [25, 50, 75, 100];

export interface Puzzle {
  target: number;
  numbers: number[];
}

const pick = <T>(arr: T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

export function randomPuzzle(rng: () => number = Math.random): Puzzle {
  const small = Array.from({ length: 4 }, () => 1 + Math.floor(rng() * 9));
  return {
    target: 100 + Math.floor(rng() * 900),
    numbers: [...small, pick(MEDIUM, rng), pick(LARGE, rng)],
  };
}

// ---------- Rešavač: traži najbliži mogući rezultat ----------

interface Item {
  value: number;
  expr: string;
  prec: number; // 3 = broj, 2 = * /, 1 = + -
}

export interface Solution {
  value: number;
  expr: string;
}

function wrap(item: Item, minPrec: number) {
  return item.prec < minPrec ? `(${item.expr})` : item.expr;
}

export function solve(numbers: number[], target: number): Solution {
  let best: Solution = { value: numbers[0], expr: String(numbers[0]) };
  const consider = (it: Item) => {
    if (Math.abs(it.value - target) < Math.abs(best.value - target)) {
      best = { value: it.value, expr: it.expr };
    }
  };

  const start: Item[] = numbers.map((n) => ({ value: n, expr: String(n), prec: 3 }));
  start.forEach(consider);

  const seen = new Set<string>();

  function search(items: Item[]): boolean {
    if (best.value === target) return true;
    const key = items.map((i) => i.value).sort((a, b) => a - b).join(",");
    if (seen.has(key)) return false;
    seen.add(key);

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const rest = items.filter((_, k) => k !== i && k !== j);
        const [a, b] = items[i].value >= items[j].value ? [items[i], items[j]] : [items[j], items[i]];
        const candidates: Item[] = [
          { value: a.value + b.value, expr: `${a.expr} + ${b.expr}`, prec: 1 },
          { value: a.value * b.value, expr: `${wrap(a, 2)} * ${wrap(b, 2)}`, prec: 2 },
        ];
        if (a.value !== b.value) {
          candidates.push({ value: a.value - b.value, expr: `${a.expr} - ${wrap(b, 2)}`, prec: 1 });
        }
        if (b.value > 1 && a.value % b.value === 0) {
          candidates.push({ value: a.value / b.value, expr: `${wrap(a, 2)} / ${wrap(b, 3)}`, prec: 2 });
        }
        for (const c of candidates) {
          if (c.value <= 0) continue;
          consider(c);
          if (best.value === target) return true;
          if (search([...rest, c])) return true;
        }
      }
    }
    return false;
  }

  search(start);
  return best;
}

// ---------- Provera izraza koji je igrač uneo ----------

export class ExpressionError extends Error {}

type Token = { type: "num"; value: number } | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " ") {
      i++;
    } else if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9]/.test(input[j])) j++;
      tokens.push({ type: "num", value: Number(input.slice(i, j)) });
      i = j;
    } else if ("+-*/()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
    } else {
      throw new ExpressionError(`Nedozvoljen znak: ${ch}`);
    }
  }
  return tokens;
}

// Vraća vrednost izraza i spisak brojeva koji su upotrebljeni
export function evaluateExpression(input: string): { value: number; used: number[] } {
  if (input.length > 200) throw new ExpressionError("Izraz je predugačak.");
  const tokens = tokenize(input);
  const used: number[] = [];
  let pos = 0;

  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.type === "op" && peek()!.value === v;

  function primary(): number {
    const t = peek();
    if (!t) throw new ExpressionError("Izraz nije završen.");
    if (t.type === "num") {
      pos++;
      used.push(t.value);
      return t.value;
    }
    if (t.value === "(") {
      pos++;
      const v = sum();
      if (!isOp(")")) throw new ExpressionError("Fali zatvorena zagrada.");
      pos++;
      return v;
    }
    throw new ExpressionError("Neispravan izraz.");
  }

  function product(): number {
    let v = primary();
    while (isOp("*") || isOp("/")) {
      const op = tokens[pos++].value;
      const r = primary();
      if (op === "*") v *= r;
      else {
        if (r === 0) throw new ExpressionError("Deljenje nulom nije dozvoljeno.");
        if (v % r !== 0) throw new ExpressionError("Deljenje mora biti bez ostatka.");
        v /= r;
      }
    }
    return v;
  }

  function sum(): number {
    let v = product();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].value;
      const r = product();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const value = sum();
  if (pos !== tokens.length) throw new ExpressionError("Neispravan izraz.");
  return { value, used };
}

// Proverava da li su upotrebljeni samo ponuđeni brojevi, svaki najviše jednom
export function usesAllowedNumbers(used: number[], available: number[]): boolean {
  const left = [...available];
  for (const n of used) {
    const idx = left.indexOf(n);
    if (idx === -1) return false;
    left.splice(idx, 1);
  }
  return true;
}

// Za jednog igrača: tačan broj 10 poena, inače 0 (u igri u dvoje bliži dobija 5)
export function pointsFor(value: number | null, target: number): number {
  return value === target ? 10 : 0;
}
