import { useRef, useState, useEffect } from "react";
import GameCanvas from "./components/GameCanvas";
import Overlays from "./components/Overlays";
import SidePanel from "./components/SidePanel";
import TouchControls from "./components/TouchControls";
import { formatTime, type Dir } from "./game/engine";
import { useSnakeGame } from "./game/useSnakeGame";

/* ------------------------------- tiny icons ------------------------------- */

function SnakeLogo() {
  return (
    <svg viewBox="0 0 16 16" className="logo-snake h-8 w-8 sm:h-9 sm:w-9" shapeRendering="crispEdges" aria-hidden>
      <rect x="10" y="2" width="4" height="4" fill="#b8f651" />
      <rect x="12" y="3" width="1" height="1" fill="#0a1c11" />
      <rect x="6" y="2" width="4" height="4" fill="#7ce85f" />
      <rect x="2" y="2" width="4" height="4" fill="#37d97f" />
      <rect x="2" y="6" width="4" height="4" fill="#17a06f" />
      <rect x="2" y="10" width="4" height="4" fill="#128a63" />
      <rect x="6" y="10" width="3" height="4" fill="#0f6e50" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

function IconSound({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="m16 9 5 6M21 9l-5 6" />
      ) : (
        <>
          <path d="M16 9.5a4 4 0 0 1 0 5" />
          <path d="M18.5 7a8 8 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function IconLock({ locked }: { locked: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </>
      )}
    </svg>
  );
}

const FIREFLIES = [
  { left: "8%", top: "22%", size: 4, color: "#b8f651", delay: "0s", dur: "13s" },
  { left: "16%", top: "68%", size: 3, color: "#ffc65e", delay: "-3s", dur: "16s" },
  { left: "88%", top: "18%", size: 3, color: "#37d97f", delay: "-6s", dur: "12s" },
  { left: "80%", top: "74%", size: 4, color: "#b8f651", delay: "-9s", dur: "17s" },
  { left: "46%", top: "10%", size: 2, color: "#ffc65e", delay: "-4s", dur: "14s" },
  { left: "62%", top: "88%", size: 3, color: "#37d97f", delay: "-11s", dur: "15s" },
  { left: "30%", top: "42%", size: 2, color: "#7ce85f", delay: "-7s", dur: "18s" },
];

/* ---------------------------------- app ----------------------------------- */

export default function App() {
  const game = useSnakeGame();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);

  useEffect(() => {
    if (scrollLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [scrollLocked]);

  const {
    status,
    score,
    best,
    bests,
    isNewBest,
    apples,
    snakeLen,
    elapsed,
    muted,
    difficulty,
    difficultyId,
  } = game;

  const liveNewBest = status === "running" && score > best && score > 0;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < 24) return;
    const dir: Dir = ax > ay ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    game.steer(dir);
  };

  return (
    <div 
      className={`bg-stage relative flex min-h-dvh flex-col overflow-x-hidden font-body text-cream ${scrollLocked ? 'touch-none' : ''}`}
      onTouchStart={scrollLocked ? onTouchStart : undefined}
      onTouchEnd={scrollLocked ? onTouchEnd : undefined}
    >
      {/* ambient layers */}
      <div className="bg-gridlines pointer-events-none absolute inset-0" aria-hidden />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {FIREFLIES.map((f, i) => (
          <span
            key={i}
            className="firefly"
            style={{
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              color: f.color,
              background: f.color,
              animationDelay: `${f.delay}, ${f.delay}`,
              animationDuration: `${f.dur}, 3.4s`,
            }}
          />
        ))}
      </div>
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <div className="logo-wiggle flex items-center gap-3">
          <SnakeLogo />
          <div>
            <p className="font-pixel text-sm leading-none text-lime [text-shadow:2px_2px_0_#0a1c11] sm:text-base">
              SNAKE<span className="text-amber">·86</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-fern-dim">garden arcade cabinet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={game.togglePause}
            disabled={status !== "running" && status !== "paused"}
            aria-label={status === "paused" ? "Resume game" : "Pause game"}
            title={status === "paused" ? "Resume (Space)" : "Pause (Space)"}
            className="btn-ghost flex h-10 w-10 items-center justify-center border border-edge bg-panel text-fern disabled:cursor-not-allowed disabled:opacity-35"
          >
            {status === "paused" ? <IconPlay /> : <IconPause />}
          </button>
          <button
            type="button"
            onClick={game.toggleMute}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            title="Toggle sound (M)"
            className={`btn-ghost flex h-10 w-10 items-center justify-center border ${
              muted ? "border-coral/50 bg-coral/10 text-coral" : "border-edge bg-panel text-fern"
            }`}
          >
            <IconSound muted={muted} />
          </button>
          <button
            type="button"
            onClick={() => setScrollLocked(!scrollLocked)}
            aria-label={scrollLocked ? "Unlock swipe" : "Lock swipe"}
            title="Lock swipe controls"
            className={`btn-ghost flex h-10 w-10 items-center justify-center border lg:hidden ${
              scrollLocked ? "border-lime/50 bg-lime/10 text-lime" : "border-edge bg-panel text-fern"
            }`}
          >
            <IconLock locked={scrollLocked} />
          </button>
        </div>
      </header>

      {/* main */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-8 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:px-8 lg:pt-2">
        {/* board column */}
        <section className="flex w-full max-w-[540px] flex-col items-center gap-3">
          {/* HUD */}
          <div className="flex w-full items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-fern-dim">score</p>
              <p key={score} className="anim-pop mt-0.5 font-pixel text-2xl leading-none text-amber [text-shadow:2px_2px_0_#1c1204] sm:text-3xl">
                {score.toLocaleString()}
              </p>
            </div>

            <div className="pb-0.5">
              {liveNewBest || (status === "over" && isNewBest) ? (
                <span className="anim-bestflash inline-flex items-center gap-1.5 border border-amber/70 bg-amber/15 px-3 py-1.5 font-pixel text-[8px] text-amber">
                  ★ NEW BEST
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-edge bg-panel px-3 py-1.5 font-pixel text-[8px] text-lime">
                  {difficulty.label} <span className="text-amber">×{difficulty.multiplier}</span>
                </span>
              )}
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.24em] text-fern-dim">best</p>
              <p className="mt-0.5 font-pixel text-sm leading-none text-lime sm:text-base">{best.toLocaleString()}</p>
              <p className="mt-1.5 font-pixel text-[8px] leading-none text-fern-dim">{formatTime(elapsed)}</p>
            </div>
          </div>

          {/* bezel + board */}
          <div
            className="relative w-full touch-none select-none"
            style={{ aspectRatio: "1 / 1" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="bezel-glow relative h-full w-full overflow-hidden border border-edge bg-pine">
              <GameCanvas gameRef={game.gameRef} fxRef={game.fxRef} loopRef={game.loopRef} status={status} />
              <div className="scanlines absolute inset-0 z-10" aria-hidden />
              <Overlays
                status={status}
                score={score}
                best={best}
                isNewBest={isNewBest}
                apples={apples}
                snakeLen={snakeLen}
                elapsed={elapsed}
                difficultyId={difficultyId}
                onStart={game.start}
                onResume={game.resume}
                onRestart={game.start}
                onDifficulty={game.chooseDifficulty}
              />
              {status === "over" && (
                <div key={`hit-${score}`} className="bezel-hit pointer-events-none absolute inset-0 z-30" aria-hidden />
              )}
            </div>
          </div>

          {/* under-board hint (desktop) */}
          <div className="hidden w-full items-center justify-between px-1 text-[11px] text-fern-dim lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="kbd">↑↓←→</span> steer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="kbd">SPACE</span> pause
            </span>
            <span className="flex items-center gap-1.5">
              <span className="kbd">R</span> restart
            </span>
            <span className="flex items-center gap-1.5">
              <span className="kbd">M</span> sound
            </span>
          </div>

          {/* touch pad */}
          <TouchControls onSteer={game.steer} className="mt-4 w-full lg:hidden" />

          {/* panels under board on small screens */}
          <div className="mt-2 w-full lg:hidden">
            <SidePanel
              status={status}
              difficultyId={difficultyId}
              onDifficulty={game.chooseDifficulty}
              bests={bests}
              apples={apples}
              snakeLen={snakeLen}
              elapsed={elapsed}
            />
          </div>
        </section>

        {/* desktop rail */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <SidePanel
            status={status}
            difficultyId={difficultyId}
            onDifficulty={game.chooseDifficulty}
            bests={bests}
            apples={apples}
            snakeLen={snakeLen}
            elapsed={elapsed}
          />
        </aside>
      </main>

      {/* footer */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-edge/50 px-4 py-3 text-[11px] text-fern-dim sm:px-8">
        <span>© 1986–2026 SERPENT SYSTEMS · cabinet no. 006</span>
        <span>
          every 5th apple drops a <span className="text-amber">gold berry</span> · no serpents were harmed
        </span>
      </footer>

    </div>
  );
}
