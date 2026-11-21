// Pravila Skočka:
// - 6 simbola (0-5), tajna kombinacija od 4 simbola, simboli mogu da se ponavljaju
// - igrač ima 6 pokušaja
// - posle svakog pokušaja dobija: crvene = pravi simbol na pravom mestu,
//   žute = pravi simbol na pogrešnom mestu

export const SYMBOL_COUNT = 6;
export const CODE_LENGTH = 4;
export const MAX_ATTEMPTS = 6;
export const TIME_LIMIT_SECONDS = 60;

export type Code = number[];

export interface Feedback {
  red: number;
  yellow: number;
}

export function randomCode(rng: () => number = Math.random): Code {
  return Array.from({ length: CODE_LENGTH }, () => Math.floor(rng() * SYMBOL_COUNT));
}

export function isValidCode(value: unknown): value is Code {
  return (
    Array.isArray(value) &&
    value.length === CODE_LENGTH &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v < SYMBOL_COUNT)
  );
}

export function evaluate(secret: Code, guess: Code): Feedback {
  let red = 0;
  const secretRest: number[] = new Array(SYMBOL_COUNT).fill(0);
  const guessRest: number[] = new Array(SYMBOL_COUNT).fill(0);

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      red++;
    } else {
      secretRest[secret[i]]++;
      guessRest[guess[i]]++;
    }
  }

  let yellow = 0;
  for (let s = 0; s < SYMBOL_COUNT; s++) {
    yellow += Math.min(secretRest[s], guessRest[s]);
  }
  return { red, yellow };
}

// Bodovi: pogodak u 1. ili 2. pokušaju 20, u 3. ili 4. 15, u 5. ili 6. 10
export function pointsFor(attemptNumber: number): number {
  if (attemptNumber <= 2) return 20;
  if (attemptNumber <= 4) return 15;
  if (attemptNumber <= 6) return 10;
  return 0;
}

// Ako vlasnik runde ne pogodi, protivnik ima jedan pokušaj
export const STEAL_POINTS = 5;
