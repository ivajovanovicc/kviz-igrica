import { Router } from "express";
import { BaseSession, SessionStore } from "../../shared/sessions.js";
import { LETTER_COUNT, POINTS_PER_LETTER, TIME_LIMIT_SECONDS, isWord, loadDictionary, longestWord, randomLetters } from "./logic.js";

interface SlagalicaSession extends BaseSession {
  letters: string[];
}

loadDictionary(); // učitaj rečnik odmah pri pokretanju servera

const store = new SessionStore<SlagalicaSession>(TIME_LIMIT_SECONDS);
export const slagalicaRouter = Router();

slagalicaRouter.post("/new", (_req, res) => {
  const letters = randomLetters();
  const gameId = store.create({ letters, startedAt: Date.now(), finished: false });
  res.json({ gameId, letters, timeLimitSeconds: TIME_LIMIT_SECONDS });
});

// Igrač šalje redne brojeve pločica koje je izabrao, npr. [3, 0, 7]
slagalicaRouter.post("/:id/submit", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });

  const tiles: unknown = req.body?.tiles;
  const timeUp = store.timeIsUp(game);
  const valid =
    Array.isArray(tiles) &&
    tiles.length <= LETTER_COUNT &&
    new Set(tiles).size === tiles.length &&
    tiles.every((t) => Number.isInteger(t) && t >= 0 && t < LETTER_COUNT);
  if (!valid) return res.status(400).json({ error: "Neispravan izbor slova." });

  const word = (tiles as number[]).map((t) => game.letters[t]).join("");
  const accepted = !timeUp && word.length > 0 && isWord(word);
  const letterCount = (tiles as number[]).length;

  game.finished = true;
  res.json({
    word,
    accepted,
    timeUp,
    points: accepted ? letterCount * POINTS_PER_LETTER : 0,
    longest: longestWord(game.letters),
  });
});
