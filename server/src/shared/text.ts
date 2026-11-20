// Poređenje odgovora: ne zavisi od velikih/malih slova, razmaka ni kvačica (č = c, đ = dj...)
export function normalizeAnswer(s: string): string {
  return s
    .toLocaleLowerCase("sr-Latn")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z");
}

export function answerMatches(input: string, correct: string, alternatives: string[] = []): boolean {
  const n = normalizeAnswer(input);
  return n.length > 0 && [correct, ...alternatives].some((a) => normalizeAnswer(a) === n);
}
