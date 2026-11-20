// Pravi spisak reči za Slagalicu iz otvorenog srpskog rečnika (dictionary-sr-latn).
// Pokretanje: node scripts/build-dictionary.mjs
// Rezultat: server/data/slagalica/reci.txt (jedna reč po redu, mala slova, latinica)
// Taj fajl slobodno možeš ručno da menjaš: da dodaš ili izbaciš reči.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dicPath = path.join(root, "node_modules/dictionary-sr-latn/index.dic");
const outPath = path.join(root, "server/data/slagalica/reci.txt");

const lines = fs.readFileSync(dicPath, "utf8").split("\n").slice(1);
const words = new Set();
for (const raw of lines) {
  const w = raw.trim().split("/")[0];
  // samo mala slova (bez vlastitih imena), samo srpska latinica, bar 2 slova
  // bez skraćenica: reč mora da ima samoglasnik (ili slogotvorno r, kao u „prst“)
  if (/^[abcčćdđefghijklmnoprsštuvzž]{2,}$/.test(w) && /[aeiour]/.test(w)) words.add(w);
}
const sorted = [...words].sort((a, b) => a.localeCompare(b, "sr-Latn"));
fs.writeFileSync(outPath, sorted.join("\n") + "\n");
console.log(`Upisano ${sorted.length} reči u ${path.relative(root, outPath)}`);
