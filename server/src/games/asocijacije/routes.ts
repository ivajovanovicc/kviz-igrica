import { Response, Router } from "express";
import { BaseSession, GameModule, GameResult, SessionStore } from "../../shared/sessions.js";
import { pickRandom, readData } from "../../shared/data.js";
import { answerMatches } from "../../shared/text.js";
import { Asocijacija, TIME_LIMIT_SECONDS, columnPoints, finalPoints } from "./logic.js";

interface AsocSession extends BaseSession {
  board: Asocijacija;
  opened: boolean[][];
  solved: boolean[];
  score: number;
}

const boards = readData<Asocijacija[]>("asocijacije/asocijacije.json");
const store = new SessionStore<AsocSession>(TIME_LIMIT_SECONDS);
export const asocijacijeRouter = Router();

// Ono što igrač sme da vidi: otvorena polja i rešenja rešenih kolona
function view(game: AsocSession) {
  const revealAll = game.finished;
  return {
    columns: game.board.kolone.map((k, c) => ({
      fields: k.polja.map((p, f) => (revealAll || game.opened[c][f] || game.solved[c] ? p : null)),
      solution: revealAll || game.solved[c] ? k.resenje : null,
      solved: game.solved[c],
    })),
    final: game.finished ? game.board.konacno : null,
    score: game.score,
    finished: game.finished,
  };
}

function load(req: { params: { id: string } }, res: Response): AsocSession | null {
  const game = store.get(req.params.id);
  if (!game) {
    res.status(404).json({ error: "Igra ne postoji." });
    return null;
  }
  if (game.finished) {
    res.status(400).json({ error: "Igra je završena." });
    return null;
  }
  if (store.timeIsUp(game)) {
    store.complete(game, { points: game.score });
    res.json({ ...view(game), timeUp: true });
    return null;
  }
  return game;
}

function createSession(board: Asocijacija, onFinish?: (r: GameResult) => void) {
  const game: AsocSession = {
    board,
    opened: board.kolone.map((k) => k.polja.map(() => false)),
    solved: board.kolone.map(() => false),
    score: 0,
    startedAt: Date.now(),
    finished: false,
    onFinish,
  };
  const gameId = store.create(game);
  return { gameId, timeLimitSeconds: TIME_LIMIT_SECONDS, ...view(game) };
}

// Tabla koja još nije bila u ovoj partiji
export function generateAsocijacija(used: Asocijacija[] = []): Asocijacija {
  const fresh = boards.filter((b) => !used.includes(b));
  return pickRandom(fresh.length ? fresh : boards);
}

export const asocijacijeModule: GameModule<Asocijacija> = {
  generate: () => pickRandom(boards),
  createSession,
  forceFinish(id) {
    const game = store.get(id);
    if (game) store.complete(game, { points: game.score });
  },
  maxDurationSeconds: TIME_LIMIT_SECONDS,
};

asocijacijeRouter.post("/new", (_req, res) => {
  res.json(createSession(pickRandom(boards)));
});

asocijacijeRouter.post("/:id/open", (req, res) => {
  const game = load(req, res);
  if (!game) return;
  const { column, field } = req.body ?? {};
  if (!Number.isInteger(column) || !Number.isInteger(field) || !game.opened[column] || game.opened[column][field] === undefined) {
    return res.status(400).json({ error: "Neispravno polje." });
  }
  game.opened[column][field] = true;
  res.json(view(game));
});

// target: indeks kolone (0-3) ili "final"
asocijacijeRouter.post("/:id/guess", (req, res) => {
  const game = load(req, res);
  if (!game) return;
  const { target, answer } = req.body ?? {};
  if (typeof answer !== "string") return res.status(400).json({ error: "Nema odgovora." });

  let correct = false;
  if (target === "final") {
    correct = answerMatches(answer, game.board.konacno, game.board.prihvata);
    if (correct) {
      game.score += finalPoints(game.opened, game.solved);
      store.complete(game, { points: game.score });
    }
  } else if (Number.isInteger(target) && game.board.kolone[target] && !game.solved[target]) {
    const kolona = game.board.kolone[target];
    correct = answerMatches(answer, kolona.resenje, kolona.prihvata);
    if (correct) {
      game.score += columnPoints(game.opened[target]);
      game.solved[target] = true;
    }
  } else {
    return res.status(400).json({ error: "Neispravna kolona." });
  }
  res.json({ correct, ...view(game) });
});

asocijacijeRouter.post("/:id/give-up", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  store.complete(game, { points: game.score });
  res.json(view(game));
});
