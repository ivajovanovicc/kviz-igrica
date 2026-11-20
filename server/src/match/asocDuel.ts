import { Asocijacija, columnPoints, finalPoints } from "../games/asocijacije/logic.js";
import { answerMatches } from "../shared/text.js";

// Asocijacije u dvoje, na smenu (kao u TV verziji):
// - igrač na potezu prvo otvori jedno polje, pa sme da pogađa kolonu ili konačno rešenje (ili da preda potez)
// - tačan odgovor: igrač ostaje na potezu i može da pogađa dalje
// - netačan odgovor, predaja ili isteklo vreme poteza: potez prelazi na protivnika
// - tabla je zajednička, poene dobija onaj ko pogodi

export const TURN_SECONDS = 15;
export const TOTAL_SECONDS = 240;
export const REVEAL_PAUSE_MS = 3000;

type TurnPhase = "open" | "guess";

export interface DuelView {
  columns: { fields: (string | null)[]; solution: string | null; solvedBy: number | null }[];
  final: string | null;
  finalSolvedBy: number | null;
  turn: number;
  phase: TurnPhase;
  turnSecondsLeft: number;
  totalSecondsLeft: number;
  points: [number, number];
  lastAction: string | null;
  finished: boolean;
}

export class AsocDuel {
  private opened: boolean[][];
  private solvedBy: (number | null)[];
  private finalSolvedBy: number | null = null;
  private turn: number;
  private phase: TurnPhase = "open";
  private turnEndsAt = 0;
  private endsAt: number;
  private points: [number, number] = [0, 0];
  private lastAction: string | null = null;
  private finished = false;
  private turnTimer?: NodeJS.Timeout;
  private totalTimer?: NodeJS.Timeout;

  constructor(
    private board: Asocijacija,
    firstPlayer: number,
    private names: string[],
    private onChange: () => void,
    private onFinish: (points: [number, number]) => void,
    private revealPauseMs = REVEAL_PAUSE_MS
  ) {
    this.opened = board.kolone.map((k) => k.polja.map(() => false));
    this.solvedBy = board.kolone.map(() => null);
    this.turn = firstPlayer;
    this.endsAt = Date.now() + TOTAL_SECONDS * 1000;
    this.totalTimer = setTimeout(() => this.finish("Vreme je isteklo."), TOTAL_SECONDS * 1000);
    this.startTurn();
  }

  private allOpened() {
    return this.opened.every((col, c) => this.solvedBy[c] !== null || col.every(Boolean));
  }

  private startTurn() {
    clearTimeout(this.turnTimer);
    this.phase = this.allOpened() ? "guess" : "open";
    this.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
    this.turnTimer = setTimeout(() => {
      this.lastAction = `${this.names[this.turn]}: isteklo vreme za potez.`;
      this.nextPlayer();
    }, TURN_SECONDS * 1000);
  }

  private nextPlayer() {
    this.turn = 1 - this.turn;
    this.startTurn();
    this.onChange();
  }

  private finish(message: string) {
    if (this.finished) return;
    this.finished = true;
    this.lastAction = message;
    clearTimeout(this.turnTimer);
    clearTimeout(this.totalTimer);
    this.onChange();
    // kratka pauza da oba igrača vide otvorenu tablu pre rezultata
    setTimeout(() => this.onFinish(this.points), this.revealPauseMs);
  }

  open(player: number, column: number, field: number): string | null {
    if (this.finished || player !== this.turn) return "Nisi na potezu.";
    if (this.phase !== "open") return "Prvo pogađaj ili predaj potez.";
    if (this.opened[column]?.[field] !== false || this.solvedBy[column] !== null) return "To polje se ne može otvoriti.";
    this.opened[column][field] = true;
    this.phase = "guess";
    this.lastAction = null;
    this.onChange();
    return null;
  }

  guess(player: number, target: number | "final", answer: string): string | null {
    if (this.finished || player !== this.turn) return "Nisi na potezu.";
    if (this.phase !== "guess") return "Prvo otvori jedno polje.";
    if (typeof answer !== "string" || !answer.trim()) return "Nema odgovora.";
    const name = this.names[player];

    if (target === "final") {
      if (answerMatches(answer, this.board.konacno, this.board.prihvata)) {
        this.points[player] += finalPoints(this.opened, this.solvedBy.map((s) => s !== null));
        this.finalSolvedBy = player;
        this.finish(`${name} je pogodio/la konačno rešenje!`);
        return null;
      }
    } else {
      const kolona = this.board.kolone[target];
      if (!kolona || this.solvedBy[target] !== null) return "Neispravna kolona.";
      if (answerMatches(answer, kolona.resenje, kolona.prihvata)) {
        this.points[player] += columnPoints(this.opened[target]);
        this.solvedBy[target] = player;
        this.lastAction = `${name} je pogodio/la kolonu ${"ABCD"[target]}.`;
        // ostaje na potezu, sa novim vremenom
        this.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
        clearTimeout(this.turnTimer);
        this.turnTimer = setTimeout(() => this.pass(player, true), TURN_SECONDS * 1000);
        this.onChange();
        return null;
      }
    }
    this.lastAction = `${name}: „${answer.trim().slice(0, 30)}“ nije tačno.`;
    this.nextPlayer();
    return null;
  }

  pass(player: number, timedOut = false): string | null {
    if (this.finished || player !== this.turn) return "Nisi na potezu.";
    if (this.phase !== "guess" && !timedOut) return "Prvo otvori jedno polje.";
    this.lastAction = `${this.names[player]} ${timedOut ? "nije stigao/la da pogađa" : "predaje potez"}.`;
    this.nextPlayer();
    return null;
  }

  // Ako igrač napusti partiju, igra se završava sa trenutnim poenima
  stop() {
    this.finish("Igra je prekinuta.");
  }

  view(): DuelView {
    const reveal = this.finished;
    return {
      columns: this.board.kolone.map((k, c) => ({
        fields: k.polja.map((p, f) => (reveal || this.opened[c][f] || this.solvedBy[c] !== null ? p : null)),
        solution: reveal || this.solvedBy[c] !== null ? k.resenje : null,
        solvedBy: this.solvedBy[c],
      })),
      final: reveal ? this.board.konacno : null,
      finalSolvedBy: this.finalSolvedBy,
      turn: this.turn,
      phase: this.phase,
      turnSecondsLeft: Math.max(0, Math.ceil((this.turnEndsAt - Date.now()) / 1000)),
      totalSecondsLeft: Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000)),
      points: [...this.points] as [number, number],
      lastAction: this.lastAction,
      finished: this.finished,
    };
  }
}
