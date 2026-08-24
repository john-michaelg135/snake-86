import { DIFFICULTIES, formatTime, type DifficultyId, type GameStatus } from "../game/engine";
import type { BestScores } from "../game/useSnakeGame";
import { DifficultyPicker } from "./Overlays";

function PanelTitle({ children, accent = "text-lime" }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`inline-block h-2 w-2 ${accent === "text-lime" ? "bg-lime" : accent === "text-amber" ? "bg-amber" : "bg-coral"}`} />
      <h3 className={`font-pixel text-[9px] tracking-widest ${accent}`}>{children}</h3>
      <span className="h-px flex-1 bg-edge" />
    </div>
  );
}

function KeyRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex flex-wrap gap-1">
        {keys.map((k) => (
          <span key={k} className="kbd">
            {k}
          </span>
        ))}
      </span>
      <span className="text-xs text-fern">{action}</span>
    </li>
  );
}

interface Props {
  status: GameStatus;
  difficultyId: DifficultyId;
  onDifficulty: (id: DifficultyId) => void;
  bests: BestScores;
  apples: number;
  snakeLen: number;
  elapsed: number;
}

export default function SidePanel({ status, difficultyId, onDifficulty, bests, apples, snakeLen, elapsed }: Props) {
  const inRound = status === "running" || status === "paused";
  return (
    <div className="stagger flex flex-col gap-4">
      {/* difficulty */}
      <section className="pixel-panel pixel-notch p-4">
        <PanelTitle>SPEED SELECT</PanelTitle>
        <DifficultyPicker
          value={difficultyId}
          onChange={onDifficulty}
          disabledReason={inRound ? "Switching speed restarts the round." : null}
        />
      </section>

      {/* records */}
      <section className="pixel-panel pixel-notch p-4">
        <PanelTitle accent="text-amber">HALL OF FAME</PanelTitle>
        <ul className="flex flex-col gap-1.5">
          {DIFFICULTIES.map((d) => {
            const current = d.id === difficultyId;
            return (
              <li
                key={d.id}
                className={`flex items-center justify-between border px-3 py-2 transition-colors ${
                  current ? "border-amber/50 bg-amber/10" : "border-edge bg-[#0a1d12]"
                }`}
              >
                <span className={`font-pixel text-[8px] ${current ? "text-amber" : "text-fern-dim"}`}>{d.label}</span>
                <span className={`font-pixel text-[10px] ${current ? "text-amber" : "text-fern"}`}>
                  {bests[d.id].toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* session */}
      <section className="pixel-panel pixel-notch p-4">
        <PanelTitle accent="text-coral">THIS ROUND</PanelTitle>
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-edge bg-[#0a1d12] p-2 text-center">
            <p className="font-pixel text-[7px] text-fern-dim">APPLES</p>
            <p className="mt-1 font-pixel text-[11px] text-coral">{apples}</p>
          </div>
          <div className="border border-edge bg-[#0a1d12] p-2 text-center">
            <p className="font-pixel text-[7px] text-fern-dim">LENGTH</p>
            <p className="mt-1 font-pixel text-[11px] text-lime">{snakeLen}</p>
          </div>
          <div className="border border-edge bg-[#0a1d12] p-2 text-center">
            <p className="font-pixel text-[7px] text-fern-dim">TIME</p>
            <p className="mt-1 font-pixel text-[11px] text-cream">{formatTime(elapsed)}</p>
          </div>
        </div>
      </section>

      {/* controls */}
      <section className="pixel-panel pixel-notch p-4">
        <PanelTitle>CONTROLS</PanelTitle>
        <ul className="divide-y divide-edge/60">
          <KeyRow keys={["↑↓←→", "WASD"]} action="steer" />
          <KeyRow keys={["SPACE"]} action="pause / resume" />
          <KeyRow keys={["R"]} action="restart" />
          <KeyRow keys={["M"]} action="mute sfx" />
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-fern-dim">
          On touch devices: swipe the board or use the pad. Every 5th apple summons a gold berry — worth 5× but it
          fades fast.
        </p>
      </section>
    </div>
  );
}
