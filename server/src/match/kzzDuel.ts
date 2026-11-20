import { POINTS_CORRECT, POINTS_WRONG, Puzzle, SECONDS_PER_QUESTION } from "../games/ko-zna-zna/routes.js";

// Ko zna zna u dvoje, sinhronizovano:
// - oba igrača istovremeno vide isto pitanje
// - svako odgovara jednom; netačan odgovor -5, preskakanje 0
// - tačan odgovor donosi +10 samo onome ko je PRVI tačno odgovorio
// - pitanje traje dok oba ne odgovore ili ne istekne vreme; onda se svima pokaže tačan odgovor
// - posle kratke pauze oba igrača istovremeno dobijaju sledeće pitanje

export const REVEAL_MS = 2500;

interface Answer {
  option: number | null; // null = preskočeno
  delta: number;
}

export interface KzzDuelView {
  index: number;
  total: number;
  question: string;
  options: string[];
  phase: "question" | "reveal";
  secondsLeft: number;
  myAnswer: number | null | undefined; // undefined = još nije odgovorio
  opponentAnswered: boolean;
  correct: number | null; // samo u fazi prikaza
  opponentAnswer: number | null | undefined; // samo u fazi prikaza
  deltas: [number, number] | null; // poeni za ovo pitanje, samo u fazi prikaza
  points: [number, number];
  finished: boolean;
}

export class KzzDuel {
  private index = 0;
  private phase: "question" | "reveal" = "question";
  private answers: (Answer | undefined)[] = [undefined, undefined];
  private firstCorrectTaken = false;
  private endsAt = 0;
  private points: [number, number] = [0, 0];
  private finished = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private puzzle: Puzzle,
    private onChange: () => void,
    private onFinish: (points: [number, number]) => void,
    private secondsPerQuestion = SECONDS_PER_QUESTION,
    private revealMs = REVEAL_MS
  ) {
    this.startQuestion();
  }

  private startQuestion() {
    this.phase = "question";
    this.answers = [undefined, undefined];
    this.firstCorrectTaken = false;
    this.endsAt = Date.now() + this.secondsPerQuestion * 1000;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.reveal(), this.secondsPerQuestion * 1000);
  }

  private reveal() {
    if (this.phase !== "question") return;
    clearTimeout(this.timer);
    // ko nije odgovorio, računa se kao preskočeno
    this.answers = this.answers.map((a) => a ?? { option: null, delta: 0 });
    this.phase = "reveal";
    this.onChange();
    this.timer = setTimeout(() => {
      this.index++;
      if (this.index >= this.puzzle.length) {
        this.finished = true;
        this.onChange();
        this.onFinish(this.points);
      } else {
        this.startQuestion();
        this.onChange();
      }
    }, this.revealMs);
  }

  answer(player: number, question: number, option: unknown): string | null {
    if (this.finished || this.phase !== "question") return "Sačekaj sledeće pitanje.";
    if (question !== this.index) return "Pogrešno pitanje.";
    if (this.answers[player]) return "Već si odgovorio/la.";

    const q = this.puzzle[this.index];
    let a: Answer;
    if (Number.isInteger(option) && (option as number) >= 0 && (option as number) < q.options.length) {
      const correct = option === q.correct;
      const delta = correct ? (this.firstCorrectTaken ? 0 : POINTS_CORRECT) : POINTS_WRONG;
      if (correct) this.firstCorrectTaken = true;
      a = { option: option as number, delta };
    } else {
      a = { option: null, delta: 0 };
    }
    this.answers[player] = a;
    this.points[player] += a.delta;

    if (this.answers.every(Boolean)) this.reveal();
    else this.onChange();
    return null;
  }

  stop() {
    clearTimeout(this.timer);
    if (this.finished) return;
    this.finished = true;
    this.onChange();
    this.onFinish(this.points);
  }

  view(player: number): KzzDuelView {
    const q = this.puzzle[Math.min(this.index, this.puzzle.length - 1)];
    const revealed = this.phase === "reveal" || this.finished;
    const mine = this.answers[player];
    const theirs = this.answers[1 - player];
    return {
      index: Math.min(this.index, this.puzzle.length - 1),
      total: this.puzzle.length,
      question: q.question,
      options: q.options,
      phase: this.phase,
      secondsLeft: Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)),
      myAnswer: mine ? mine.option : undefined,
      opponentAnswered: !!theirs,
      correct: revealed ? q.correct : null,
      opponentAnswer: revealed && theirs ? theirs.option : undefined,
      deltas: revealed ? [this.answers[0]?.delta ?? 0, this.answers[1]?.delta ?? 0] : null,
      points: [...this.points] as [number, number],
      finished: this.finished,
    };
  }
}
