import { test } from "node:test";
import assert from "node:assert/strict";
import { columnPoints, finalPoints } from "./logic.js";
import { answerMatches } from "../../shared/text.js";

test("bodovi za kolonu", () => {
  assert.equal(columnPoints([true, false, false, false]), 8);
  assert.equal(columnPoints([true, true, true, true]), 5);
});

test("bodovi za konačno rešenje uključuju nerešene kolone", () => {
  const opened = [
    [true, false, false, false],
    [false, false, false, false],
    [true, true, true, true],
    [true, true, false, false],
  ];
  // kolona 2 je već rešena, ostale se dodaju: 8 + 9 + 7
  assert.equal(finalPoints(opened, [false, false, true, false]), 10 + 8 + 9 + 7);
});

test("odgovor se prihvata bez obzira na kvačice i velika slova", () => {
  assert.equal(answerMatches("  ŠKOLA ", "Škola"), true);
  assert.equal(answerMatches("skola", "Škola"), true);
  assert.equal(answerMatches("ocene", "Ocena", ["ocene"]), true);
  assert.equal(answerMatches("", "Škola"), false);
  assert.equal(answerMatches("kola", "Škola"), false);
});
