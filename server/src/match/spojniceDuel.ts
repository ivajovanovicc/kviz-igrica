import { POINTS_PER_PAIR, Puzzle } from "../games/spojnice/routes.js";

// Spojnice u dvoje, na smenu (kao u TV verziji):
// - igra ima dve polovine sa različitim temama
// - u prvoj polovini igrač A ide redom kroz leve pojmove i za svaki ima jedan pokušaj
// - parove koje je A promašio zatim redom pokušava igrač B
// - u drugoj polovini je obrnuto (B spaja, A pokušava promašene)
// - 2 poena po paru, za onoga ko ga je spojio

export const MOVE_SECONDS = 6;
export const REVEAL_PAUSE_MS = 3500;

type Phase = "main" | "steal" | "reveal";

export interface SpojniceDuelView {
  half: number; // 0 ili 1
  tema: string;
  left: string[];
  right: string[];
  solvedBy: (number | null)[]; // za svaki levi pojam: ko ga je spojio
  rightOwner: (number | null)[]; // za svaki desni pojam: ko ga je spojio
  answers: number[] | null; // tačni parovi, prikazuju se na kraju polovine
  current: number | null; // levi pojam koji je sada na redu
  actor: number;
  phase: Phase;
  moveSecondsLeft: number;
  points: [number, number];
  lastAction: string | null;
  finished: boolean;
}

interface Half {
  puzzle: Puzzle;
  main: number; // igrač koji spaja u ovoj polovini
  answerFor: number[];
  solvedBy: (number | null)[];
  tried: boolean[]; // da li je glavni igrač već pokušao ovaj pojam
}

export class SpojniceDuel {
  private halves: Half[];
  private halfIndex = 0;
  private phase: Phase = "main";
  private current: number | null = 0;
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
      tried: puzzle.set.parovi.map(() => false),
    }));
    this.startMove();
  }

  private get half() {
    return this.halves[this.halfIndex];
  }

  private get actor() {
    return this.phase === "steal" ? 1 - this.half.main : this.half.main;
  }

  private startMove() {
    clearTimeout(this.timer);
    this.moveEndsAt = Date.now() + MOVE_SECONDS * 1000;
    this.timer = setTimeout(() => {
      this.lastAction = `${this.names[this.actor]} nije stigao/la da izabere.`;
      this.resolve(false);
    }, MOVE_SECONDS * 1000);
  }

  // Sledeći pojam u trenutnoj fazi, ili prelazak u sledeću fazu
  private advance() {
    const h = this.half;
    const n = h.answerFor.length;
    const from = this.current === null ? 0 : this.current + 1;
    const eligible = (i: number) => (this.phase === "main" ? true : h.solvedBy[i] === null);
    for (let i = from; i < n; i++) {
      if (eligible(i)) {
        this.current = i;
        this.startMove();
        return;
      }
    }
    if (this.phase === "main" && h.solvedBy.some((s) => s === null)) {
      this.phase = "steal";
      this.current = null;
      this.advance();
      return;
    }
    this.endHalf();
  }

  private endHalf() {
    clearTimeout(this.timer);
    this.phase = "reveal";
    this.current = null;
    this.timer = setTimeout(() => {
      if (this.halfIndex === 0) {
        this.halfIndex = 1;
        this.phase = "main";
        this.current = null;
        this.lastAction = null;
        this.advance();
        this.onChange();
      } else {
        this.finished = true;
        this.onChange();
        this.onFinish(this.points);
      }
    }, this.revealPauseMs);
  }

  private resolve(correct: boolean) {
    const h = this.half;
    const i = this.current!;
    if (correct) {
      h.solvedBy[i] = this.actor;
      this.points[this.actor] += POINTS_PER_PAIR;
    }
    if (this.phase === "main") h.tried[i] = true;
    this.advance();
    this.onChange();
  }

  pick(player: number, right: number): string | null {
    if (this.finished || this.phase === "reveal" || this.current === null) return "Sačekaj.";
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
    return {
      half: this.halfIndex,
      tema: set.tema,
      left: set.parovi.map((p) => p[0]),
      right: order.map((k) => set.parovi[k][1]),
      solvedBy: [...h.solvedBy],
      rightOwner,
      answers: this.phase === "reveal" || this.finished ? [...h.answerFor] : null,
      current: this.current,
      actor: this.actor,
      phase: this.phase,
      moveSecondsLeft: Math.max(0, Math.ceil((this.moveEndsAt - Date.now()) / 1000)),
      points: [...this.points] as [number, number],
      lastAction: this.lastAction,
      finished: this.finished,
    };
  }
}
