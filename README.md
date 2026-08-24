# SNAKE-86

A modern retro arcade snake game built with React, TypeScript, and HTML5 Canvas. Styled as a fictional 1986 "garden arcade cabinet" with pixel-perfect aesthetics, chiptune sound effects, and smooth animations.

---

## Features

- Classic snake gameplay: eat apples, grow longer, avoid walls and yourself
- 3 difficulty modes: Chill (x1), Classic (x2), Turbo (x3) with separate high scores
- Bonus gold berries: every 5th apple spawns a limited-time gold berry worth 5x points
- Smooth canvas rendering with interpolated movement, particle effects, ring bursts, floating score text
- Procedural chiptune SFX via Web Audio API (no audio files)
- Retro UI with pixel fonts, scanlines, CRT bezel glow, animated fireflies, vignette overlays
- Responsive layout with touch/swipe controls and on-screen D-pad for mobile
- Persistent high scores saved per-difficulty in localStorage
- Keyboard shortcuts: arrow keys / WASD to steer, Space to pause, R to restart, M to mute

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/john-michaelg135/snake-86.git
cd snake-86
npm install
```

### Development

```bash
npm run dev
```

Opens at http://localhost:3000.

### Production Build

```bash
npm run build
```

Output goes to `dist/`.

### Type Check

```bash
npm run typecheck
```

---

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Steer |
| Space | Pause / Resume |
| R | Restart |
| M | Toggle sound |
| Enter | Start / Restart |
| Swipe on board | Steer (touch) |
| D-Pad buttons | Steer (touch) |

---

## Project Structure

```
snake-86/
├── index.html              # Entry HTML with meta, fonts, favicon
├── vite.config.js          # Vite + React + Tailwind CSS config
├── package.json
├── tsconfig.json
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Root component: layout, HUD, header/footer
│   ├── index.css           # Tailwind theme, animations, ambient styles
│   ├── components/
│   │   ├── GameCanvas.tsx  # HTML5 Canvas renderer (snake, food, particles, FX)
│   │   ├── Overlays.tsx    # Idle / Paused / Game Over screens
│   │   ├── SidePanel.tsx   # Desktop side rail: difficulty, records, controls
│   │   └── TouchControls.tsx
│   └── game/
│       ├── engine.ts       # Pure game logic (no React, no DOM)
│       ├── useSnakeGame.ts # React hook: state, game loop, events, actions
│       └── sound.ts        # Web Audio chiptune SFX (procedural)
└── dist/                   # Build output (gitignored)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript 5 |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Rendering | HTML5 Canvas 2D |
| Audio | Web Audio API (procedural) |
| Fonts | Press Start 2P, Space Grotesk |

---

## Game Mechanics

- Grid: 21 x 21 cells
- Starting length: 3 segments
- Apple: +10 x multiplier points
- Gold Berry: +50 x multiplier, spawns every 5 apples, disappears after 6.5s
- Death: hitting a wall or your own body
- Tick speed per difficulty:
  - Chill: 168ms
  - Classic: 112ms
  - Turbo: 74ms

---

## License

Copyright 2026 john-michaelg135. All rights reserved.

This source code is provided for viewing purposes only. No permission is granted to use, copy, modify, or distribute this software without explicit written consent from the author.
