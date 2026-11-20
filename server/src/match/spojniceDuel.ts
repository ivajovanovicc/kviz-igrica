import { POINTS_PER_PAIR, Puzzle } from "../games/spojnice/routes.js";

// Spojnice u dvoje, na smenu:
// - igra ima dve polovine sa različitim temama; u prvoj je "glavni" igrač A, u drugoj B
// - za svaki levi pojam redom: prvo pokušava glavni igrač
// - ako promaši (ili mu istekne vreme), isti pojam odmah pokušava protivnik
// - ako ni on ne pogodi, ide se na sledeći pojam, opet prvo glavni igrač
// - 2 poena po paru, za onoga ko ga je spojio

export const MOVE_SECONDS = 6;
export const REVEAL_PAUSE_MS = 3500;

type Phase = "play" | "reveal";

export interface SpojniceDuelView {
  half: number; // 0 ili 1
  tema: string;
  left: string[];
  right: string[];
  solvedBy: (number | null)[]; // za svaki levi pojam: ko ga je spojio
  missed: boolean[]; // levi pojmovi koje niko nije pogodio
  rightOwner: (number | null)[]; // za svaki desni pojam: ko ga je spojio
  answers: number[] | null; // tačni parovi, prikazuju se na kraju polovine
  current: number | null;
  actor: number;
  isSecondChance: boolean; // protivnik pokušava pojam koji je glavni igrač promašio
  phase: Phase;
  moveSecondsLeft: number;
  points: [number, number];
  lastAction: string | null;
  finished: boolean;
}

interface Half {
  puzzle: Puzzle;
  main: number;
  answerFor: number[];
  solvedBy: (number | null)[];
  missed: boolean[];
}

export class SpojniceDuel {
  private halves: Half[];
  private halfIndex = 0;
  private phase: Phase = "play";
  private current = 0;
  private secondChance = false;
  private moveEndsAt = 0;
  private points: [number, number] = [0, 0];
  private lastAction: string | null = null;
  private finished = false;
  private timer?: NodeJS.Timeout;

  constructor(
    puzzles: [Puzzle, Puzzle],
    firstPlayer: number,
    private names: string[],
    private onChange: () => void,
    private onFinish: (points: [number, number]) => void,
    private revealPauseMs = REVEAL_PAUSE_MS
  ) {
    this.halves = puzzles.map((puzzle, i) => ({
      puzzle,
      main: i === 0 ? firstPlayer : 1 - firstPlayer,
      answerFor: puzzle.set.parovi.map((_, k) => puzzle.order.indexOf(k)),
      solvedBy: puzzle.set.parovi.map(() => null),
      missed: puzzle.set.parovi.map(() => false),
    }));
    this.startMove();
  }

  private get half() {
    return this.halves[this.halfIndex];
  }

  private get actor() {
    return this.secondChance ? 1 - this.half.main : this.half.main;
  }

  private startMove() {
    clearTimeout(this.timer);
    this.moveEndsAt = Date.now() + MOVE_SECONDS * 1000;
    this.timer = setTimeout(() => {
      this.lastAction = `${this.names[this.actor]} nije stigao/la da izabere.`;
      this.resolve(false);
      this.onChange();
    }, MOVE_SECONDS * 1000);
  }

  private nextItem() {
    this.secondChance = false;
    this.current++;
    if (this.current >= this.half.answerFor.length) this.endHalf();
    else this.startMove();
  }

  private resolve(correct: boolean) {
    const h = this.half;
    if (correct) {
      h.solvedBy[this.current] = this.actor;
      this.points[this.actor] += POINTS_PER_PAIR;
      this.nextItem();
    } else if (!this.secondChance) {
      this.secondChance = true; // šansa za protivnika na istom pojmu
      this.startMove();
    } else {
      h.missed[this.current] = true;
      this.nextItem();
    }
  }

  private endHalf() {
    clearTimeout(this.timer);
    this.phase = "reveal";
    this.timer = setTimeout(() => {
      if (this.halfIndex === 0) {
        this.halfIndex = 1;
        this.phase = "play";
        this.current = 0;
        this.secondChance = false;
        this.lastAction = null;
        this.startMove();
        this.onChange();
      } else {
        this.finished = true;
        this.onChange();
        this.onFinish(this.points);
      }
    }, this.revealPauseMs);
  }

  pick(player: number, right: number): string | null {
    if (this.finished || this.phase !== "play") return "Sačekaj.";
    if (player !== this.actor) return "Nisi na potezu.";
    const h = this.half;
    if (!Number.isInteger(right) || right < 0 || right >= h.answerFor.length) return "Neispravan izbor.";
    if (h.answerFor.some((r, i) => r === right && h.solvedBy[i] !== null)) return "Taj pojam je već spojen.";
    const correct = h.answerFor[this.current] === right;
    const leftText = h.puzzle.set.parovi[this.current][0];
    this.lastAction = correct
      ? `${this.names[player]} je spojio/la „${leftText}“.`
      : `${this.names[player]} je promašio/la „${leftText}“.`;
    this.resolve(correct);
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

  view(): SpojniceDuelView {
    const h = this.half;
    const { set, order } = h.puzzle;
    const rightOwner: (number | null)[] = order.map(() => null);
    h.answerFor.forEach((r, i) => {
      if (h.solvedBy[i] !== null) rightOwner[r] = h.solvedBy[i];
    });
    const playing = this.phase === "play" && !this.finished;
    return {
      half: this.halfIndex,
      tema: set.tema,
      left: set.parovi.map((p) => p[0]),
      right: order.map((k) => set.parovi[k][1]),
      solvedBy: [...h.solvedBy],
      missed: [...h.missed],
      rightOwner,
      answers: playing ? null : [...h.answerFor],
      current: playing ? this.current : null,
      actor: this.actor,
      isSecondChance: this.secondChance,
      phase: this.phase,
      moveSecondsLeft: Math.max(0, Math.ceil((this.moveEndsAt - Date.now()) / 1000)),
      points: [...this.points] as [number, number],
      lastAction: this.lastAction,
      finished: this.finished,
    };
  }
}
