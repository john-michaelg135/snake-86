/* Tiny chiptune-style SFX via WebAudio — no assets, lazy-initialized. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ensure(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(m: boolean): void {
  muted = m;
}

interface ToneOpts {
  freq: number;
  end?: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, end, dur, type = "square", gain = 1, delay = 0 }: ToneOpts): void {
  if (muted) return;
  const c = ensure();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end && end !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(end, 30), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* audio is decoration — never break the game */
  }
}

export const sfx = {
  /** unlock audio on a user gesture */
  unlock(): void {
    ensure();
  },
  eat(): void {
    tone({ freq: 620, end: 930, dur: 0.09, type: "square", gain: 0.9 });
  },
  bonusSpawn(): void {
    tone({ freq: 880, dur: 0.07, type: "triangle", gain: 0.7 });
    tone({ freq: 1320, dur: 0.09, type: "triangle", gain: 0.7, delay: 0.07 });
  },
  bonusEat(): void {
    tone({ freq: 660, dur: 0.07, type: "square", gain: 0.85 });
    tone({ freq: 880, dur: 0.07, type: "square", gain: 0.85, delay: 0.07 });
    tone({ freq: 1320, dur: 0.12, type: "square", gain: 0.85, delay: 0.14 });
  },
  bonusLost(): void {
    tone({ freq: 500, end: 300, dur: 0.12, type: "triangle", gain: 0.5 });
  },
  die(): void {
    tone({ freq: 300, end: 60, dur: 0.4, type: "sawtooth", gain: 0.9 });
    tone({ freq: 150, end: 40, dur: 0.5, type: "square", gain: 0.6, delay: 0.06 });
  },
  start(): void {
    tone({ freq: 440, dur: 0.07, type: "square", gain: 0.8 });
    tone({ freq: 660, dur: 0.07, type: "square", gain: 0.8, delay: 0.08 });
    tone({ freq: 880, dur: 0.1, type: "square", gain: 0.8, delay: 0.16 });
  },
  pause(): void {
    tone({ freq: 520, end: 320, dur: 0.11, type: "square", gain: 0.6 });
  },
  resume(): void {
    tone({ freq: 320, end: 520, dur: 0.11, type: "square", gain: 0.6 });
  },
  turn(): void {
    tone({ freq: 240, dur: 0.03, type: "square", gain: 0.18 });
  },
};
