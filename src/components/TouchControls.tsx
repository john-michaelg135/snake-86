import type { Dir } from "../game/engine";

function Chevron({ rotate }: { rotate: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="square"
      className="h-5 w-5"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d="m6 14 6-6 6 6" />
    </svg>
  );
}

function PadButton({ dir, rotate, onSteer, label }: { dir: Dir; rotate: number; onSteer: (d: Dir) => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          navigator.vibrate?.(12);
        } catch {
          /* ignore */
        }
        onSteer(dir);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="btn-retro pixel-notch flex h-14 w-16 select-none items-center justify-center bg-panel-2 text-lime active:text-cream"
    >
      <Chevron rotate={rotate} />
    </button>
  );
}

export default function TouchControls({
  onSteer,
  className = "",
}: {
  onSteer: (d: Dir) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mx-auto grid w-fit select-none grid-cols-3 gap-2">
        <span />
        <PadButton dir="up" rotate={0} onSteer={onSteer} label="Move up" />
        <span />
        <PadButton dir="left" rotate={-90} onSteer={onSteer} label="Move left" />
        <PadButton dir="down" rotate={180} onSteer={onSteer} label="Move down" />
        <PadButton dir="right" rotate={90} onSteer={onSteer} label="Move right" />
      </div>
      <p className="mt-2 text-center text-[11px] text-fern-dim">tap pads or swipe on the board</p>
    </div>
  );
}
