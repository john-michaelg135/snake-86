import { DIFFICULTIES, formatTime, type DifficultyId, type GameStatus } from "../game/engine";

/* ------------------------------ shared picker ------------------------------ */

export function DifficultyIcon({ id, className = "h-4 w-4" }: { id: DifficultyId; className?: string }) {
  if (id === "chill") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
        <path d="M12 3c4 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6.5 6-11Z" />
        <path d="M12 21v-6" />
      </svg>
    );
  }
  if (id === "turbo") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <circle cx="12" cy="14" r="7" />
      <path d="M12 7c0-2 1.5-3.5 3.5-4M12 7c0-1.5-.8-2.6-2-3.2" />
    </svg>
  );
}

export function DifficultyPicker({
  value,
  onChange,
  disabledReason,
}: {
  value: DifficultyId;
  onChange: (id: DifficultyId) => void;
  disabledReason?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2 text-left">
      {DIFFICULTIES.map((d) => {
        const active = d.id === value;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            aria-pressed={active}
            className={`group flex items-center gap-3 border px-3 py-2.5 transition-all duration-150 btn-ghost ${
              active
                ? "border-lime/70 bg-lime/10 text-lime shadow-[0_0_18px_-6px_rgba(184,246,81,0.5)]"
                : "border-edge bg-[#0a1d12] text-fern hover:text-cream"
            }`}
          >
            <span className={active ? "text-lime" : "text-fern-dim group-hover:text-fern"}>
              <DifficultyIcon id={d.id} />
            </span>
            <span className="flex-1">
              <span className="font-pixel block text-[10px] tracking-wide">{d.label}</span>
              <span className="mt-0.5 block text-[11px] text-fern-dim">{d.tagline}</span>
            </span>
            {active && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="anim-pop h-4 w-4 text-lime">
                <path d="m5 13 4 4L19 7" strokeLinecap="square" />
              </svg>
            )}
          </button>
        );
      })}
      {disabledReason && <p className="mt-1 text-[11px] leading-snug text-fern-dim">{disabledReason}</p>}
    </div>
  );
}

/* --------------------------------- overlays -------------------------------- */

function Shell({ children, tone = "dark" }: { children: React.ReactNode; tone?: "dark" | "red" }) {
  return (
    <div
      className={`anim-fadein absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-5 ${
        tone === "red" ? "bg-[rgba(26,7,5,0.86)]" : "bg-[rgba(5,15,10,0.87)]"
      }`}
    >
      <div className="anim-rise pixel-panel pixel-notch w-full max-w-[340px] mt-3 px-5 py-6 text-center sm:px-7 sm:py-7">
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-retro pixel-notch bg-lime px-8 py-4 text-[11px] text-ink sm:text-xs"
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-ghost border border-edge bg-[#0a1d12] px-4 py-3 font-pixel text-[9px] text-fern"
    >
      {children}
    </button>
  );
}

interface OverlayProps {
  status: GameStatus;
  score: number;
  best: number;
  isNewBest: boolean;
  apples: number;
  snakeLen: number;
  elapsed: number;
  difficultyId: DifficultyId;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onDifficulty: (id: DifficultyId) => void;
}

export default function Overlays(p: OverlayProps) {
  if (p.status === "running") return null;

  if (p.status === "idle") {
    return (
      <Shell>
        <p className="font-pixel text-[9px] tracking-widest text-fern-dim">INSERT COIN · 1986</p>
        <h1 className="mt-3 font-pixel text-3xl leading-none text-lime [text-shadow:3px_3px_0_#0a1c11,0_0_26px_rgba(184,246,81,0.4)] sm:text-4xl">
          SNAKE
          <span className="anim-blink ml-1 inline-block h-[0.75em] w-[0.45em] translate-y-[0.08em] bg-lime" />
        </h1>
        <p className="mt-3 font-pixel text-[8px] leading-relaxed text-amber">
          EAT <span className="text-fern-dim">·</span> GROW <span className="text-fern-dim">·</span> DON&apos;T CRASH
        </p>

        <div className="mt-5">
          <p className="mb-2 text-left font-pixel text-[8px] tracking-widest text-fern-dim">SELECT SPEED</p>
          <DifficultyPicker value={p.difficultyId} onChange={p.onDifficulty} />
        </div>

        <div className="mt-6">
          <PrimaryButton onClick={p.onStart}>▶ START GAME</PrimaryButton>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] text-fern-dim">
          <span className="flex items-center gap-1.5">
            <span className="kbd">↑↓←→</span> steer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="kbd">SPACE</span> pause
          </span>
          <span className="sm:hidden">or swipe the board</span>
        </div>
      </Shell>
    );
  }

  if (p.status === "paused") {
    return (
      <Shell>
        <h2 className="font-pixel text-xl text-amber [text-shadow:2px_2px_0_#1c1204] sm:text-2xl">PAUSED</h2>
        <p className="mt-3 text-sm text-fern">The serpent waits. Score so far:</p>
        <p className="mt-1 font-pixel text-2xl text-cream">{p.score.toLocaleString()}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <PrimaryButton onClick={p.onResume}>▶ RESUME</PrimaryButton>
          <GhostButton onClick={p.onRestart}>↻ RESTART</GhostButton>
        </div>
        <p className="mt-5 text-[11px] text-fern-dim">
          <span className="kbd">SPACE</span> to resume
        </p>
      </Shell>
    );
  }

  // game over
  const stats = [
    { label: "APPLES", value: String(p.apples), color: "text-coral" },
    { label: "LENGTH", value: String(p.snakeLen), color: "text-lime" },
    { label: "TIME", value: formatTime(p.elapsed), color: "text-cream" },
  ];
  return (
    <Shell tone="red">
      <h2 className="font-pixel text-2xl text-coral [text-shadow:3px_3px_0_#2a0d07] sm:text-3xl">GAME OVER</h2>

      {p.isNewBest ? (
        <p className="anim-bestflash mx-auto mt-3 inline-block border border-amber/70 bg-amber/15 px-3 py-1.5 font-pixel text-[9px] text-amber">
          ★ NEW RECORD ★
        </p>
      ) : (
        <p className="mt-3 font-pixel text-[9px] text-fern-dim">
          BEST {p.best.toLocaleString()}
        </p>
      )}

      <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-fern-dim">final score</p>
      <p className="anim-pop font-pixel text-4xl text-cream [text-shadow:3px_3px_0_#0a1c11] sm:text-5xl">
        {p.score.toLocaleString()}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="border border-edge bg-[#0a1d12] px-2 py-2.5">
            <p className="font-pixel text-[7px] text-fern-dim">{s.label}</p>
            <p className={`mt-1.5 font-pixel text-[11px] ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={p.onRestart}>↻ PLAY AGAIN</PrimaryButton>
      </div>
      <p className="mt-4 text-[11px] text-fern-dim">
        <span className="kbd">R</span> or <span className="kbd">ENTER</span> for instant rematch
      </p>
    </Shell>
  );
}
