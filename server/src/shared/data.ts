import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Čita JSON iz foldera server/data (to je za sada "baza" sadržaja za igre)
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");

export function readData<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, relativePath), "utf8")) as T;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}
