import { Router } from "express";
import { BaseSession, SessionStore } from "../../shared/sessions.js";
import {
  ExpressionError,
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
export const mojBrojRouter = Router();

mojBrojRouter.post("/new", (_req, res) => {
  const puzzle = randomPuzzle();
  const gameId = store.create({ ...puzzle, startedAt: Date.now(), finished: false });
  res.json({ gameId, ...puzzle, timeLimitSeconds: TIME_LIMIT_SECONDS });
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

  game.finished = true;
  const best = solve(game.numbers, game.target);
  res.json({
    value,
    invalidReason,
    timeUp,
    points: pointsFor(value, game.target),
    target: game.target,
    best,
  });
});
