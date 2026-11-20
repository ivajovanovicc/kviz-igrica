import { useEffect, useRef, useState } from "react";
import { getSocket, playerToken, setActiveMatch } from "../shared/socket";
import Slagalica from "../games/slagalica/Slagalica";
import MojBroj from "../games/moj-broj/MojBroj";
import Skocko from "../games/skocko/Skocko";
import KoZnaZna from "../games/ko-zna-zna/KoZnaZna";
import AsocijacijeDuel from "./AsocijacijeDuel";
import { asocStore, spojniceStore } from "./asocStore";
import SpojniceDuel from "./SpojniceDuel";

type GameId = "slagalica" | "moj-broj" | "spojnice" | "skocko" | "ko-zna-zna" | "asocijacije";

const NAMES: Record<GameId, string> = {
  slagalica: "Slagalica",
  "moj-broj": "Moj broj",
  spojnice: "Spojnice",
  skocko: "Skočko",
  "ko-zna-zna": "Ko zna zna",
  asocijacije: "Asocijacije",
};

interface MatchState {
  code: string;
  phase: "waiting" | "starting" | "playing" | "round-result" | "finished";
  you: number;
  players: { name: string; total: number; connected: boolean }[];
  roundIndex: number;
  gameCount: number;
  round: {
    game: GameId;
    done: boolean[];
    points: [number, number] | null;
    details: (Record<string, unknown> | null)[] | null;
  } | null;
  history: { game: GameId; points: [number, number] }[];
}

interface GameStart {
  roundIndex: number;
  game: GameId;
  config: any;
}

const upper = (s: string) => s.toLocaleUpperCase("sr-Latn");

function detailText(game: GameId, d: Record<string, unknown> | null): string {
  if (!d) return "";
  if (game === "slagalica") return d.word ? `${upper(String(d.word))} (${d.length} slova)` : "bez reči";
  if (game === "moj-broj") return d.value === null || d.value === undefined ? "bez rezultata" : `${d.value} (razlika ${d.distance})`;
  if (game === "skocko") return d.attempts ? `pogođeno iz ${d.attempts}. pokušaja` : "nije pogođeno";
  return "";
}

export default function Match({ mode, code, name, onExit }: { mode: "create" | "join"; code?: string; name: string; onExit: () => void }) {
  const [state, setState] = useState<MatchState | null>(null);
  const [current, setCurrent] = useState<GameStart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [turnPlayer, setTurnPlayer] = useState<number | null>(null); // ko je na potezu u igrama na smenu
  const codeRef = useRef<string | undefined>(code);
  const creatingRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    const token = playerToken();

    const enter = () => {
      if (mode === "create" && !codeRef.current) {
        if (creatingRef.current) return; // partija se već pravi
        creatingRef.current = true;
        socket.emit("match:create", { name, token }, (r: { code: string }) => {
          codeRef.current = r.code;
          window.history.replaceState(null, "", `?p=${r.code}`);
        });
      } else {
        socket.emit("match:join", { code: codeRef.current, name, token }, (r: { error?: string }) => {
          if (r.error) {
            setActiveMatch(null);
            setError(r.error);
          }
        });
      }
    };

    const onState = (s: MatchState) => {
      setState(s);
      setActiveMatch(s.phase === "finished" ? null : s.code);
    };
    const onGameStart = (g: GameStart) => {
      setCurrent(g);
      setTurnPlayer(null);
    };
    const onAsocState = (a: any) => {
      asocStore.last = a;
      setTurnPlayer(a.finished ? null : a.turn);
    };
    const onSpojniceState = (a: any) => {
      spojniceStore.last = a;
      setTurnPlayer(a.finished || a.phase === "reveal" ? null : a.actor);
    };

    socket.on("match:state", onState);
    socket.on("game:start", onGameStart);
    socket.on("asoc:state", onAsocState);
    socket.on("spojnice:state", onSpojniceState);
    socket.on("connect", enter); // i posle prekida veze se automatski vraća u partiju
    if (socket.connected) enter();

    return () => {
      socket.off("match:state", onState);
      socket.off("game:start", onGameStart);
      socket.off("asoc:state", onAsocState);
      socket.off("spojnice:state", onSpojniceState);
      socket.off("connect", enter);
    };
  }, [mode, code, name]);

  const leave = () => {
    setActiveMatch(null);
    window.history.replaceState(null, "", window.location.pathname);
    onExit();
  };

  if (error) {
    return (
      <main className="screen">
        <p className="error">{error}</p>
        <button className="action" onClick={leave}>Na početak</button>
      </main>
    );
  }
  if (!state) return <main className="screen">Povezivanje…</main>;

  const me = state.players[state.you];
  const onTurn = (i: number) => state.phase === "playing" && turnPlayer === i;
  const opp = state.players[1 - state.you];

  const scoreboard = (
    <div className="scoreboard">
      <div className={`score-player ${onTurn(state.you) ? "on-turn" : ""}`}>
        <span className="score-name">{me.name} (ti)</span>
        <span className="score-total">{me.total}</span>
      </div>
      <div className="score-middle">
        {state.round ? `${state.roundIndex + 1}/${state.gameCount}` : ""}
      </div>
      <div className={`score-player right ${onTurn(1 - state.you) ? "on-turn" : ""}`}>
        <span className="score-name">
          {opp ? opp.name : "…"} {opp && !opp.connected && <em className="offline">(nije povezan)</em>}
        </span>
        <span className="score-total">{opp ? opp.total : 0}</span>
      </div>
    </div>
  );

  if (state.phase === "waiting") {
    const link = `${window.location.origin}${window.location.pathname}?p=${state.code}`;
    return (
      <main className="screen">
        <h2 className="title small">Igra u dvoje</h2>
        <p className="subtitle">Pošalji ovaj link prijatelju. Partija počinje čim uđe.</p>
        <div className="share-link">{link}</div>
        <button
          className="action wide"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: "Kviz igrica", url: link });
              else {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }
            } catch {
              /* korisnik je odustao od deljenja */
            }
          }}
        >
          {copied ? "Kopirano!" : "Podeli link"}
        </button>
        <p className="waiting-note">Čeka se protivnik…</p>
        <button className="link give-up" onClick={leave}>Odustani</button>
      </main>
    );
  }

  if (state.phase === "starting") {
    return (
      <main className="screen">
        {scoreboard}
        <p className="result-text center">{opp?.name} je tu! Igra počinje…</p>
      </main>
    );
  }

  if (state.phase === "finished") {
    const won = me.total > (opp?.total ?? 0);
    const tie = me.total === (opp?.total ?? 0);
    return (
      <main className="screen">
        {scoreboard}
        <h2 className="title small">{tie ? "Nerešeno!" : won ? "Pobeda!" : "Poraz"}</h2>
        <table className="history">
          <thead>
            <tr>
              <td />
              <td>Ti</td>
              <td>{opp?.name}</td>
            </tr>
          </thead>
          <tbody>
            {state.history.map((h, i) => (
              <tr key={i}>
                <td>{NAMES[h.game]}</td>
                <td>{h.points[state.you]}</td>
                <td>{h.points[1 - state.you]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="action wide" onClick={leave}>Na početak</button>
      </main>
    );
  }

  if (state.phase === "round-result" && state.round?.points) {
    const r = state.round;
    const myPts = r.points![state.you];
    const oppPts = r.points![1 - state.you];
    return (
      <main className="screen">
        {scoreboard}
        <h2 className="title small">{NAMES[r.game]}</h2>
        <div className="round-result">
          <div>
            <span className="score-name">Ti</span>
            <span className="round-points">+{myPts}</span>
            <small>{detailText(r.game, r.details?.[state.you] ?? null)}</small>
          </div>
          <div>
            <span className="score-name">{opp?.name}</span>
            <span className="round-points">+{oppPts}</span>
            <small>{detailText(r.game, r.details?.[1 - state.you] ?? null)}</small>
          </div>
        </div>
        <p className="waiting-note">
          {state.roundIndex + 1 < state.gameCount ? "Sledeća igra uskoro…" : "Konačan rezultat uskoro…"}
        </p>
      </main>
    );
  }

  // Igra u toku
  const game = current && current.roundIndex === state.roundIndex ? current : null;
  const oppDone = state.round?.done[1 - state.you];
  return (
    <div>
      <div className="screen match-top">
        {scoreboard}
        {oppDone && <p className="opp-done">{opp?.name} je završio/la ovu igru.</p>}
      </div>
      {!game ? (
        <main className="screen">Učitavanje igre…</main>
      ) : game.game === "slagalica" ? (
        <Slagalica key={game.roundIndex} preset={game.config} />
      ) : game.game === "moj-broj" ? (
        <MojBroj key={game.roundIndex} preset={game.config} />
      ) : game.game === "spojnice" ? (
        <SpojniceDuel key={game.roundIndex} names={state.players.map((p) => p.name)} />
      ) : game.game === "skocko" ? (
        <Skocko key={game.roundIndex} preset={game.config} />
      ) : game.game === "ko-zna-zna" ? (
        <KoZnaZna key={game.roundIndex} preset={game.config} />
      ) : (
        <AsocijacijeDuel key={game.roundIndex} names={state.players.map((p) => p.name)} />
      )}
    </div>
  );
}
