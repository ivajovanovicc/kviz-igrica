import { Router } from "express";
import { BaseSession, GameModule, GameResult, SessionStore } from "../../shared/sessions.js";
import { splitLetters } from "./letters.js";
import { LETTER_COUNT, POINTS_PER_LETTER, TIME_LIMIT_SECONDS, isWord, loadDictionary, longestWord, randomLetters } from "./logic.js";

interface SlagalicaSession extends BaseSession {
  letters: string[];
}

loadDictionary(); // učitaj rečnik odmah pri pokretanju servera

const store = new SessionStore<SlagalicaSession>(TIME_LIMIT_SECONDS);

function createSession(letters: string[], onFinish?: (r: GameResult) => void) {
  const gameId = store.create({ letters, startedAt: Date.now(), finished: false, onFinish });
  return { gameId, letters, timeLimitSeconds: TIME_LIMIT_SECONDS };
}

export const slagalicaModule: GameModule<string[]> = {
  generate: () => randomLetters(),
  createSession,
  forceFinish(id) {
    const game = store.get(id);
    if (!game) return;
    const longest = longestWord(game.letters);
    store.complete(game, {
      points: 0,
      detail: { word: "", length: 0, attempted: "", longest, longestLength: longest ? splitLetters(longest).length : 0 },
    });
  },
  maxDurationSeconds: TIME_LIMIT_SECONDS,
};

export const slagalicaRouter = Router();

slagalicaRouter.post("/new", (_req, res) => {
  res.json(createSession(randomLetters()));
});

function validTiles(tiles: unknown): tiles is number[] {
  return (
    Array.isArray(tiles) &&
    tiles.length <= LETTER_COUNT &&
    new Set(tiles).size === tiles.length &&
    tiles.every((t) => Number.isInteger(t) && t >= 0 && t < LETTER_COUNT)
  );
}

// Provera tokom igre (bez završavanja): da li reč od izabranih pločica postoji u rečniku
slagalicaRouter.post("/:id/check", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  const tiles: unknown = req.body?.tiles;
  if (!validTiles(tiles) || tiles.length === 0) return res.status(400).json({ error: "Neispravan izbor slova." });
  res.json({ exists: isWord(tiles.map((t) => game.letters[t]).join("")) });
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
  const points = accepted ? letterCount * POINTS_PER_LETTER : 0;

  const longest = longestWord(game.letters);
  // u partiji u dvoje protivnik vidi i reč koja nije priznata (attempted), da bi mogli da uporede
  store.complete(game, {
    points,
    detail: {
      word: accepted ? word : "",
      length: accepted ? letterCount : 0,
      attempted: word,
      longest,
      longestLength: longest ? splitLetters(longest).length : 0,
    },
  });
  res.json({ word, accepted, timeUp, points, longest });
});
