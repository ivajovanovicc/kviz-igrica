import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, isValidCode, pointsFor } from "./logic.js";

test("sve na mestu", () => {
  assert.deepEqual(evaluate([1, 2, 3, 4], [1, 2, 3, 4]), { red: 4, yellow: 0 });
});

test("svi simboli pogođeni, nijedan na mestu", () => {
  assert.deepEqual(evaluate([1, 2, 3, 4], [4, 3, 2, 1]), { red: 0, yellow: 4 });
});

test("ponavljanja se ne broje duplo", () => {
  assert.deepEqual(evaluate([0, 0, 1, 1], [0, 1, 0, 2]), { red: 1, yellow: 2 });
  assert.deepEqual(evaluate([0, 1, 2, 3], [0, 0, 0, 0]), { red: 1, yellow: 0 });
  assert.deepEqual(evaluate([5, 5, 5, 1], [1, 5, 2, 2]), { red: 1, yellow: 1 });
});

test("validacija", () => {
  assert.equal(isValidCode([0, 1, 2, 5]), true);
  assert.equal(isValidCode([0, 1, 2]), false);
  assert.equal(isValidCode([0, 1, 2, 6]), false);
  assert.equal(isValidCode("abcd"), false);
});

test("bodovi", () => {
  assert.equal(pointsFor(1), 30);
  assert.equal(pointsFor(5), 20);
  assert.equal(pointsFor(6), 10);
});
