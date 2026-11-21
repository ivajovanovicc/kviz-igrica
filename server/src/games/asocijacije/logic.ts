// Pravila Asocijacija (za jednog igrača):
// - 4 kolone (A-D) sa po 4 skrivena polja; igrač otvara polja i pogađa rešenja
// - rešena kolona: 2 poena + 1 za svako neotvoreno polje u toj koloni (kao u originalu)
// - konačno rešenje: 5 poena + bodovi za sve kolone koje još nisu rešene

export const TIME_LIMIT_SECONDS = 120;
export const COLUMN_BASE = 2;
export const FINAL_BASE = 5;

export interface Kolona {
  polja: string[];
  resenje: string;
  prihvata?: string[];
}

export interface Asocijacija {
  kolone: Kolona[];
  konacno: string;
  prihvata?: string[];
}

export function columnPoints(opened: boolean[]): number {
  return COLUMN_BASE + opened.filter((o) => !o).length;
}

export function finalPoints(opened: boolean[][], solved: boolean[]): number {
  let points = FINAL_BASE;
  solved.forEach((s, c) => {
    if (!s) points += columnPoints(opened[c]);
  });
  return points;
}
