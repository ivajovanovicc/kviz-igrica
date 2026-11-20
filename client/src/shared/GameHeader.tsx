export default function GameHeader({
  title,
  timeLeft,
  timeLimit,
  onExit,
}: {
  title: string;
  timeLeft: number;
  timeLimit: number;
  onExit?: () => void;
}) {
  return (
    <>
      <header className="game-header">
        {onExit ? <button className="link" onClick={onExit}>← Nazad</button> : <span className="header-spacer" />}
        <h2>{title}</h2>
        <span className={`timer ${timeLeft <= 10 ? "low" : ""}`}>{timeLeft}s</span>
      </header>
      <div className="timebar">
        <div style={{ width: `${(timeLeft / timeLimit) * 100}%` }} />
      </div>
    </>
  );
}
