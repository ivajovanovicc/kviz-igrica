import { test } from "node:test";
import assert from "node:assert/strict";
import { columnPoints, finalPoints } from "./logic.js";
import { answerMatches } from "../../shared/text.js";

test("bodovi za kolonu", () => {
  assert.equal(columnPoints([true, false, false, false]), 5);
  assert.equal(columnPoints([true, true, true, true]), 2);
});

test("bodovi za konačno rešenje uključuju nerešene kolone", () => {
  const opened = [
    [true, false, false, false],
    [false, false, false, false],
    [true, true, true, true],
    [true, true, false, false],
  ];
  // kolona 2 je već rešena, ostale se dodaju: 5 + 6 + 4
  assert.equal(finalPoints(opened, [false, false, true, false]), 5 + 5 + 6 + 4);
});

test("odgovor se prihvata bez obzira na kvačice i velika slova", () => {
  assert.equal(answerMatches("  ŠKOLA ", "Škola"), true);
  assert.equal(answerMatches("skola", "Škola"), true);
  assert.equal(answerMatches("ocene", "Ocena", ["ocene"]), true);
  assert.equal(answerMatches("", "Škola"), false);
  assert.equal(answerMatches("kola", "Škola"), false);
});
