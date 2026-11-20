import { test } from "node:test";
import assert from "node:assert/strict";
import { AsocDuel } from "./asocDuel.js";

const board = {
  kolone: [
    { polja: ["a1", "a2", "a3", "a4"], resenje: "Reka" },
    { polja: ["b1", "b2", "b3", "b4"], resenje: "Kiša" },
    { polja: ["c1", "c2", "c3", "c4"], resenje: "More" },
    { polja: ["d1", "d2", "d3", "d4"], resenje: "Led" },
  ],
  konacno: "Voda",
};

function makeDuel() {
  let finished: [number, number] | null = null;
  const duel = new AsocDuel(board, 0, ["Iva", "Marko"], () => {}, (p) => (finished = p), 0);
  return { duel, result: () => finished };
}

test("potezi: otvori, pa pogađaj; promašaj predaje potez", () => {
  const { duel } = makeDuel();
  assert.equal(duel.open(1, 0, 0), "Nisi na potezu.");
  assert.equal(duel.guess(0, 0, "reka"), "Prvo otvori jedno polje.");
  assert.equal(duel.open(0, 0, 0), null);
  assert.equal(duel.guess(0, 0, "pogrešno"), null);
  assert.equal(duel.view().turn, 1);
  assert.equal(duel.view().phase, "open");
  duel.stop();
});

test("tačna kolona: poeni i ostaje na potezu; konačno završava igru", async () => {
  const { duel, result } = makeDuel();
  duel.open(0, 0, 0);
  duel.guess(0, 0, "REKA");
  let v = duel.view();
  assert.equal(v.columns[0].solvedBy, 0);
  assert.deepEqual(v.points, [8, 0]); // 5 + 3 neotvorena polja
  assert.equal(v.turn, 0);
  duel.guess(0, "final", "voda");
  v = duel.view();
  assert.equal(v.finished, true);
  await new Promise((r) => setTimeout(r, 10));
  // 10 + kolone B, C, D (svaka 5 + 4)
  assert.deepEqual(result(), [8 + 10 + 27, 0]);
});

test("predaja poteza", () => {
  const { duel } = makeDuel();
  assert.equal(duel.pass(0), "Prvo otvori jedno polje.");
  duel.open(0, 1, 1);
  assert.equal(duel.pass(0), null);
  assert.equal(duel.view().turn, 1);
  duel.stop();
});
