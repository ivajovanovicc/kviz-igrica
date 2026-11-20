// Srpska latinica ima 30 slova; lj, nj i dž su jedno slovo (jedna pločica).
export const ALPHABET = [
  "a", "b", "c", "č", "ć", "d", "dž", "đ", "e", "f", "g", "h", "i", "j", "k",
  "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "š", "t", "u", "v", "z", "ž",
];

// Deli reč na slova, npr. "ljubav" -> ["lj", "u", "b", "a", "v"].
// Napomena: u retkim rečima (npr. "injekcija") "nj" su zapravo dva slova;
// takve reči i dalje mogu da se slože jer igrač bira pločice n + j.
export function splitLetters(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const two = word.slice(i, i + 2);
    if (two === "lj" || two === "nj" || two === "dž") {
      out.push(two);
      i++;
    } else {
      out.push(word[i]);
    }
  }
  return out;
}

export function countLetters(letters: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of letters) m.set(l, (m.get(l) ?? 0) + 1);
  return m;
}

// Da li reč (kao niz slova) može da se složi od ponuđenih slova
export function fitsInto(word: string[], available: Map<string, number>): boolean {
  const need = countLetters(word);
  for (const [l, n] of need) if ((available.get(l) ?? 0) < n) return false;
  return true;
}
