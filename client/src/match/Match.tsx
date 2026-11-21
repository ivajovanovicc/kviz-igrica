import { useEffect, useRef, useState } from "react";
import { getSocket, playerToken, setActiveMatch } from "../shared/socket";
import Slagalica from "../games/slagalica/Slagalica";
import MojBroj from "../games/moj-broj/MojBroj";
import Skocko from "../games/skocko/Skocko";
import AsocijacijeDuel from "./AsocijacijeDuel";
import { asocStore, kzzStore, spojniceStore } from "./asocStore";
import KoZnaZnaDuel from "./KoZnaZnaDuel";
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

// Nazivi igara po redu u partiji (isti redosled kao na serveru)
const ROUND_LABELS = ["Slagalica", "Moj broj", "Skočko", "Ko zna zna", "Spojnice", "Asocijacije 1", "Asocijacije 2"];
const roundLabel = (i: number, game: GameId) => ROUND_LABELS[i] ?? NAMES[game];

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

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

const upper = (s: string) => s.toLocaleUpperCase("sr-Latn");

function detailText(game: GameId, d: Record<string, unknown> | null): string {
  if (!d) return "";
  if (game === "slagalica") {
    if (d.word) return `${upper(String(d.word))} (${d.length} slova)`;
    if (d.attempted) return `${upper(String(d.attempted))} ✗ nije u rečniku`;
    return "bez reči";
  }
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
    const onKzzState = (a: unknown) => {
      kzzStore.last = a;
    };
    const onSpojniceState = (a: any) => {
      spojniceStore.last = a;
      setTurnPlayer(a.finished || a.phase === "reveal" ? null : a.actor);
    };

    socket.on("match:state", onState);
    socket.on("game:start", onGameStart);
    socket.on("asoc:state", onAsocState);
    socket.on("spojnice:state", onSpojniceState);
    socket.on("kzz:state", onKzzState);
    socket.on("connect", enter); // i posle prekida veze se automatski vraća u partiju
    if (socket.connected) enter();

    return () => {
      socket.off("match:state", onState);
      socket.off("game:start", onGameStart);
      socket.off("asoc:state", onAsocState);
      socket.off("spojnice:state", onSpojniceState);
      socket.off("kzz:state", onKzzState);
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
      <div className={`score-player color-p${state.you} ${onTurn(state.you) ? "on-turn" : ""}`}>
        <span className="score-name">{me.name} (ti)</span>
        <span className="score-total">{me.total}</span>
      </div>
      <div className="score-middle">
        {state.round ? `${state.roundIndex + 1}/${state.gameCount}` : ""}
      </div>
      <div className={`score-player right color-p${1 - state.you} ${onTurn(1 - state.you) ? "on-turn" : ""}`}>
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
                <td>{roundLabel(i, h.game)}</td>
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

  // Slagalica: posle igre ista strana, ispod moje reči protivnikova reč pa reč kompjutera
  if (state.phase === "round-result" && state.round?.points && state.round.game === "slagalica") {
    const r = state.round;
    const d = (i: number) => (r.details?.[i] ?? {}) as Record<string, unknown>;
    const mine = d(state.you);
    const theirs = d(1 - state.you);
    const myLen = Number(mine.length ?? 0);
    const oppLen = Number(theirs.length ?? 0);
    const wordOf = (x: Record<string, unknown>) => upper(String(x.word || x.attempted || ""));
    const longest = String(mine.longest ?? theirs.longest ?? "");
    return (
      <div>
        <div className="screen match-top">{scoreboard}</div>
        <main className="screen slagalica-screen">
          <header className="game-header">
            <span className="header-spacer" />
            <h2>Slagalica</h2>
            <span className="header-spacer" />
          </header>
          <div className="timebar" />
          <div className={`word-box color-border-p${state.you}`}>
            <span className="word-text">{wordOf(mine) || "—"}</span>
            {r.points![state.you] > 0 && <span className="word-points">+{r.points![state.you]}</span>}
            {myLen > oppLen && <span className="stamp">duža reč</span>}
          </div>
          <p className={`word-check ${myLen > 0 ? "ok" : mine.attempted ? "bad" : ""}`}>
            {myLen > 0 ? "✓ Reč je pronađena" : mine.attempted ? "✗ Reč nije pronađena" : "\u00a0"}
          </p>

          <div className="compare">
            <span className="compare-label">{opp?.name}:</span>
            <div className={`word-box small color-border-p${1 - state.you}`}>
              <span className="word-text">{wordOf(theirs) || "—"}</span>
              {r.points![1 - state.you] > 0 && <span className="word-points">+{r.points![1 - state.you]}</span>}
              {oppLen > myLen && <span className="stamp">duža reč</span>}
              {!oppLen && theirs.attempted ? <span className="word-invalid">✗</span> : null}
            </div>
          </div>

          {longest && (
            <div className="compare delayed">
              <span className="compare-label">Kompjuter:</span>
              <div className="word-box small">
                <span className="word-text">{upper(longest)}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (state.phase === "round-result" && state.round?.points) {
    const r = state.round;
    const myPts = r.points![state.you];
    const oppPts = r.points![1 - state.you];
    return (
      <main className="screen">
        {scoreboard}
        <h2 className="title small">{roundLabel(state.roundIndex, r.game)}</h2>
        <div className="round-result">
          <div className={`color-p${state.you}`}>
            <span className="score-name">Ti</span>
            <span className="round-points">{signed(myPts)}</span>
            <small>{detailText(r.game, r.details?.[state.you] ?? null)}</small>
          </div>
          <div className={`color-p${1 - state.you}`}>
            <span className="score-name">{opp?.name}</span>
            <span className="round-points">{signed(oppPts)}</span>
            <small>{detailText(r.game, r.details?.[1 - state.you] ?? null)}</small>
          </div>
        </div>
        {r.game === "slagalica" && r.details?.[0]?.longest ? (
          <p className="best center">
            Najduža moguća reč: <strong>{upper(String(r.details[0].longest))}</strong>
          </p>
        ) : null}
      </main>
    );
  }

  // Igra u toku
  const game = current && current.roundIndex === state.roundIndex ? current : null;
  return (
    <div>
      <div className="screen match-top">
        {scoreboard}
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
        <KoZnaZnaDuel key={game.roundIndex} names={state.players.map((p) => p.name)} />
      ) : (
        <AsocijacijeDuel key={game.roundIndex} names={state.players.map((p) => p.name)} />
      )}
    </div>
  );
}
