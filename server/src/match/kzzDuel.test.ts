import { test } from "node:test";
import assert from "node:assert/strict";
import { KzzDuel } from "./kzzDuel.js";

const puzzle = [
  { question: "Q1", options: ["a", "b", "c", "d"], correct: 1 },
  { question: "Q2", options: ["a", "b", "c", "d"], correct: 2 },
];
const wait = (ms = 5) => new Promise((r) => setTimeout(r, ms));

test("brži tačan dobija 6, sporiji tačan 0, netačan -3", async () => {
  let result: [number, number] | null = null;
  const d = new KzzDuel(puzzle, () => {}, (p) => (result = p), 10, 0);
  assert.equal(d.answer(1, 0, 1), null); // igrač 2 prvi tačno
  assert.equal(d.view(0).phase, "question"); // čeka se igrač 1
  assert.equal(d.view(0).opponentAnswered, true);
  assert.equal(d.view(0).opponentAnswer, undefined); // tuđi odgovor se ne vidi pre kraja
  d.answer(0, 0, 1); // igrač 1 kasnije tačno
  assert.equal(d.view(0).phase, "reveal");
  assert.deepEqual(d.view(0).deltas, [0, 6]);
  await wait();
  assert.equal(d.view(0).index, 1);
  d.answer(0, 1, 0); // netačno
  d.answer(1, 1, null); // preskače
  await wait();
  assert.deepEqual(result, [-3, 6]);
});

test("ne može dva puta odgovor ni na pogrešno pitanje", () => {
  const d = new KzzDuel(puzzle, () => {}, () => {}, 10, 0);
  assert.equal(d.answer(0, 1, 1), "Pogrešno pitanje.");
  d.answer(0, 0, 3);
  assert.equal(d.answer(0, 0, 1), "Već si odgovorio/la.");
  d.stop();
});
