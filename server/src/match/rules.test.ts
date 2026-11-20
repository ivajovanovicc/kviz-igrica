import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreRound } from "./rules.js";

const sl = (length: number) => ({ points: length * 2, detail: { length } });
const mb = (distance: number | null) => ({ points: distance === 0 ? 10 : 0, detail: { distance } });

test("Slagalica: duža reč nosi poene", () => {
  assert.deepEqual(scoreRound("slagalica", [sl(7), sl(5)]), [14, 0]);
  assert.deepEqual(scoreRound("slagalica", [sl(0), sl(5)]), [0, 10]);
  assert.deepEqual(scoreRound("slagalica", [sl(6), sl(6)]), [12, 12]);
  assert.deepEqual(scoreRound("slagalica", [sl(0), sl(0)]), [0, 0]);
});

test("Moj broj: tačno 10, bliži 5", () => {
  assert.deepEqual(scoreRound("moj-broj", [mb(0), mb(3)]), [10, 0]);
  assert.deepEqual(scoreRound("moj-broj", [mb(0), mb(0)]), [10, 10]);
  assert.deepEqual(scoreRound("moj-broj", [mb(4), mb(9)]), [5, 0]);
  assert.deepEqual(scoreRound("moj-broj", [mb(null), mb(9)]), [0, 5]);
  assert.deepEqual(scoreRound("moj-broj", [mb(2), mb(2)]), [5, 5]);
  assert.deepEqual(scoreRound("moj-broj", [mb(null), mb(null)]), [0, 0]);
});

test("ostale igre: svako svoje", () => {
  assert.deepEqual(scoreRound("spojnice", [{ points: 8 }, { points: 12 }]), [8, 12]);
});
