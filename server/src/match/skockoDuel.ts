import { CODE_LENGTH, Code, Feedback, MAX_ATTEMPTS, STEAL_POINTS, evaluate, isValidCode, pointsFor } from "../games/skocko/logic.js";

// Skočko u dvoje, na smenu (kao u originalu):
// - kombinaciju pogađa vlasnik runde (do 6 pokušaja), protivnik gleda njegove pokušaje
// - ako vlasnik ne pogodi (ili mu istekne vreme), protivnik ima jedan pokušaj
// - na kraju se oboma prikaže tačna kombinacija

export const OWNER_SECONDS = 90;
export const STEAL_SECONDS = 15;
export const REVEAL_MS = 3000;

type Phase = "owner" | "steal" | "reveal";

interface Row {
  guess: Code;
  feedback: Feedback;
}

export interface SkockoDuelView {
  rows: Row[];
  stealRow: Row | null;
  solution: Code | null;
  phase: Phase;
  owner: number;
  actor: number;
  secondsLeft: number;
  phaseSeconds: number;
  points: [number, number];
  solvedBy: number | null;
  finished: boolean;
}

export class SkockoDuel {
  private rows: Row[] = [];
  private stealRow: Row | null = null;
  private phase: Phase = "owner";
  private endsAt = 0;
  private points: [number, number] = [0, 0];
  private solvedBy: number | null = null;
  private finished = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private secret: Code,
    private owner: number,
    private onChange: () => void,
    private onFinish: (points: [number, number]) => void,
    private revealMs = REVEAL_MS
  ) {
    this.startPhase("owner", OWNER_SECONDS);
  }

  private startPhase(phase: Phase, seconds: number) {
    clearTimeout(this.timer);
    this.phase = phase;
    this.endsAt = Date.now() + seconds * 1000;
    this.timer = setTimeout(() => {
      if (this.phase === "owner") this.startPhase("steal", STEAL_SECONDS);
      else this.reveal();
      this.onChange();
    }, seconds * 1000);
  }

  private reveal() {
    clearTimeout(this.timer);
    this.phase = "reveal";
    this.endsAt = Date.now();
    this.timer = setTimeout(() => {
      this.finished = true;
      this.onChange();
      this.onFinish(this.points);
    }, this.revealMs);
  }

  private get actor() {
    return this.phase === "steal" ? 1 - this.owner : this.owner;
  }

  guess(player: number, code: unknown): string | null {
    if (this.finished || this.phase === "reveal") return "Igra je završena.";
    if (player !== this.actor) return "Nisi na potezu.";
    if (!isValidCode(code)) return "Neispravna kombinacija.";
    const row = { guess: code, feedback: evaluate(this.secret, code) };
    const solved = row.feedback.red === CODE_LENGTH;

    if (this.phase === "owner") {
      this.rows.push(row);
      if (solved) {
        this.points[player] += pointsFor(this.rows.length);
        this.solvedBy = player;
        this.reveal();
      } else if (this.rows.length >= MAX_ATTEMPTS) {
        this.startPhase("steal", STEAL_SECONDS);
      }
    } else {
      this.stealRow = row;
      if (solved) {
        this.points[player] += STEAL_POINTS;
        this.solvedBy = player;
      }
      this.reveal();
    }
    this.onChange();
    return null;
  }

  stop() {
    clearTimeout(this.timer);
    if (this.finished) return;
    this.finished = true;
    this.onChange();
    this.onFinish(this.points);
  }

  view(): SkockoDuelView {
    const revealed = this.phase === "reveal" || this.finished;
    return {
      rows: [...this.rows],
      stealRow: this.stealRow,
      solution: revealed ? [...this.secret] : null,
      phase: this.phase,
      owner: this.owner,
      actor: this.actor,
      secondsLeft: Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)),
      phaseSeconds: this.phase === "steal" ? STEAL_SECONDS : OWNER_SECONDS,
      points: [...this.points] as [number, number],
      solvedBy: this.solvedBy,
      finished: this.finished,
    };
  }
}
