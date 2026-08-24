/* Pure game logic for SNAKE·86 — no React, no DOM. */

export type Point = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";
export type GameStatus = "idle" | "running" | "paused" | "over";
export type DifficultyId = "chill" | "classic" | "turbo";

export interface Difficulty {
  id: DifficultyId;
  label: string;
  tagline: string;
  tickMs: number;
  multiplier: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { id: "chill", label: "CHILL", tagline: "Slow cruise · ×1 pts", tickMs: 168, multiplier: 1 },
  { id: "classic", label: "CLASSIC", tagline: "True arcade · ×2 pts", tickMs: 112, multiplier: 2 },
  { id: "turbo", label: "TURBO", tagline: "No mercy · ×3 pts", tickMs: 74, multiplier: 3 },
];

export const COLS = 21;
export const ROWS = 21;
export const APPLE_POINTS = 10;
export const BONUS_POINTS = 50;
export const BONUS_EVERY = 5; // a gold berry appears every N apples
export const BONUS_TTL = 6500; // ms of game-time to grab it

export const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export interface BonusBerry {
  pos: Point;
  spawnedAt: number; // game clock ms
}

export interface GameState {
  snake: Point[]; // head first
  prev: Point[]; // positions one tick ago (for interpolation)
  dir: Dir;
  queue: Dir[];
  food: Point;
  foodAt: number; // clock when the apple spawned
  bonus: BonusBerry | null;
  score: number;
  apples: number;
  clock: number; // game-time ms, advances only while running
  status: GameStatus;
}

export type GameEvent =
  | { type: "eat"; pos: Point; gained: number }
  | { type: "bonus-eat"; pos: Point; gained: number }
  | { type: "bonus-spawn"; pos: Point }
  | { type: "bonus-lost"; pos: Point }
  | { type: "die"; pos: Point };

export function createGame(status: GameStatus = "idle"): GameState {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);
  const snake: Point[] = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  const g: GameState = {
    snake,
    prev: snake.map((p) => ({ ...p })),
    dir: "right",
    queue: [],
    food: { x: cx + 5, y: cy },
    foodAt: 0,
    bonus: null,
    score: 0,
    apples: 0,
    clock: 0,
    status,
  };
  const f = randomFreeCell(g.snake, []);
  if (f) g.food = f;
  return g;
}

export function randomFreeCell(snake: Point[], extra: Point[]): Point | null {
  const occ = new Set<string>();
  for (const p of snake) occ.add(p.x + "," + p.y);
  for (const p of extra) occ.add(p.x + "," + p.y);
  const free: Point[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!occ.has(x + "," + y)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

/** Buffer a direction change; rejects reversals and caps the queue. */
export function enqueueDir(g: GameState, d: Dir): void {
  const last = g.queue.length > 0 ? g.queue[g.queue.length - 1] : g.dir;
  if (d === last || d === OPPOSITE[last]) return;
  if (g.queue.length < 3) g.queue.push(d);
}

/** Advance the game by one tick. Mutates state, returns events. */
export function stepGame(g: GameState, tickMs: number, multiplier: number): GameEvent[] {
  const events: GameEvent[] = [];
  g.clock += tickMs;

  while (g.queue.length > 0) {
    const d = g.queue.shift()!;
    if (d !== g.dir && d !== OPPOSITE[g.dir]) {
      g.dir = d;
      break;
    }
  }

  const head = g.snake[0];
  const nx = head.x + DELTA[g.dir].x;
  const ny = head.y + DELTA[g.dir].y;

  // walls
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
    g.status = "over";
    events.push({
      type: "die",
      pos: { x: Math.min(Math.max(nx, 0), COLS - 1), y: Math.min(Math.max(ny, 0), ROWS - 1) },
    });
    return events;
  }

  const eatsFood = nx === g.food.x && ny === g.food.y;
  const eatsBonus = g.bonus !== null && nx === g.bonus.pos.x && ny === g.bonus.pos.y;
  const grows = eatsFood || eatsBonus;

  // self — the tail cell vacates unless we grow this tick
  const body = grows ? g.snake : g.snake.slice(0, -1);
  for (const p of body) {
    if (p.x === nx && p.y === ny) {
      g.status = "over";
      events.push({ type: "die", pos: { x: nx, y: ny } });
      return events;
    }
  }

  g.prev = g.snake.map((p) => ({ ...p }));
  g.snake = [{ x: nx, y: ny }, ...g.snake];
  if (!grows) g.snake.pop();

  if (eatsFood) {
    g.apples += 1;
    const gained = APPLE_POINTS * multiplier;
    g.score += gained;
    events.push({ type: "eat", pos: { x: nx, y: ny }, gained });

    const nf = randomFreeCell(g.snake, g.bonus ? [g.bonus.pos] : []);
    if (nf) {
      g.food = nf;
      g.foodAt = g.clock;
    }

    if (!g.bonus && g.apples % BONUS_EVERY === 0) {
      const bp = randomFreeCell(g.snake, [g.food]);
      if (bp) {
        g.bonus = { pos: bp, spawnedAt: g.clock };
        events.push({ type: "bonus-spawn", pos: bp });
      }
    }
  }

  if (eatsBonus && g.bonus) {
    const gained = BONUS_POINTS * multiplier;
    g.score += gained;
    events.push({ type: "bonus-eat", pos: { x: nx, y: ny }, gained });
    g.bonus = null;
  }

  if (g.bonus && g.clock - g.bonus.spawnedAt >= BONUS_TTL) {
    events.push({ type: "bonus-lost", pos: g.bonus.pos });
    g.bonus = null;
  }

  return events;
}

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
