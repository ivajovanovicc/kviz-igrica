import { test } from "node:test";
import assert from "node:assert/strict";
import { splitLetters, fitsInto, countLetters } from "./letters.js";
import { loadDictionary, isWord, longestWord, randomLetters, LETTER_COUNT } from "./logic.js";

test("lj, nj i dž su jedno slovo", () => {
  assert.deepEqual(splitLetters("ljubav"), ["lj", "u", "b", "a", "v"]);
  assert.deepEqual(splitLetters("džep"), ["dž", "e", "p"]);
  assert.deepEqual(splitLetters("konj"), ["k", "o", "nj"]);
});

test("provera da li reč može da se složi", () => {
  const avail = countLetters(["k", "u", "ć", "a", "a"]);
  assert.equal(fitsInto(splitLetters("kuća"), avail), true);
  assert.equal(fitsInto(splitLetters("kuk"), avail), false);
});

test("mali rečnik: najduža reč", () => {
  loadDictionary(["kuća", "kuk", "ćuk", "kućica"]);
  assert.equal(isWord("kuća"), true);
  assert.equal(isWord("kuca"), false);
  assert.equal(longestWord(["k", "u", "ć", "a", "x"]), "kuća");
  assert.equal(longestWord(["x", "y"]), null);
});

test("pravi rečnik: generisana slova uvek imaju bar jednu dužu reč", () => {
  loadDictionary();
  assert.equal(isWord("kuća"), true);
  assert.equal(isWord("najlepši"), true);
  for (let i = 0; i < 10; i++) {
    const letters = randomLetters();
    assert.equal(letters.length, LETTER_COUNT);
    const best = longestWord(letters);
    assert.ok(best && splitLetters(best).length >= 8, `slova ${letters.join(",")} -> ${best}`);
  }
});
