import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  CODE_LENGTH,
  Code,
  Feedback,
  MAX_ATTEMPTS,
  SYMBOL_COUNT,
  TIME_LIMIT_SECONDS,
  evaluate,
  isValidCode,
  pointsFor,
  randomCode,
} from "./logic.js";

// Tajna kombinacija stoji samo na serveru, da igrač ne može da je pročita iz browsera.
interface SkockoGame {
  secret: Code;
  attempts: { guess: Code; feedback: Feedback }[];
  startedAt: number;
  finished: boolean;
}

const games = new Map<string, SkockoGame>();
const GRACE_MS = 2000; // mala tolerancija za kašnjenje mreže

export const skockoRouter = Router();

skockoRouter.post("/new", (_req, res) => {
  const id = randomUUID();
  games.set(id, { secret: randomCode(), attempts: [], startedAt: Date.now(), finished: false });
  res.json({
    gameId: id,
    symbolCount: SYMBOL_COUNT,
    codeLength: CODE_LENGTH,
    maxAttempts: MAX_ATTEMPTS,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
  });
});

function timeIsUp(game: SkockoGame) {
  return Date.now() - game.startedAt > TIME_LIMIT_SECONDS * 1000 + GRACE_MS;
}

skockoRouter.post("/:id/guess", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });

  if (timeIsUp(game)) {
    game.finished = true;
    return res.json({ timeUp: true, finished: true, solved: false, points: 0, solution: game.secret });
  }

  const guess = req.body?.guess;
  if (!isValidCode(guess)) return res.status(400).json({ error: "Neispravna kombinacija." });

  const feedback = evaluate(game.secret, guess);
  game.attempts.push({ guess, feedback });
  const attemptNumber = game.attempts.length;
  const solved = feedback.red === CODE_LENGTH;
  const finished = solved || attemptNumber >= MAX_ATTEMPTS;
  game.finished = finished;

  res.json({
    feedback,
    attemptNumber,
    solved,
    finished,
    points: solved ? pointsFor(attemptNumber) : 0,
    solution: finished ? game.secret : undefined,
  });
});

skockoRouter.post("/:id/timeout", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  game.finished = true;
  res.json({ timeUp: true, finished: true, solved: false, points: 0, solution: game.secret });
});

// Čišćenje starih partija iz memorije
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, game] of games) if (game.startedAt < cutoff) games.delete(id);
}, 10 * 60 * 1000).unref();
