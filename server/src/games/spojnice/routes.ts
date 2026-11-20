import { Router } from "express";
import { BaseSession, SessionStore } from "../../shared/sessions.js";
import { pickRandom, readData, shuffle } from "../../shared/data.js";

// Pravila Spojnica: levi pojmovi idu redom, za svaki igrač ima jedan pokušaj da izabere par desno.
export const TIME_LIMIT_SECONDS = 60;
export const POINTS_PER_PAIR = 2;

interface SpojniceSet {
  tema: string;
  parovi: [string, string][];
}

interface SpojniceSession extends BaseSession {
  answerFor: number[]; // za levi pojam i -> indeks tačnog desnog pojma (u izmešanom redosledu)
  current: number;
  results: (boolean | null)[];
}

const sets = readData<SpojniceSet[]>("spojnice/spojnice.json");
const store = new SessionStore<SpojniceSession>(TIME_LIMIT_SECONDS);
export const spojniceRouter = Router();

function summary(game: SpojniceSession) {
  const correct = game.results.filter((r) => r === true).length;
  return { finished: true, results: game.results, answerFor: game.answerFor, points: correct * POINTS_PER_PAIR };
}

spojniceRouter.post("/new", (_req, res) => {
  const set = pickRandom(sets);
  const order = shuffle(set.parovi.map((_, i) => i)); // order[k] = koji par stoji na k-tom mestu desno
  const answerFor = set.parovi.map((_, i) => order.indexOf(i));
  const gameId = store.create({
    answerFor,
    current: 0,
    results: set.parovi.map(() => null),
    startedAt: Date.now(),
    finished: false,
  });
  res.json({
    gameId,
    tema: set.tema,
    left: set.parovi.map((p) => p[0]),
    right: order.map((i) => set.parovi[i][1]),
    timeLimitSeconds: TIME_LIMIT_SECONDS,
  });
});

spojniceRouter.post("/:id/guess", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });

  if (store.timeIsUp(game)) {
    game.finished = true;
    return res.json({ ...summary(game), timeUp: true });
  }

  const { left, right } = req.body ?? {};
  if (left !== game.current || !Number.isInteger(right) || right < 0 || right >= game.answerFor.length) {
    return res.status(400).json({ error: "Neispravan potez." });
  }

  const correct = game.answerFor[left] === right;
  game.results[left] = correct;
  game.current++;
  const finished = game.current >= game.answerFor.length;
  game.finished = finished;
  res.json(finished ? { correct, ...summary(game) } : { correct, finished: false });
});

spojniceRouter.post("/:id/timeout", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  game.finished = true;
  res.json({ ...summary(game), timeUp: true });
});
