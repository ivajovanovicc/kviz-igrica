import { test } from "node:test";
import assert from "node:assert/strict";
import { SpojniceDuel } from "./spojniceDuel.js";

const set = (tema: string) => ({
  tema,
  parovi: [["a", "1"], ["b", "2"], ["c", "3"]] as [string, string][],
});
// desno je redosled obrnut: par 0 je na mestu 2, par 1 na mestu 1, par 2 na mestu 0
const puzzle = (tema: string) => ({ set: set(tema), order: [2, 1, 0] });
const wait = () => new Promise((r) => setTimeout(r, 5));

test("promašaj daje šansu protivniku na istom pojmu, sledeći pojam opet prvo glavni igrač", async () => {
  let result: [number, number] | null = null;
  const duel = new SpojniceDuel([puzzle("T1"), puzzle("T2")], 0, ["Iva", "Marko"], () => {}, (p) => (result = p), 0);
  assert.equal(duel.pick(1, 2), "Nisi na potezu.");

  // pojam a (tačno: mesto 2): Iva promaši, šansa Marku
  duel.pick(0, 0);
  let v = duel.view();
  assert.equal(v.current, 0);
  assert.equal(v.actor, 1);
  assert.equal(v.isSecondChance, true);
  duel.pick(1, 1); // i Marko promaši -> sledeći pojam
  v = duel.view();
  assert.equal(v.current, 1);
  assert.equal(v.actor, 0); // opet prvo Iva
  assert.equal(v.missed[0], true);

  // pojam b: Iva promaši, Marko pogodi
  duel.pick(0, 0);
  duel.pick(1, 1);
  v = duel.view();
  assert.equal(v.solvedBy[1], 1);
  assert.equal(v.actor, 0); // pojam c: opet prvo Iva
  assert.equal(duel.pick(0, 1), "Taj pojam je već spojen.");
  duel.pick(0, 0); // Iva pogodi c -> kraj polovine
  await wait();
  v = duel.view();
  assert.equal(v.half, 1);
  assert.equal(v.actor, 1); // drugu polovinu počinje Marko
  assert.deepEqual(v.points, [2, 2]);

  duel.pick(1, 2);
  duel.pick(1, 1);
  duel.pick(1, 0);
  await wait();
  assert.deepEqual(result, [2, 8]);
});
