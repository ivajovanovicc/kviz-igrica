import { Router } from "express";
import { BaseSession, GameModule, GameResult, SessionStore } from "../../shared/sessions.js";
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
interface SkockoGame extends BaseSession {
  secret: Code;
  attempts: { guess: Code; feedback: Feedback }[];
}

const store = new SessionStore<SkockoGame>(TIME_LIMIT_SECONDS);

function createSession(secret: Code, onFinish?: (r: GameResult) => void) {
  const gameId = store.create({ secret, attempts: [], startedAt: Date.now(), finished: false, onFinish });
  return {
    gameId,
    symbolCount: SYMBOL_COUNT,
    codeLength: CODE_LENGTH,
    maxAttempts: MAX_ATTEMPTS,
    timeLimitSeconds: TIME_LIMIT_SECONDS,
  };
}

function timeUpResponse(game: SkockoGame) {
  store.complete(game, { points: 0, detail: { attempts: null } });
  return { timeUp: true, finished: true, solved: false, points: 0, solution: game.secret };
}

export const skockoModule: GameModule<Code> = {
  generate: () => randomCode(),
  createSession,
  forceFinish(id) {
    const game = store.get(id);
    if (game) store.complete(game, { points: 0, detail: { attempts: null } });
  },
  maxDurationSeconds: TIME_LIMIT_SECONDS,
};

export const skockoRouter = Router();

skockoRouter.post("/new", (_req, res) => {
  res.json(createSession(randomCode()));
});

skockoRouter.post("/:id/guess", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });
  if (store.timeIsUp(game)) return res.json(timeUpResponse(game));

  const guess = req.body?.guess;
  if (!isValidCode(guess)) return res.status(400).json({ error: "Neispravna kombinacija." });

  const feedback = evaluate(game.secret, guess);
  game.attempts.push({ guess, feedback });
  const attemptNumber = game.attempts.length;
  const solved = feedback.red === CODE_LENGTH;
  const finished = solved || attemptNumber >= MAX_ATTEMPTS;
  const points = solved ? pointsFor(attemptNumber) : 0;
  if (finished) store.complete(game, { points, detail: { attempts: solved ? attemptNumber : null } });

  res.json({
    feedback,
    attemptNumber,
    solved,
    finished,
    points,
    solution: finished ? game.secret : undefined,
  });
});

skockoRouter.post("/:id/timeout", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  res.json(timeUpResponse(game));
});
