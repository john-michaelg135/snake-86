import { useEffect, useRef } from "react";
import { COLS, ROWS, BONUS_TTL, type GameState, type GameStatus } from "../game/engine";
import type { FxEvent } from "../game/useSnakeGame";

interface Props {
  gameRef: React.MutableRefObject<GameState>;
  fxRef: React.MutableRefObject<FxEvent[]>;
  loopRef: React.MutableRefObject<{ acc: number; tickMs: number }>;
  status: GameStatus;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  ttl: number;
  color: string;
  max: number;
}

interface FloatText {
  x: number;
  y: number;
  age: number;
  ttl: number;
  text: string;
  color: string;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function buildBoard(css: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(css * dpr);
  c.height = Math.round(css * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const cell = css / COLS;

  ctx.fillStyle = "#0d2718";
  ctx.fillRect(0, 0, css, css);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if ((x + y) % 2 === 0) continue;
      ctx.fillStyle = "#10301e";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // faint grid lines
  ctx.strokeStyle = "rgba(184,246,81,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < COLS; i++) {
    ctx.moveTo(i * cell + 0.5, 0);
    ctx.lineTo(i * cell + 0.5, css);
    ctx.moveTo(0, i * cell + 0.5);
    ctx.lineTo(css, i * cell + 0.5);
  }
  ctx.stroke();

  // edge vignette
  const vg = ctx.createRadialGradient(css / 2, css / 2, css * 0.32, css / 2, css / 2, css * 0.74);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(2,8,5,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, css, css);

  // inner frame line
  ctx.strokeStyle = "rgba(184,246,81,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1.5, 1.5, css - 3, css - 3);
  return c;
}

export default function GameCanvas({ gameRef, fxRef, loopRef, status }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLCanvasElement | null>(null);
  const cssRef = useRef(0);
  const partsRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);
  const textsRef = useRef<FloatText[]>([]);
  const shakeRef = useRef({ mag: 0, flash: 0 });
  const statusRef = useRef<GameStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const css = Math.floor(Math.min(rect.width, rect.height));
      if (css <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssRef.current = css;
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      canvas.style.width = `${css}px`;
      canvas.style.height = `${css}px`;
      boardRef.current = buildBoard(css, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const burst = (px: number, py: number, colors: string[], count: number, speed: number, cell: number) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = speed * cell * (0.35 + Math.random() * 0.75);
        partsRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.5 + Math.random() * 0.45,
          ttl: 1,
          size: cell * (0.07 + Math.random() * 0.11),
          color: colors[Math.floor(Math.random() * colors.length)],
        });
        partsRef.current[partsRef.current.length - 1].ttl = partsRef.current[partsRef.current.length - 1].life;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const canvas = canvasRef.current;
      const css = cssRef.current;
      if (!canvas || css <= 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cell = css / COLS;
      const g = gameRef.current;
      const st = statusRef.current;
      const center = (x: number, y: number) => ({ px: (x + 0.5) * cell, py: (y + 0.5) * cell });

      /* -------- consume fx events -------- */
      if (fxRef.current.length > 0) {
        const evs = fxRef.current.splice(0, fxRef.current.length);
        for (const e of evs) {
          const { px, py } = center(e.pos.x, e.pos.y);
          switch (e.type) {
            case "eat":
              burst(px, py, ["#ff6b52", "#ffc65e", "#ff9a76"], 12, 3.4, cell);
              ringsRef.current.push({ x: px, y: py, age: 0, ttl: 0.38, color: "255,107,82", max: cell * 1.7 });
              textsRef.current.push({ x: px, y: py - cell * 0.4, age: 0, ttl: 0.8, text: `+${e.gained}`, color: "#ffc65e" });
              break;
            case "bonus-eat":
              burst(px, py, ["#ffc65e", "#ffe9a8", "#ffdf80", "#fff6d8"], 22, 4.4, cell);
              ringsRef.current.push({ x: px, y: py, age: 0, ttl: 0.5, color: "255,198,94", max: cell * 2.4 });
              textsRef.current.push({ x: px, y: py - cell * 0.4, age: 0, ttl: 1, text: `+${e.gained}`, color: "#ffe08a" });
              break;
            case "bonus-spawn":
              burst(px, py, ["#ffc65e", "#fff1bd"], 8, 2.2, cell);
              ringsRef.current.push({ x: px, y: py, age: 0, ttl: 0.45, color: "255,198,94", max: cell * 1.9 });
              break;
            case "bonus-lost":
              burst(px, py, ["#8a7a4d", "#5c5336"], 6, 1.6, cell);
              break;
            case "die":
              shakeRef.current.mag = 13;
              shakeRef.current.flash = 0.5;
              burst(px, py, ["#ff6b52", "#b8f651", "#eef6e4"], 18, 3.8, cell);
              break;
          }
        }
      }

      /* -------- setup transform + shake -------- */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shake = shakeRef.current;
      if (shake.mag > 0.3) {
        ctx.translate((Math.random() - 0.5) * shake.mag, (Math.random() - 0.5) * shake.mag);
        shake.mag *= 0.86;
      } else {
        shake.mag = 0;
      }

      /* -------- board -------- */
      if (boardRef.current) ctx.drawImage(boardRef.current, 0, 0, css, css);

      /* -------- rings (under entities) -------- */
      ringsRef.current = ringsRef.current.filter((r) => (r.age += dt) < r.ttl);
      for (const r of ringsRef.current) {
        const k = r.age / r.ttl;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4 + r.max * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r.color},${(1 - k) * 0.85})`;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5;
        ctx.stroke();
      }

      /* -------- apple -------- */
      {
        const { px, py } = center(g.food.x, g.food.y);
        const spawnK = clamp((g.clock - g.foodAt) / 260, 0, 1);
        const pulse = 1 + Math.sin(now / 240) * 0.055;
        const r = cell * 0.33 * pulse * (0.4 + 0.6 * spawnK);
        const glow = ctx.createRadialGradient(px, py, r * 0.2, px, py, r * 2.6);
        glow.addColorStop(0, "rgba(255,107,82,0.4)");
        glow.addColorStop(1, "rgba(255,107,82,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(px - r * 2.6, py - r * 2.6, r * 5.2, r * 5.2);

        const body = ctx.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.15, px, py, r * 1.15);
        body.addColorStop(0, "#ff9a76");
        body.addColorStop(0.55, "#ff6b52");
        body.addColorStop(1, "#d63f2a");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // leaf
        ctx.fillStyle = "#5fd377";
        ctx.beginPath();
        ctx.ellipse(px + r * 0.32, py - r * 1.05, r * 0.42, r * 0.2, -0.6, 0, Math.PI * 2);
        ctx.fill();
        // stem
        ctx.strokeStyle = "#7a5230";
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        ctx.moveTo(px, py - r * 0.8);
        ctx.lineTo(px + r * 0.12, py - r * 1.25);
        ctx.stroke();
        // shine
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(px - r * 0.35, py - r * 0.38, r * 0.18, r * 0.12, -0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      /* -------- bonus berry -------- */
      if (g.bonus) {
        const { px, py } = center(g.bonus.pos.x, g.bonus.pos.y);
        const frac = clamp(1 - (g.clock - g.bonus.spawnedAt) / BONUS_TTL, 0, 1);
        const urgent = frac < 0.3;
        const pulse = 1 + Math.sin(now / (urgent ? 90 : 190)) * 0.09;
        const r = cell * 0.32 * pulse;

        const glow = ctx.createRadialGradient(px, py, r * 0.2, px, py, r * 3);
        glow.addColorStop(0, `rgba(255,198,94,${urgent ? 0.55 : 0.4})`);
        glow.addColorStop(1, "rgba(255,198,94,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

        const body = ctx.createRadialGradient(px - r * 0.3, py - r * 0.35, r * 0.1, px, py, r * 1.1);
        body.addColorStop(0, "#fff1bd");
        body.addColorStop(0.5, "#ffc65e");
        body.addColorStop(1, "#d9922b");
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();

        // star sparkle
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const tw = (Math.sin(now / 160) + 1) / 2;
        ctx.save();
        ctx.translate(px - r * 0.3, py - r * 0.35);
        ctx.rotate(0.5);
        ctx.fillRect(-r * 0.28 * tw - 0.5, -1, r * 0.56 * tw + 1, 2);
        ctx.fillRect(-1, -r * 0.28 * tw - 0.5, 2, r * 0.56 * tw + 1);
        ctx.restore();

        // countdown ring
        ctx.beginPath();
        ctx.arc(px, py, cell * 0.52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.strokeStyle = urgent ? "rgba(255,107,82,0.95)" : "rgba(255,198,94,0.9)";
        ctx.lineWidth = Math.max(2, cell * 0.07);
        ctx.lineCap = "round";
        ctx.stroke();
      }

      /* -------- snake -------- */
      {
        const t = st === "running" ? clamp(loopRef.current.acc / loopRef.current.tickMs, 0, 1) : 1;
        const pv = [g.prev[0], ...g.prev];
        const pts = g.snake.map((p, i) => {
          const q = pv[i] ?? p;
          return { px: (lerp(q.x, p.x, t) + 0.5) * cell, py: (lerp(q.y, p.y, t) + 0.5) * cell };
        });

        if (pts.length > 1) {
          const head = pts[0];
          const tail = pts[pts.length - 1];
          const grad = ctx.createLinearGradient(head.px, head.py, tail.px, tail.py);
          grad.addColorStop(0, "#c9ff6b");
          grad.addColorStop(0.35, "#7ce85f");
          grad.addColorStop(0.75, "#2fc97b");
          grad.addColorStop(1, "#128a63");

          ctx.lineJoin = "round";
          ctx.lineCap = "round";

          // dark outline pass
          ctx.beginPath();
          ctx.moveTo(pts[0].px, pts[0].py);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
          ctx.strokeStyle = "rgba(5,20,12,0.85)";
          ctx.lineWidth = cell * 0.82;
          ctx.stroke();

          // body pass with glow
          ctx.beginPath();
          ctx.moveTo(pts[0].px, pts[0].py);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
          ctx.shadowColor = "rgba(124,232,95,0.5)";
          ctx.shadowBlur = cell * 0.55;
          ctx.strokeStyle = grad;
          ctx.lineWidth = cell * 0.66;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // belly highlight
          ctx.beginPath();
          ctx.moveTo(pts[0].px, pts[0].py);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
          ctx.strokeStyle = "rgba(238,255,210,0.22)";
          ctx.lineWidth = cell * 0.2;
          ctx.stroke();
        }

        // head
        const h = pts[0];
        const dirVec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir] as [number, number];
        const perp = [-dirVec[1], dirVec[0]] as [number, number];
        const hr = cell * 0.44;
        const hg = ctx.createRadialGradient(h.px - hr * 0.3, h.py - hr * 0.35, hr * 0.2, h.px, h.py, hr * 1.2);
        hg.addColorStop(0, "#e2ff9c");
        hg.addColorStop(0.55, "#b8f651");
        hg.addColorStop(1, "#63c94e");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(h.px, h.py, hr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(5,20,12,0.8)";
        ctx.lineWidth = Math.max(1.5, cell * 0.05);
        ctx.stroke();

        // eyes
        for (const s of [-1, 1]) {
          const ex = h.px + dirVec[0] * cell * 0.16 + perp[0] * s * cell * 0.17;
          const ey = h.py + dirVec[1] * cell * 0.16 + perp[1] * s * cell * 0.17;
          ctx.fillStyle = "#f7ffe9";
          ctx.beginPath();
          ctx.arc(ex, ey, cell * 0.115, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#0a1c11";
          ctx.beginPath();
          ctx.arc(ex + dirVec[0] * cell * 0.045, ey + dirVec[1] * cell * 0.045, cell * 0.06, 0, Math.PI * 2);
          ctx.fill();
        }

        // death tint
        if (st === "over" && shake.flash > 0.02) {
          ctx.beginPath();
          ctx.moveTo(pts[0].px, pts[0].py);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].px, pts[i].py);
          ctx.strokeStyle = `rgba(255,107,82,${shake.flash * 0.5})`;
          ctx.lineWidth = cell * 0.7;
          ctx.stroke();
        }
      }

      /* -------- particles -------- */
      partsRef.current = partsRef.current.filter((p) => (p.life -= dt) > 0);
      ctx.globalCompositeOperation = "lighter";
      for (const p of partsRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy = p.vy * 0.92 + cell * 1.4 * dt;
        const k = clamp(p.life / p.ttl, 0, 1);
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        const s = p.size * (0.5 + 0.5 * k);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      /* -------- floating score text -------- */
      textsRef.current = textsRef.current.filter((ft) => (ft.age += dt) < ft.ttl);
      for (const ft of textsRef.current) {
        const k = ft.age / ft.ttl;
        ctx.globalAlpha = 1 - k * k;
        ctx.fillStyle = ft.color;
        ctx.font = `${Math.max(9, Math.round(cell * 0.34))}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y - k * cell * 0.9);
      }
      ctx.globalAlpha = 1;

      /* -------- death flash overlay -------- */
      if (shake.flash > 0.01) {
        ctx.fillStyle = `rgba(255,80,54,${shake.flash * 0.28})`;
        ctx.fillRect(-20, -20, css + 40, css + 40);
        shake.flash *= 0.9;
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [gameRef, fxRef, loopRef]);

  return (
    <div ref={wrapRef} className="absolute inset-0 flex items-center justify-center">
      <canvas ref={canvasRef} className="block" aria-label="Snake game board" />
    </div>
  );
}
