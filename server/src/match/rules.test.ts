import { test } from "node:test";
import assert from "node:assert/strict";
import { GAME_ORDER, roundOwner, scoreRound } from "./rules.js";

const sl = (length: number, longestLength = 10) => ({ points: 0, detail: { length, longestLength } });
const mb = (distance: number | null) => ({ points: 0, detail: { distance } });

test("svaka igra dva puta, prva runda igrača 1, druga igrača 2", () => {
  assert.equal(GAME_ORDER.length, 12);
  assert.equal(roundOwner(0), 0);
  assert.equal(roundOwner(1), 1);
  assert.equal(roundOwner(10), 0);
  assert.equal(roundOwner(11), 1);
});

test("Slagalica kao u originalu", () => {
  // TERMINA (7) protiv PREMOTATI (9): 7 i 9 + 6
  assert.deepEqual(scoreRound("slagalica", [sl(7, 10), sl(9, 10)], 0), [7, 15]);
  // obe ZAKUVAVATI (10) u igri igrača 2: 10 i 10 + 6 (moja igra) + 3 (kao kompjuter)
  assert.deepEqual(scoreRound("slagalica", [sl(10, 10), sl(10, 10)], 1), [10, 19]);
  assert.deepEqual(scoreRound("slagalica", [sl(0), sl(0)], 0), [0, 0]);
  assert.deepEqual(scoreRound("slagalica", [sl(0), sl(4)], 0), [0, 10]);
});

test("Moj broj: bliži dobija, izjednačeno vlasnik runde", () => {
  assert.deepEqual(scoreRound("moj-broj", [mb(0), mb(0)], 0), [10, 0]);
  assert.deepEqual(scoreRound("moj-broj", [mb(1), mb(0)], 0), [0, 10]);
  assert.deepEqual(scoreRound("moj-broj", [mb(4), mb(9)], 1), [5, 0]);
  assert.deepEqual(scoreRound("moj-broj", [mb(3), mb(3)], 1), [0, 5]);
  assert.deepEqual(scoreRound("moj-broj", [mb(null), mb(9)], 0), [0, 5]);
  assert.deepEqual(scoreRound("moj-broj", [mb(null), mb(null)], 0), [0, 0]);
});

test("ostale igre: svako svoje", () => {
  assert.deepEqual(scoreRound("spojnice", [{ points: 8 }, { points: 12 }], 0), [8, 12]);
});
