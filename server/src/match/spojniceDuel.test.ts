import { test } from "node:test";
import assert from "node:assert/strict";
import { SpojniceDuel } from "./spojniceDuel.js";

const set = (tema: string) => ({
  tema,
  parovi: [["a", "1"], ["b", "2"], ["c", "3"]] as [string, string][],
});
// desno je redosled obrnut: na mestu 0 je par 2, na mestu 1 par 1, na mestu 2 par 0
const puzzle = (tema: string) => ({ set: set(tema), order: [2, 1, 0] });

function makeDuel() {
  let result: [number, number] | null = null;
  const duel = new SpojniceDuel([puzzle("T1"), puzzle("T2")], 0, ["Iva", "Marko"], () => {}, (p) => (result = p), 0);
  return { duel, result: () => result };
}

const wait = () => new Promise((r) => setTimeout(r, 5));

test("glavni igrač ide redom, protivnik pokušava promašene", async () => {
  const { duel, result } = makeDuel();
  assert.equal(duel.pick(1, 2), "Nisi na potezu.");
  assert.equal(duel.pick(0, 2), null); // a -> 1 (na mestu 2): tačno
  assert.equal(duel.pick(0, 0), null); // b -> pogrešno
  assert.equal(duel.pick(0, 0), null); // c -> 3 (na mestu 0): tačno
  let v = duel.view();
  assert.equal(v.phase, "steal");
  assert.equal(v.actor, 1);
  assert.equal(v.current, 1);
  assert.equal(duel.pick(1, 1), null); // Marko spaja b
  await wait();
  v = duel.view();
  assert.equal(v.half, 1);
  assert.equal(v.actor, 1); // u drugoj polovini spaja Marko
  assert.deepEqual(v.points, [4, 2]);

  duel.pick(1, 2);
  duel.pick(1, 1);
  duel.pick(1, 0); // Marko sve tačno, nema krađe
  await wait();
  assert.deepEqual(result(), [4, 8]);
});

test("već spojen pojam ne može ponovo", () => {
  const { duel } = makeDuel();
  duel.pick(0, 2);
  assert.equal(duel.pick(0, 2), "Taj pojam je već spojen.");
  duel.stop();
});
