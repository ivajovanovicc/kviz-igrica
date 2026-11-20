import { randomUUID } from "node:crypto";

// Jednostavno čuvanje partija u memoriji servera, zajedničko za sve igre.
// Kasnije (za igru u dvoje) ovo može da se zameni bazom ili Redis-om.
export interface BaseSession {
  startedAt: number;
  finished: boolean;
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
}
