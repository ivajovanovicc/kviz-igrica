import { Server, Socket } from "socket.io";
import { GameModule, GameResult } from "../shared/sessions.js";
import { slagalicaModule } from "../games/slagalica/routes.js";
import { mojBrojModule } from "../games/moj-broj/routes.js";
import { spojniceModule } from "../games/spojnice/routes.js";
import { skockoModule } from "../games/skocko/routes.js";
import { koZnaZnaModule } from "../games/ko-zna-zna/routes.js";
import { asocijacijeModule } from "../games/asocijacije/routes.js";
import { GAME_ORDER, GameId, scoreRound } from "./rules.js";
import { AsocDuel } from "./asocDuel.js";
import { SpojniceDuel } from "./spojniceDuel.js";
import { KzzDuel } from "./kzzDuel.js";
import { generate as generateSpojnice } from "../games/spojnice/routes.js";

// Partija u dvoje: dva igrača igraju istih šest igara, istim redom, sa istim zadacima.

const MODULES: Record<GameId, GameModule<any>> = {
  slagalica: slagalicaModule,
  "moj-broj": mojBrojModule,
  spojnice: spojniceModule,
  skocko: skockoModule,
  "ko-zna-zna": koZnaZnaModule,
  asocijacije: asocijacijeModule,
};

const START_DELAY_MS = 2500; // pauza pre prve igre
const RESULT_PAUSE_MS = 7000; // koliko dugo se prikazuje rezultat igre
const WATCHDOG_EXTRA_MS = 8000; // rezerva posle isteka vremena igre
const MATCH_TTL_MS = 2 * 60 * 60 * 1000;

interface Player {
  token: string;
  name: string;
  socketId: string | null;
  total: number;
}

interface Round {
  game: GameId;
  gameIds: string[];
  configs: Record<string, unknown>[];
  results: (GameResult | null)[];
  points: [number, number] | null;
  watchdog?: NodeJS.Timeout;
  // Igre koje server vodi uživo za oba igrača (na smenu ili sinhronizovano)
  live?: { event: string; view: (player: number) => object; stop: () => void };
  duel?: AsocDuel; // Asocijacije: na smenu
  spojDuel?: SpojniceDuel; // Spojnice: na smenu
  kzzDuel?: KzzDuel; // Ko zna zna: sinhronizovano
}

type Phase = "waiting" | "starting" | "playing" | "round-result" | "finished";

interface Match {
  code: string;
  players: Player[];
  phase: Phase;
  rounds: Round[];
  createdAt: number;
  firstAsocStarter?: number;
}

const matches = new Map<string, Match>();

function newCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (matches.has(code));
  return code;
}

function cleanName(name: unknown, fallback: string): string {
  const n = typeof name === "string" ? name.trim().slice(0, 20) : "";
  return n || fallback;
}

export function setupMatches(io: Server) {
  function stateFor(match: Match, playerIndex: number) {
    const round = match.rounds[match.rounds.length - 1];
    return {
      code: match.code,
      phase: match.phase,
      you: playerIndex,
      players: match.players.map((p) => ({ name: p.name, total: p.total, connected: p.socketId !== null })),
      roundIndex: match.rounds.length - 1,
      gameCount: GAME_ORDER.length,
      round: round
        ? {
            game: round.game,
            done: round.results.map((r) => r !== null),
            points: round.points,
            details: round.points ? round.results.map((r) => r?.detail ?? null) : null,
          }
        : null,
      history: match.rounds.filter((r) => r.points).map((r) => ({ game: r.game, points: r.points })),
    };
  }

  function broadcast(match: Match) {
    match.players.forEach((p, i) => {
      if (p.socketId) io.to(p.socketId).emit("match:state", stateFor(match, i));
    });
  }

  function sendGameStart(match: Match, playerIndex: number) {
    const round = match.rounds[match.rounds.length - 1];
    const p = match.players[playerIndex];
    if (!round || !p.socketId || match.phase !== "playing" || round.results[playerIndex]) return;
    io.to(p.socketId).emit("game:start", {
      roundIndex: match.rounds.length - 1,
      game: round.game,
      config: round.live ? { duel: true } : round.configs[playerIndex],
    });
    if (round.live) io.to(p.socketId).emit(round.live.event, { ...round.live.view(playerIndex), you: playerIndex });
  }

  function emitLive(match: Match, round: Round) {
    match.players.forEach((p, i) => {
      if (p.socketId && round.live) io.to(p.socketId).emit(round.live.event, { ...round.live.view(i), you: i });
    });
  }

  const finishBoth = (match: Match, round: Round) => (points: [number, number]) =>
    points.forEach((pts, i) => onResult(match, round, i, { points: pts }));

  // Ko je na zaostatku, počinje (kod nerešenog: igrač koji je napravio partiju)
  const behind = (match: Match) => (match.players[1].total < match.players[0].total ? 1 : 0);

  function startLiveGame(match: Match, round: Round) {
    const names = match.players.map((p) => p.name);
    const onChange = () => emitLive(match, round);
    if (round.game === "asocijacije") {
      // prvu Asocijaciju počinje igrač koji zaostaje, drugu onaj drugi
      let first: number;
      if (match.firstAsocStarter === undefined) {
        first = behind(match);
        match.firstAsocStarter = first;
      } else {
        first = 1 - match.firstAsocStarter;
      }
      const duel = new AsocDuel(asocijacijeModule.generate(), first, names, onChange, finishBoth(match, round));
      round.duel = duel;
      round.live = { event: "asoc:state", view: () => duel.view(), stop: () => duel.stop() };
    } else if (round.game === "spojnice") {
      const p1 = generateSpojnice();
      const p2 = generateSpojnice(p1.set.tema);
      const duel = new SpojniceDuel([p1, p2], behind(match), names, onChange, finishBoth(match, round));
      round.spojDuel = duel;
      round.live = { event: "spojnice:state", view: () => duel.view(), stop: () => duel.stop() };
    } else {
      const duel = new KzzDuel(koZnaZnaModule.generate(), onChange, finishBoth(match, round));
      round.kzzDuel = duel;
      round.live = { event: "kzz:state", view: (p) => duel.view(p), stop: () => duel.stop() };
    }
  }

  function startRound(match: Match) {
    const game = GAME_ORDER[match.rounds.length];
    const mod = MODULES[game];
    const round: Round = { game, gameIds: [], configs: [], results: [null, null], points: null };
    match.rounds.push(round);

    if (game === "asocijacije" || game === "spojnice" || game === "ko-zna-zna") {
      match.phase = "playing";
      startLiveGame(match, round);
      broadcast(match);
      match.players.forEach((_, i) => sendGameStart(match, i));
      return;
    }

    const puzzle = mod.generate();

    match.players.forEach((_, i) => {
      const config = mod.createSession(puzzle, (result) => onResult(match, round, i, result));
      round.gameIds.push(config.gameId);
      round.configs.push(config);
    });

    // Ako neko ne završi (npr. zatvori stranicu), igra se sama završava posle isteka vremena
    round.watchdog = setTimeout(() => {
      round.gameIds.forEach((id) => mod.forceFinish(id));
    }, mod.maxDurationSeconds * 1000 + WATCHDOG_EXTRA_MS);

    match.phase = "playing";
    broadcast(match);
    match.players.forEach((_, i) => sendGameStart(match, i));
  }

  function onResult(match: Match, round: Round, playerIndex: number, result: GameResult) {
    round.results[playerIndex] = result;
    if (round.results.some((r) => r === null)) {
      broadcast(match); // protivnik vidi da je ovaj igrač završio
      return;
    }
    clearTimeout(round.watchdog);
    round.points = scoreRound(round.game, round.results as [GameResult, GameResult]);
    match.players.forEach((p, i) => (p.total += round.points![i]));
    match.phase = "round-result";
    broadcast(match);

    setTimeout(() => {
      if (match.rounds.length >= GAME_ORDER.length) {
        match.phase = "finished";
        broadcast(match);
      } else {
        startRound(match);
      }
    }, RESULT_PAUSE_MS);
  }

  function attach(socket: Socket, match: Match, playerIndex: number) {
    match.players[playerIndex].socketId = socket.id;
    socket.data.matchCode = match.code;
    socket.data.playerIndex = playerIndex;
  }

  io.on("connection", (socket) => {
    socket.on("match:create", ({ name, token } = {}, cb?: (r: unknown) => void) => {
      if (typeof token !== "string" || typeof cb !== "function") return;
      const match: Match = {
        code: newCode(),
        players: [{ token, name: cleanName(name, "Igrač 1"), socketId: null, total: 0 }],
        phase: "waiting",
        rounds: [],
        createdAt: Date.now(),
      };
      matches.set(match.code, match);
      attach(socket, match, 0);
      cb({ code: match.code });
      broadcast(match);
    });

    socket.on("match:join", ({ code, name, token } = {}, cb?: (r: unknown) => void) => {
      if (typeof token !== "string" || typeof cb !== "function") return;
      const match = typeof code === "string" ? matches.get(code.toUpperCase()) : undefined;
      if (!match) return cb({ error: "Partija ne postoji ili je istekla." });

      // Povratak igrača koji je već u partiji (npr. osvežio stranicu)
      const existing = match.players.findIndex((p) => p.token === token);
      if (existing !== -1) {
        attach(socket, match, existing);
        cb({ code: match.code });
        broadcast(match);
        sendGameStart(match, existing);
        return;
      }

      if (match.players.length >= 2) return cb({ error: "Partija je već puna." });

      match.players.push({ token, name: cleanName(name, "Igrač 2"), socketId: null, total: 0 });
      attach(socket, match, 1);
      cb({ code: match.code });
      match.phase = "starting";
      broadcast(match);
      setTimeout(() => startRound(match), START_DELAY_MS);
    });

    // Potezi u Asocijacijama na smenu
    const duelAction = (fn: (duel: AsocDuel, player: number) => string | null) => (cb?: (r: unknown) => void) => {
      const match = matches.get(socket.data.matchCode);
      const round = match?.rounds[match.rounds.length - 1];
      const error = round?.duel ? fn(round.duel, socket.data.playerIndex) : "Igra nije u toku.";
      if (typeof cb === "function") cb({ error });
    };
    socket.on("asoc:open", ({ column, field } = {}, cb) =>
      duelAction((d, p) => d.open(p, column, field))(cb)
    );
    socket.on("asoc:guess", ({ target, answer } = {}, cb) =>
      duelAction((d, p) => d.guess(p, target, answer))(cb)
    );
    socket.on("asoc:pass", (_ = {}, cb) => duelAction((d, p) => d.pass(p))(cb));
    socket.on("kzz:answer", ({ question, option } = {}, cb) => {
      const match = matches.get(socket.data.matchCode);
      const round = match?.rounds[match.rounds.length - 1];
      const error = round?.kzzDuel ? round.kzzDuel.answer(socket.data.playerIndex, question, option) : "Igra nije u toku.";
      if (typeof cb === "function") cb({ error });
    });
    socket.on("spojnice:pick", ({ right } = {}, cb) => {
      const match = matches.get(socket.data.matchCode);
      const round = match?.rounds[match.rounds.length - 1];
      const error = round?.spojDuel ? round.spojDuel.pick(socket.data.playerIndex, right) : "Igra nije u toku.";
      if (typeof cb === "function") cb({ error });
    });

    socket.on("disconnect", () => {
      const match = matches.get(socket.data.matchCode);
      if (!match) return;
      const p = match.players[socket.data.playerIndex];
      if (p && p.socketId === socket.id) {
        p.socketId = null;
        broadcast(match);
      }
    });
  });

  // Brisanje starih partija
  setInterval(() => {
    const cutoff = Date.now() - MATCH_TTL_MS;
    for (const [code, m] of matches) if (m.createdAt < cutoff) matches.delete(code);
  }, 10 * 60 * 1000).unref();
}
