import { test } from "node:test";
import assert from "node:assert/strict";
import { SkockoDuel } from "./skockoDuel.js";

const wait = () => new Promise((r) => setTimeout(r, 5));

test("vlasnik pogodi iz 3. pokušaja: 15 poena, protivnik ne igra", async () => {
  let result: [number, number] | null = null;
  const d = new SkockoDuel([1, 2, 3, 4], 0, () => {}, (p) => (result = p), 0);
  assert.equal(d.guess(1, [0, 0, 0, 0]), "Nisi na potezu.");
  d.guess(0, [0, 0, 0, 0]);
  d.guess(0, [4, 3, 2, 1]);
  assert.equal(d.view().solution, null); // rešenje se ne vidi dok traje igra
  d.guess(0, [1, 2, 3, 4]);
  assert.equal(d.view().phase, "reveal");
  assert.deepEqual(d.view().solution, [1, 2, 3, 4]);
  await wait();
  assert.deepEqual(result, [15, 0]);
});

test("vlasnik promaši 6 puta, protivnik pogodi iz jednog pokušaja: 5 poena", async () => {
  let result: [number, number] | null = null;
  const d = new SkockoDuel([5, 5, 5, 5], 1, () => {}, (p) => (result = p), 0);
  for (let i = 0; i < 6; i++) d.guess(1, [0, 1, 2, 3]);
  assert.equal(d.view().phase, "steal");
  assert.equal(d.view().actor, 0);
  assert.equal(d.guess(1, [5, 5, 5, 5]), "Nisi na potezu.");
  d.guess(0, [5, 5, 5, 5]);
  await wait();
  assert.deepEqual(result, [5, 0]);
});
