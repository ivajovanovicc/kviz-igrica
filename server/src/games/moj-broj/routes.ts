import { Router } from "express";
import { BaseSession, GameModule, GameResult, SessionStore } from "../../shared/sessions.js";
import {
  ExpressionError,
  Puzzle,
  TIME_LIMIT_SECONDS,
  evaluateExpression,
  pointsFor,
  randomPuzzle,
  solve,
  usesAllowedNumbers,
} from "./logic.js";

interface MojBrojSession extends BaseSession {
  target: number;
  numbers: number[];
}

const store = new SessionStore<MojBrojSession>(TIME_LIMIT_SECONDS);

function createSession(puzzle: Puzzle, onFinish?: (r: GameResult) => void) {
  const gameId = store.create({ ...puzzle, startedAt: Date.now(), finished: false, onFinish });
  return { gameId, ...puzzle, timeLimitSeconds: TIME_LIMIT_SECONDS };
}

export const mojBrojModule: GameModule<Puzzle> = {
  generate: () => randomPuzzle(),
  createSession,
  forceFinish(id) {
    const game = store.get(id);
    if (game)
      store.complete(game, {
        points: 0,
        detail: { value: null, distance: null, expression: "", best: solve(game.numbers, game.target) },
      });
  },
  maxDurationSeconds: TIME_LIMIT_SECONDS,
};

export const mojBrojRouter = Router();

mojBrojRouter.post("/new", (_req, res) => {
  res.json(createSession(randomPuzzle()));
});

// Igrač šalje izraz (ili prazan string ako nije ništa složio)
mojBrojRouter.post("/:id/submit", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });

  const expression = typeof req.body?.expression === "string" ? req.body.expression.trim() : "";
  const timeUp = store.timeIsUp(game);

  let value: number | null = null;
  let invalidReason: string | undefined;

  if (expression && !timeUp) {
    try {
      const result = evaluateExpression(expression);
      if (!usesAllowedNumbers(result.used, game.numbers)) {
        invalidReason = "Upotrebljeni su brojevi koji nisu ponuđeni.";
      } else {
        value = result.value;
      }
    } catch (e) {
      if (e instanceof ExpressionError) invalidReason = e.message;
      else throw e;
    }
  }

  const points = pointsFor(value, game.target);
  const best = solve(game.numbers, game.target);
  store.complete(game, {
    points,
    detail: { value, distance: value === null ? null : Math.abs(value - game.target), expression, best },
  });
  res.json({ value, invalidReason, timeUp, points, target: game.target, best });
});
