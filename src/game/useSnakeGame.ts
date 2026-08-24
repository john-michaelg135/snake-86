import { useCallback, useEffect, useRef, useState } from "react";
import {
  DIFFICULTIES,
  type Difficulty,
  type DifficultyId,
  type Dir,
  type GameEvent,
  type GameState,
  type GameStatus,
  createGame,
  enqueueDir,
  stepGame,
} from "./engine";
import { setMuted as setSfxMuted, sfx } from "./sound";

export type FxEvent = GameEvent & {
  at: number; // performance.now() timestamp
};

export interface BestScores {
  chill: number;
  classic: number;
  turbo: number;
}

const BEST_KEY = "snake86.best.";
const DIFF_KEY = "snake86.difficulty";
const MUTE_KEY = "snake86.muted";

function loadBests(): BestScores {
  const read = (id: DifficultyId): number => {
    try {
      return Math.max(0, Number(localStorage.getItem(BEST_KEY + id)) || 0);
    } catch {
      return 0;
    }
  };
  return { chill: read("chill"), classic: read("classic"), turbo: read("turbo") };
}

function loadDifficulty(): DifficultyId {
  try {
    const v = localStorage.getItem(DIFF_KEY);
    if (v === "chill" || v === "classic" || v === "turbo") return v;
  } catch {
    /* ignore */
  }
  return "classic";
}

export function useSnakeGame() {
  const [difficultyId, setDifficultyId] = useState<DifficultyId>(loadDifficulty);
  const difficulty: Difficulty = DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[1];

  const gameRef = useRef<GameState>(createGame());
  const fxRef = useRef<FxEvent[]>([]);
  /** shared with the canvas renderer for interpolation */
  const loopRef = useRef({ acc: 0, tickMs: difficulty.tickMs });
  const timeRef = useRef({ startedAt: 0, acc: 0 });
  const bestRef = useRef<BestScores>(loadBests());

  const [status, setStatus] = useState<GameStatus>("idle");
  const statusRef = useRef<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [apples, setApples] = useState(0);
  const [snakeLen, setSnakeLen] = useState(3);
  const [lastGain, setLastGain] = useState<{ amount: number; id: number } | null>(null);
  const [bests, setBests] = useState<BestScores>(bestRef.current);
  const [isNewBest, setIsNewBest] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMutedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setSfxMuted(muted);
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  const setStatusBoth = useCallback((s: GameStatus) => {
    statusRef.current = s;
    gameRef.current.status = s;
    setStatus(s);
  }, []);

  const syncView = useCallback(() => {
    const g = gameRef.current;
    setScore(g.score);
    setApples(g.apples);
    setSnakeLen(g.snake.length);
  }, []);

  const best = bests[difficultyId];

  /* ------------------------------- fx handling ------------------------------ */

  const handleEvents = useCallback(
    (events: GameEvent[], now: number) => {
      const g = gameRef.current;
      for (const e of events) {
        fxRef.current.push({ ...e, at: now });
        switch (e.type) {
          case "eat":
            sfx.eat();
            setLastGain({ amount: e.gained, id: now });
            break;
          case "bonus-spawn":
            sfx.bonusSpawn();
            break;
          case "bonus-eat":
            sfx.bonusEat();
            setLastGain({ amount: e.gained, id: now });
            break;
          case "bonus-lost":
            sfx.bonusLost();
            break;
          case "die":
            sfx.die();
            break;
        }
      }
      if (g.status === "over") {
        timeRef.current.acc += now - timeRef.current.startedAt;
        const b = bestRef.current;
        if (g.score > b[difficultyId]) {
          const next = { ...b, [difficultyId]: g.score };
          bestRef.current = next;
          setBests(next);
          setIsNewBest(true);
          try {
            localStorage.setItem(BEST_KEY + difficultyId, String(g.score));
          } catch {
            /* ignore */
          }
        }
        setStatusBoth("over");
      }
    },
    [difficultyId, setStatusBoth]
  );

  /* -------------------------------- game loop ------------------------------- */

  useEffect(() => {
    loopRef.current.tickMs = difficulty.tickMs;
    if (status !== "running") return;

    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(now - last, 120);
      last = now;
      const loop = loopRef.current;
      loop.acc += dt;

      let stepped = false;
      while (loop.acc >= loop.tickMs) {
        loop.acc -= loop.tickMs;
        stepped = true;
        const events = stepGame(gameRef.current, loop.tickMs, difficulty.multiplier);
        if (events.length > 0) handleEvents(events, now);
        if (gameRef.current.status !== "running") break;
      }
      if (stepped) syncView();

      if (gameRef.current.status === "running") {
        raf = requestAnimationFrame(frame);
      } else {
        loop.acc = 0;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [status, difficulty, handleEvents, syncView]);

  /* ------------------------------ elapsed timer ----------------------------- */

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      setElapsed(timeRef.current.acc + (performance.now() - timeRef.current.startedAt));
    }, 250);
    return () => window.clearInterval(id);
  }, [status]);

  /* --------------------------------- actions -------------------------------- */

  const start = useCallback(() => {
    sfx.unlock();
    gameRef.current = createGame("running");
    fxRef.current = [];
    loopRef.current.acc = 0;
    timeRef.current = { startedAt: performance.now(), acc: 0 };
    setElapsed(0);
    setIsNewBest(false);
    setLastGain(null);
    syncView();
    sfx.start();
    setStatusBoth("running");
  }, [setStatusBoth, syncView]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") return;
    sfx.pause();
    timeRef.current.acc += performance.now() - timeRef.current.startedAt;
    setElapsed(timeRef.current.acc);
    setStatusBoth("paused");
  }, [setStatusBoth]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") return;
    sfx.resume();
    timeRef.current.startedAt = performance.now();
    setStatusBoth("running");
  }, [setStatusBoth]);

  const togglePause = useCallback(() => {
    if (statusRef.current === "running") pause();
    else if (statusRef.current === "paused") resume();
  }, [pause, resume]);

  const steer = useCallback(
    (d: Dir) => {
      sfx.unlock();
      const s = statusRef.current;
      if (s === "idle") {
        start();
        // apply the initial direction after the fresh game is created
        const g = gameRef.current;
        g.queue = [];
        if (d !== g.dir && d !== "left") g.dir = d; // fresh snake faces right; can't open going left
        return;
      }
      if (s === "running") {
        enqueueDir(gameRef.current, d);
      }
    },
    [start]
  );

  const chooseDifficulty = useCallback(
    (id: DifficultyId) => {
      sfx.unlock();
      try {
        localStorage.setItem(DIFF_KEY, id);
      } catch {
        /* ignore */
      }
      setDifficultyId(id);
      setIsNewBest(false);
      const diff = DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
      loopRef.current.tickMs = diff.tickMs;
      loopRef.current.acc = 0;
      const s = statusRef.current;
      if (s === "running" || s === "paused" || s === "over") {
        // restart the round at the new speed
        gameRef.current = createGame("running");
        fxRef.current = [];
        timeRef.current = { startedAt: performance.now(), acc: 0 };
        setElapsed(0);
        setLastGain(null);
        syncView();
        sfx.start();
        setStatusBoth("running");
      } else {
        gameRef.current = createGame("idle");
        syncView();
      }
    },
    [setStatusBoth, syncView]
  );

  const toggleMute = useCallback(() => setMutedState((m) => !m), []);

  /* -------------------------------- keyboard -------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      const dirMap: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
      };
      if (dirMap[k]) {
        e.preventDefault();
        steer(dirMap[k]);
        return;
      }
      if (k === " " || k === "Spacebar") {
        e.preventDefault();
        const s = statusRef.current;
        if (s === "idle" || s === "over") start();
        else togglePause();
        return;
      }
      if (k === "Enter") {
        e.preventDefault();
        const s = statusRef.current;
        if (s === "idle" || s === "over" || s === "paused") start();
        return;
      }
      if (k === "r" || k === "R") {
        e.preventDefault();
        if (statusRef.current !== "idle") start();
        return;
      }
      if (k === "p" || k === "P") {
        togglePause();
        return;
      }
      if (k === "m" || k === "M") {
        toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer, start, togglePause, toggleMute]);

  return {
    // state
    status,
    score,
    apples,
    snakeLen,
    best,
    bests,
    isNewBest,
    elapsed,
    muted,
    lastGain,
    difficulty,
    difficultyId,
    // refs for the renderer
    gameRef,
    fxRef,
    loopRef,
    // actions
    start,
    pause,
    resume,
    togglePause,
    steer,
    chooseDifficulty,
    toggleMute,
  };
}

export type SnakeGame = ReturnType<typeof useSnakeGame>;
