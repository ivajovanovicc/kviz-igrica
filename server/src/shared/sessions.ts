import { randomUUID } from "node:crypto";

// Rezultat jedne igre jednog igrača (koristi se za partiju u dvoje)
export interface GameResult {
  points: number;
  detail?: Record<string, unknown>;
}

// Jednostavno čuvanje partija u memoriji servera, zajedničko za sve igre.
export interface BaseSession {
  startedAt: number;
  finished: boolean;
  onFinish?: (result: GameResult) => void;
}

const GRACE_MS = 2000; // tolerancija za kašnjenje mreže

export class SessionStore<T extends BaseSession> {
  private sessions = new Map<string, T>();

  constructor(private timeLimitSeconds: number) {
    setInterval(() => {
      const cutoff = Date.now() - 60 * 60 * 1000;
      for (const [id, s] of this.sessions) if (s.startedAt < cutoff) this.sessions.delete(id);
    }, 10 * 60 * 1000).unref();
  }

  create(session: T): string {
    const id = randomUUID();
    this.sessions.set(id, session);
    return id;
  }

  get(id: string): T | undefined {
    return this.sessions.get(id);
  }

  timeIsUp(session: T): boolean {
    return Date.now() - session.startedAt > this.timeLimitSeconds * 1000 + GRACE_MS;
  }

  // Završava igru i (samo jednom) javlja rezultat partiji u dvoje, ako postoji
  complete(session: T, result: GameResult) {
    if (session.finished && !session.onFinish) return;
    session.finished = true;
    const cb = session.onFinish;
    session.onFinish = undefined;
    cb?.(result);
  }
}

// Ono što svaki modul igre nudi partiji u dvoje
export interface GameModule<P = unknown> {
  generate(): P;
  createSession(puzzle: P, onFinish: (r: GameResult) => void): { gameId: string } & Record<string, unknown>;
  forceFinish(gameId: string): void;
  maxDurationSeconds: number;
}
