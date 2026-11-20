import { GameResult } from "../shared/sessions.js";

// Kako se računaju poeni kad igraju dvoje.
// Slagalica i Moj broj se porede (kao u TV verziji), ostale igre: svako dobija svoje poene.

export type GameId = "slagalica" | "moj-broj" | "spojnice" | "skocko" | "ko-zna-zna" | "asocijacije";

// Redosled igara u partiji u dvoje (Asocijacije se igraju dva puta)
export const GAME_ORDER: GameId[] = [
  "slagalica",
  "moj-broj",
  "skocko",
  "ko-zna-zna",
  "spojnice",
  "asocijacije",
  "asocijacije",
];

export const GAME_NAMES: Record<GameId, string> = {
  slagalica: "Slagalica",
  "moj-broj": "Moj broj",
  spojnice: "Spojnice",
  skocko: "Skočko",
  "ko-zna-zna": "Ko zna zna",
  asocijacije: "Asocijacije",
};

export function scoreRound(game: GameId, results: [GameResult, GameResult]): [number, number] {
  if (game === "slagalica") {
    // Duža ispravna reč dobija 2 poena po slovu; ako su iste dužine, oba igrača dobijaju poene
    const [a, b] = results.map((r) => Number(r.detail?.length ?? 0));
    if (a === 0 && b === 0) return [0, 0];
    if (a === b) return [a * 2, b * 2];
    return a > b ? [a * 2, 0] : [0, b * 2];
  }
  if (game === "moj-broj") {
    // Tačan broj 10 poena; ako niko nije pogodio, bliži dobija 5 (isto blizu: oba)
    const [da, db] = results.map((r) => (r.detail?.distance ?? null) as number | null);
    if (da === 0 || db === 0) return [da === 0 ? 10 : 0, db === 0 ? 10 : 0];
    if (da === null && db === null) return [0, 0];
    if (db === null || (da !== null && da < db)) return [5, 0];
    if (da === null || db < da) return [0, 5];
    return [5, 5];
  }
  return [results[0].points, results[1].points];
}
