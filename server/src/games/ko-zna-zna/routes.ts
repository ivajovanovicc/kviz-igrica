import { Router } from "express";
import { BaseSession, SessionStore } from "../../shared/sessions.js";
import { readData, shuffle } from "../../shared/data.js";

// Pravila Ko zna zna: 10 pitanja, tačan odgovor +10, netačan -5, preskočeno 0.
export const QUESTION_COUNT = 10;
export const SECONDS_PER_QUESTION = 10;
export const POINTS_CORRECT = 10;
export const POINTS_WRONG = -5;
const GRACE_MS = 1500;

interface Pitanje {
  pitanje: string;
  tacno: string;
  netacno: string[];
}

interface KzzSession extends BaseSession {
  correctOption: number[];
  current: number;
  questionStartedAt: number;
  score: number;
}

const questions = readData<Pitanje[]>("ko-zna-zna/pitanja.json");
const store = new SessionStore<KzzSession>(QUESTION_COUNT * SECONDS_PER_QUESTION + 60);
export const koZnaZnaRouter = Router();

koZnaZnaRouter.post("/new", (_req, res) => {
  const chosen = shuffle(questions).slice(0, QUESTION_COUNT);
  const prepared = chosen.map((q) => {
    const options = shuffle([q.tacno, ...q.netacno]);
    return { question: q.pitanje, options, correct: options.indexOf(q.tacno) };
  });
  const now = Date.now();
  const gameId = store.create({
    correctOption: prepared.map((p) => p.correct),
    current: 0,
    questionStartedAt: now,
    score: 0,
    startedAt: now,
    finished: false,
  });
  res.json({
    gameId,
    questions: prepared.map((p) => ({ question: p.question, options: p.options })),
    secondsPerQuestion: SECONDS_PER_QUESTION,
  });
});

// option = indeks izabranog odgovora, ili null ako igrač preskače / vreme je isteklo
koZnaZnaRouter.post("/:id/answer", (req, res) => {
  const game = store.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Igra ne postoji." });
  if (game.finished) return res.status(400).json({ error: "Igra je završena." });

  const { question, option } = req.body ?? {};
  if (question !== game.current) return res.status(400).json({ error: "Pogrešno pitanje." });

  const late = Date.now() - game.questionStartedAt > SECONDS_PER_QUESTION * 1000 + GRACE_MS;
  const answered = !late && Number.isInteger(option) && option >= 0 && option < 4;
  const correctOption = game.correctOption[question];
  const correct = answered && option === correctOption;
  const delta = !answered ? 0 : correct ? POINTS_CORRECT : POINTS_WRONG;

  game.score += delta;
  game.current++;
  game.questionStartedAt = Date.now();
  game.finished = game.current >= game.correctOption.length;

  res.json({ correct, correctOption, delta, score: game.score, finished: game.finished });
});
