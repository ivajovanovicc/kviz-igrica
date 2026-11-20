import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateExpression, randomPuzzle, solve, usesAllowedNumbers, ExpressionError } from "./logic.js";

test("računa izraz po pravilima prioriteta", () => {
  assert.equal(evaluateExpression("2 + 3 * 4").value, 14);
  assert.equal(evaluateExpression("(2 + 3) * 4").value, 20);
  assert.deepEqual(evaluateExpression("(100 - 4) / 8").used, [100, 4, 8]);
});

test("deljenje mora biti bez ostatka", () => {
  assert.throws(() => evaluateExpression("7 / 2"), ExpressionError);
  assert.throws(() => evaluateExpression("7 / (2 - 2)"), ExpressionError);
});

test("loši izrazi se odbijaju", () => {
  assert.throws(() => evaluateExpression("2 +"), ExpressionError);
  assert.throws(() => evaluateExpression("(2 + 3"), ExpressionError);
  assert.throws(() => evaluateExpression("2 3"), ExpressionError);
  assert.throws(() => evaluateExpression("alert(1)"), ExpressionError);
});

test("svaki broj najviše jednom", () => {
  assert.equal(usesAllowedNumbers([5, 5], [5, 3, 5]), true);
  assert.equal(usesAllowedNumbers([5, 5], [5, 3]), false);
  assert.equal(usesAllowedNumbers([7], [5, 3]), false);
});

test("rešavač nalazi tačno rešenje kad postoji", () => {
  const s = solve([1, 3, 7, 6, 10, 100], 734);
  assert.equal(s.value, 734);
  const check = evaluateExpression(s.expr);
  assert.equal(check.value, 734);
  assert.ok(usesAllowedNumbers(check.used, [1, 3, 7, 6, 10, 100]));
});

test("rešenje rešavača je uvek ispravan izraz", () => {
  for (let i = 0; i < 30; i++) {
    const p = randomPuzzle();
    const s = solve(p.numbers, p.target);
    const check = evaluateExpression(s.expr);
    assert.equal(check.value, s.value);
    assert.ok(usesAllowedNumbers(check.used, p.numbers));
  }
});
