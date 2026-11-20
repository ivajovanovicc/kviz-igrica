import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALPHABET, countLetters, fitsInto, splitLetters } from "./letters.js";

// Pravila Slagalice:
// - igrač dobija 12 slova i treba da složi što dužu reč
// - svako slovo može da se upotrebi najviše jednom
// - 2 poena po slovu (kao u TV verziji)

export const LETTER_COUNT = 12;
export const TIME_LIMIT_SECONDS = 60;
export const POINTS_PER_LETTER = 2;

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../data/slagalica/reci.txt");

interface Dictionary {
  set: Set<string>;
  entries: { word: string; letters: string[] }[];
  seedWords: string[]; // duže reči od kojih se prave slova, da uvek postoji dobra reč
  letterWeights: Map<string, number>;
}

let dictionary: Dictionary | null = null;

export function loadDictionary(words?: string[]): Dictionary {
  const list = words ?? fs.readFileSync(DATA_FILE, "utf8").split("\n").map((w) => w.trim()).filter(Boolean);
  const entries = list.map((word) => ({ word, letters: splitLetters(word) }));

  const letterWeights = new Map<string, number>(ALPHABET.map((l) => [l, 1]));
  for (const e of entries) for (const l of e.letters) letterWeights.set(l, (letterWeights.get(l) ?? 0) + 1);

  dictionary = {
    set: new Set(list),
    entries,
    seedWords: entries.filter((e) => e.letters.length >= 8 && e.letters.length <= 11).map((e) => e.word),
    letterWeights,
  };
  return dictionary;
}

function dict(): Dictionary {
  return dictionary ?? loadDictionary();
}

export function isWord(word: string): boolean {
  return dict().set.has(word);
}

function weightedLetter(rng: () => number): string {
  const weights = dict().letterWeights;
  let total = 0;
  for (const w of weights.values()) total += w;
  let r = rng() * total;
  for (const [l, w] of weights) {
    r -= w;
    if (r <= 0) return l;
  }
  return "a";
}

// Slova se prave od jedne nasumične duže reči + nasumičnih slova (češća slova češće ispadaju)
export function randomLetters(rng: () => number = Math.random): string[] {
  const d = dict();
  const seed = d.seedWords.length ? d.seedWords[Math.floor(rng() * d.seedWords.length)] : "";
  const letters = splitLetters(seed);
  while (letters.length < LETTER_COUNT) letters.push(weightedLetter(rng));
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

// Najduža reč iz rečnika koja može da se složi od datih slova
export function longestWord(letters: string[]): string | null {
  const available = countLetters(letters);
  let best: { word: string; letters: string[] } | null = null;
  for (const e of dict().entries) {
    if (best && e.letters.length <= best.letters.length) continue;
    if (e.letters.length > letters.length) continue;
    if (fitsInto(e.letters, available)) best = e;
  }
  return best?.word ?? null;
}
