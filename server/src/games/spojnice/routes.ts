import { Router } from "express";
import { BaseSession, GameModule, GameResult, SessionStore } from "../../shared/sessions.js";
import { pickRandom, readData, shuffle } from "../../shared/data.js";

// Pravila Spojnica: levi pojmovi idu redom, za svaki igrač ima jedan pokušaj da izabere par desno.
export const TIME_LIMIT_SECONDS = 60;
export const POINTS_PER_PAIR = 2;

export interface SpojniceSet {
  tema: string;
  parovi: [string, string][];
}

export interface Puzzle {
  set: SpojniceSet;
  order: number[]; // order[k] = koji par stoji na k-tom mestu desno
}

interface SpojniceSession extends BaseSession {
  answerFor: number[]; // za levi pojam i -> indeks tačnog desnog pojma (u izmešanom redosledu)
  current: number;
  results: (boolean | null)[];
}

const sets = readData<SpojniceSet[]>("spojnice/spojnice.json");
const store = new SessionStore<SpojniceSession>(TIME_LIMIT_SECONDS);

export function generate(exceptTema?: string): Puzzle {
  const pool = sets.filter((s) => s.tema !== exceptTema);
  const set = pickRandom(pool.length ? pool : sets);
  return { set, order: shuffle(set.parovi.map((_, i) => i)) };
}

function createSession({ set, order }: Puzzle, onFinish?: (r: GameResult) => void) {
  const gameId = store.create({
    answerFor: set.parovi.map((_, i) => order.indexOf(i)),
    current: 0,
    results: set.parovi.map(() => null),
    startedAt: Date.now(),
    finished: false,
    onFinish,
  });
  return {
    gameId,
    tema: set.tema,
    left: set.parovi.map((p) => p[0]),
    right: order.map((i) => set.parovi[i][1]),
    timeLimitSeconds: TIME_LIMIT_SECONDS,
  };
}

function finish(game: SpojniceSession) {
  const correct = game.results.filter((r) => r === true).length;
  const points = correct * POINTS_PER_PAIR;
  store.complete(game, { points, detail: { correct } });
  return { finished: true, results: game.results, answerFor: game.answerFor, points };
}

export const spojniceModule: GameModule<Puzzle> = {
  generate,
  createSession,
  forceFinish(id) {
    const game = store.get(id);
    if (game) finish(game);
  },
  maxDurationSeconds: TIME_LIMIT_SECONDS,
};

export const spojniceRouter = Router();

spojniceRouter.post("/new", (_req, res) => {
  res.json(createSession(generate()));
});

spojniceRouter.post("/:id/guess", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });
  if (store.timeIsUp(game)) return res.json({ ...finish(game), timeUp: true });

  const { left, right } = req.body ?? {};
  if (left !== game.current || !Number.isInteger(right) || right < 0 || right >= game.answerFor.length) {
    return res.status(400).json({ error: "Neispravan potez." });
  }

  const correct = game.answerFor[left] === right;
  game.results[left] = correct;
  game.current++;
  if (game.current >= game.answerFor.length) return res.json({ correct, ...finish(game) });
  res.json({ correct, finished: false });
});

spojniceRouter.post("/:id/timeout", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  res.json({ ...finish(game), timeUp: true });
});
