import { GameResult } from "../shared/sessions.js";

// Pravila partije u dvoje.
// Svaka igra se igra dva puta: prva runda je "igra" igrača 1 (koji je napravio partiju), druga igrača 2.
// Vlasnik runde ("moja igra") pobeđuje kad je izjednačeno i u igrama na smenu prvi igra.

export type GameId = "slagalica" | "moj-broj" | "spojnice" | "skocko" | "ko-zna-zna" | "asocijacije";

export const GAME_ORDER: GameId[] = [
  "slagalica",
  "slagalica",
  "moj-broj",
  "moj-broj",
  "skocko",
  "skocko",
  "ko-zna-zna",
  "ko-zna-zna",
  "spojnice",
  "spojnice",
  "asocijacije",
  "asocijacije",
];

// Vlasnik runde: prva od dve runde iste igre pripada igraču 0, druga igraču 1
export function roundOwner(roundIndex: number): number {
  const game = GAME_ORDER[roundIndex];
  return GAME_ORDER.indexOf(game) === roundIndex ? 0 : 1;
}

export const GAME_NAMES: Record<GameId, string> = {
  slagalica: "Slagalica",
  "moj-broj": "Moj broj",
  spojnice: "Spojnice",
  skocko: "Skočko",
  "ko-zna-zna": "Ko zna zna",
  asocijacije: "Asocijacije",
};

export const SLAGALICA_LONGER_BONUS = 6;
export const SLAGALICA_COMPUTER_BONUS = 3;
export const MOJ_BROJ_EXACT = 10;
export const MOJ_BROJ_CLOSER = 5;

export function scoreRound(game: GameId, results: [GameResult, GameResult], owner: number): [number, number] {
  if (game === "slagalica") {
    // 1 poen po slovu ispravne reči; duža reč +6 (iste dužine: vlasnik runde);
    // vlasnik runde +3 ako je našao reč dugačku kao najduža reč kompjutera
    const len = results.map((r) => Number(r.detail?.length ?? 0));
    const longest = Number(results[0].detail?.longestLength ?? results[1].detail?.longestLength ?? 0);
    const pts = [len[0], len[1]];
    if (len[0] > len[1]) pts[0] += SLAGALICA_LONGER_BONUS;
    else if (len[1] > len[0]) pts[1] += SLAGALICA_LONGER_BONUS;
    else if (len[owner] > 0) pts[owner] += SLAGALICA_LONGER_BONUS;
    if (longest > 0 && len[owner] >= longest) pts[owner] += SLAGALICA_COMPUTER_BONUS;
    return [pts[0], pts[1]];
  }
  if (game === "moj-broj") {
    // poene dobija samo bliži: tačan broj 10, inače 5; isto blizu: vlasnik runde
    const dist = results.map((r) => (r.detail?.distance ?? null) as number | null);
    let winner: number;
    if (dist[0] === null && dist[1] === null) return [0, 0];
    if (dist[1] === null || (dist[0] !== null && dist[0] < dist[1])) winner = 0;
    else if (dist[0] === null || dist[1] < dist[0]) winner = 1;
    else winner = owner;
    const pts: [number, number] = [0, 0];
    pts[winner] = dist[winner] === 0 ? MOJ_BROJ_EXACT : MOJ_BROJ_CLOSER;
    return pts;
  }
  return [results[0].points, results[1].points];
}
