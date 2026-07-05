# Penguin Shoot Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable 2.5D Three.js prototype where the player drags a penguin backward, releases it, watches it fly and bounce, records distance, and restarts quickly.

**Architecture:** The game uses Vite, TypeScript, and plain Three.js. Simulation, input, storage, rendering, and DOM HUD stay in separate modules so gameplay rules can be tested without WebGL. Three.js reads simulation state and renders the world, but gameplay state does not live inside meshes.

**Tech Stack:** Vite, TypeScript, Three.js, Vitest, Playwright, browser pointer events, DOM HUD, `localStorage`.

---

## File Structure

- Create `package.json`: project scripts and dependencies.
- Create `tsconfig.json`: strict TypeScript settings for source and tests.
- Create `vite.config.ts`: Vite dev server and Vitest environment.
- Create `index.html`: root HTML shell with game mount point and HUD.
- Create `.gitignore`: ignore dependencies, build output, local brainstorm files, and test artifacts.
- Create `src/main.ts`: app bootstrap, fixed animation loop, module wiring, WebGL context-loss message.
- Create `src/styles.css`: full-screen canvas, compact HUD, mobile-safe touch behavior.
- Create `src/simulation/game.ts`: deterministic 2D launch simulation and state transitions.
- Create `src/simulation/game.test.ts`: unit tests for reset, launch, distance, bounce, and settling.
- Create `src/input/pointerAim.ts`: pointer drag model that converts screen drags into clamped launch vectors.
- Create `src/input/pointerAim.test.ts`: unit tests for drag thresholds, clamping, cancellation, and release behavior.
- Create `src/ui/hud.ts`: HUD rendering and safe best-distance persistence.
- Create `src/ui/hud.test.ts`: unit tests for storage fallback and HUD text updates.
- Create `src/render/world.ts`: Three.js scene, camera, objects, trajectory preview, resize, and render updates.
- Create `src/render/world.test.ts`: lightweight tests for trajectory sampling and camera target math.
- Create `tests/playwright/penguin-shoot.spec.ts`: browser smoke tests for desktop and mobile-width launch flow.
- Create `playwright.config.ts`: Playwright web server and browser test config.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Create package manifest**

Create `package.json` with this content:

```json
{
  "name": "penguin-shoot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "three": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@types/three": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json` with this content:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests", "vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 3: Create Vite config**

Create `vite.config.ts` with this content:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Create HTML shell**

Create `index.html` with this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#9ad7e8" />
    <title>Penguin Shoot</title>
  </head>
  <body>
    <div id="app">
      <canvas id="game-canvas" aria-label="Penguin Shoot game canvas"></canvas>
      <div id="hud" class="hud" aria-live="polite">
        <div class="hud__stats">
          <span id="distance">0 m</span>
          <span id="best-distance">Best 0 m</span>
        </div>
        <button id="reset-button" type="button" aria-label="Reset run">Reset</button>
      </div>
      <div id="message" class="message" hidden></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create gitignore**

Create `.gitignore` with this content:

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
.superpowers/
.DS_Store
*.log
```

- [ ] **Step 6: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with code `0`.

- [ ] **Step 7: Run initial build to expose missing entry files**

Run:

```bash
npm run build
```

Expected: FAIL because `src/main.ts` does not exist yet. This confirms the scaffold is wired to the intended entry point.

- [ ] **Step 8: Commit scaffold**

Run:

```bash
git add .gitignore index.html package.json package-lock.json tsconfig.json vite.config.ts
git commit -m "chore: scaffold vite three project"
```

Expected: a commit containing the project scaffold.

## Task 2: Simulation Core

**Files:**
- Create: `src/simulation/game.test.ts`
- Create: `src/simulation/game.ts`

- [ ] **Step 1: Write failing simulation tests**

Create `src/simulation/game.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest';
import {
  LAUNCHER_POSITION,
  createGameState,
  launchPenguin,
  predictTrajectory,
  resetGame,
  stepGame,
} from './game';

describe('penguin launch simulation', () => {
  it('starts in aiming state at the launcher', () => {
    const state = createGameState();

    expect(state.phase).toBe('aiming');
    expect(state.position).toEqual(LAUNCHER_POSITION);
    expect(state.velocity).toEqual({ x: 0, y: 0 });
    expect(state.distance).toBe(0);
  });

  it('launches with a clamped velocity from an aim vector', () => {
    const state = createGameState();
    launchPenguin(state, { x: 200, y: 120 });

    expect(state.phase).toBe('flying');
    expect(state.velocity.x).toBeCloseTo(24, 5);
    expect(state.velocity.y).toBeCloseTo(14.4, 5);
  });

  it('advances distance while flying', () => {
    const state = createGameState();
    launchPenguin(state, { x: 12, y: 8 });
    stepGame(state, 0.5);

    expect(state.position.x).toBeGreaterThan(LAUNCHER_POSITION.x);
    expect(state.distance).toBeGreaterThan(0);
  });

  it('bounces on the ground and eventually settles', () => {
    const state = createGameState();
    launchPenguin(state, { x: 10, y: 8 });

    for (let i = 0; i < 700; i += 1) {
      stepGame(state, 1 / 60);
    }

    expect(state.phase).toBe('settled');
    expect(state.position.y).toBe(0);
    expect(state.distance).toBeGreaterThan(5);
  });

  it('resets to launcher while preserving best distance', () => {
    const state = createGameState();
    state.bestDistance = 42;
    state.distance = 20;
    state.phase = 'settled';

    resetGame(state);

    expect(state.phase).toBe('aiming');
    expect(state.position).toEqual(LAUNCHER_POSITION);
    expect(state.bestDistance).toBe(42);
    expect(state.distance).toBe(0);
  });

  it('predicts a readable trajectory without mutating state', () => {
    const state = createGameState();
    const points = predictTrajectory(state, { x: 12, y: 8 }, 8);

    expect(points).toHaveLength(8);
    expect(points[0].x).toBeGreaterThanOrEqual(LAUNCHER_POSITION.x);
    expect(points.some((point) => point.y > LAUNCHER_POSITION.y)).toBe(true);
    expect(state.phase).toBe('aiming');
  });
});
```

- [ ] **Step 2: Run simulation tests and verify failure**

Run:

```bash
npm test -- src/simulation/game.test.ts
```

Expected: FAIL with module resolution errors because `src/simulation/game.ts` has not been created.

- [ ] **Step 3: Implement simulation**

Create `src/simulation/game.ts` with this content:

```ts
export type GamePhase = 'aiming' | 'flying' | 'settled';

export type Vec2 = {
  x: number;
  y: number;
};

export type GameState = {
  phase: GamePhase;
  position: Vec2;
  velocity: Vec2;
  distance: number;
  bestDistance: number;
  flightTime: number;
  lastImpactTime: number;
};

export const LAUNCHER_POSITION: Vec2 = { x: 0, y: 1.1 };

const GRAVITY = -18;
const GROUND_Y = 0;
const MAX_LAUNCH_SPEED = 28;
const AIM_TO_SPEED = 1.2;
const BOUNCE_DAMPING = 0.42;
const ROLLING_FRICTION = 4.8;
const AIR_DRAG = 0.05;
const SETTLE_SPEED = 0.75;
const MAX_STEP = 1 / 30;

export function createGameState(bestDistance = 0): GameState {
  return {
    phase: 'aiming',
    position: { ...LAUNCHER_POSITION },
    velocity: { x: 0, y: 0 },
    distance: 0,
    bestDistance,
    flightTime: 0,
    lastImpactTime: -1,
  };
}

export function resetGame(state: GameState): void {
  state.phase = 'aiming';
  state.position = { ...LAUNCHER_POSITION };
  state.velocity = { x: 0, y: 0 };
  state.distance = 0;
  state.flightTime = 0;
  state.lastImpactTime = -1;
}

export function launchPenguin(state: GameState, aimVelocity: Vec2): void {
  if (state.phase !== 'aiming') {
    return;
  }

  state.velocity = clampVelocity({
    x: aimVelocity.x * AIM_TO_SPEED,
    y: aimVelocity.y * AIM_TO_SPEED,
  });
  state.phase = 'flying';
  state.flightTime = 0;
  state.lastImpactTime = -1;
}

export function stepGame(state: GameState, deltaSeconds: number): void {
  if (state.phase !== 'flying') {
    return;
  }

  let remaining = Math.min(deltaSeconds, 0.1);
  while (remaining > 0) {
    const step = Math.min(remaining, MAX_STEP);
    integrateStep(state, step);
    remaining -= step;
  }
}

export function predictTrajectory(state: GameState, aimVelocity: Vec2, sampleCount: number): Vec2[] {
  const preview = createGameState(state.bestDistance);
  preview.position = { ...state.position };
  launchPenguin(preview, aimVelocity);

  const points: Vec2[] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    stepGame(preview, 0.14);
    points.push({ ...preview.position });
    if (preview.phase === 'settled') {
      break;
    }
  }
  return points;
}

function integrateStep(state: GameState, deltaSeconds: number): void {
  state.flightTime += deltaSeconds;

  state.velocity.x -= state.velocity.x * AIR_DRAG * deltaSeconds;
  state.velocity.y += GRAVITY * deltaSeconds;
  state.position.x += state.velocity.x * deltaSeconds;
  state.position.y += state.velocity.y * deltaSeconds;

  if (state.position.y <= GROUND_Y) {
    state.position.y = GROUND_Y;
    state.lastImpactTime = state.flightTime;

    if (Math.abs(state.velocity.y) > 1.2) {
      state.velocity.y = Math.abs(state.velocity.y) * BOUNCE_DAMPING;
    } else {
      state.velocity.y = 0;
    }

    state.velocity.x = moveTowardZero(state.velocity.x, ROLLING_FRICTION * deltaSeconds);
  }

  state.distance = Math.max(0, state.position.x - LAUNCHER_POSITION.x);
  state.bestDistance = Math.max(state.bestDistance, state.distance);

  if (state.position.y === GROUND_Y && Math.abs(state.velocity.x) < SETTLE_SPEED && Math.abs(state.velocity.y) < SETTLE_SPEED) {
    state.velocity = { x: 0, y: 0 };
    state.phase = 'settled';
  }
}

function clampVelocity(velocity: Vec2): Vec2 {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= MAX_LAUNCH_SPEED) {
    return velocity;
  }

  const scale = MAX_LAUNCH_SPEED / speed;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

function moveTowardZero(value: number, amount: number): number {
  if (Math.abs(value) <= amount) {
    return 0;
  }

  return value > 0 ? value - amount : value + amount;
}
```

- [ ] **Step 4: Run simulation tests**

Run:

```bash
npm test -- src/simulation/game.test.ts
```

Expected: PASS for all simulation tests.

- [ ] **Step 5: Commit simulation**

Run:

```bash
git add src/simulation/game.ts src/simulation/game.test.ts
git commit -m "feat: add penguin launch simulation"
```

Expected: a commit containing simulation code and tests.

## Task 3: Pointer Aim Input

**Files:**
- Create: `src/input/pointerAim.test.ts`
- Create: `src/input/pointerAim.ts`

- [ ] **Step 1: Write failing pointer aim tests**

Create `src/input/pointerAim.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest';
import { createPointerAim, getLaunchVector } from './pointerAim';

describe('pointer aim model', () => {
  it('starts inactive with zero vector', () => {
    const aim = createPointerAim();

    expect(aim.isDragging).toBe(false);
    expect(aim.dragVector).toEqual({ x: 0, y: 0 });
  });

  it('tracks drag away from start and converts it into opposite launch vector', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(60, 130, 1);

    expect(aim.isDragging).toBe(true);
    expect(aim.dragVector).toEqual({ x: -40, y: 30 });
    expect(getLaunchVector(aim)).toEqual({ x: 12, y: 9 });
  });

  it('clamps drag distance for stable launch power', () => {
    const aim = createPointerAim({ maxDragPixels: 100, pixelsToVelocity: 0.3 });

    aim.start(100, 100, 1);
    aim.move(-300, 100, 1);

    expect(aim.dragVector.x).toBeCloseTo(-100, 5);
    expect(getLaunchVector(aim)).toEqual({ x: 30, y: 0 });
  });

  it('ignores moves from another pointer', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 7);
    aim.move(40, 100, 8);

    expect(aim.dragVector).toEqual({ x: 0, y: 0 });
  });

  it('returns launch vector on release and clears active pointer', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(75, 80, 1);
    const launch = aim.end(1);

    expect(launch).toEqual({ x: 7.5, y: -6 });
    expect(aim.isDragging).toBe(false);
    expect(aim.pointerId).toBeNull();
  });

  it('cancels without producing a launch vector', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(60, 100, 1);
    aim.cancel(1);

    expect(aim.isDragging).toBe(false);
    expect(getLaunchVector(aim)).toEqual({ x: 0, y: 0 });
  });
});
```

- [ ] **Step 2: Run pointer aim tests and verify failure**

Run:

```bash
npm test -- src/input/pointerAim.test.ts
```

Expected: FAIL with module resolution errors because `src/input/pointerAim.ts` has not been created.

- [ ] **Step 3: Implement pointer aim**

Create `src/input/pointerAim.ts` with this content:

```ts
import type { Vec2 } from '../simulation/game';

export type PointerAimOptions = {
  maxDragPixels: number;
  pixelsToVelocity: number;
};

export type PointerAim = {
  isDragging: boolean;
  pointerId: number | null;
  startPoint: Vec2;
  currentPoint: Vec2;
  dragVector: Vec2;
  options: PointerAimOptions;
  start: (x: number, y: number, pointerId: number) => void;
  move: (x: number, y: number, pointerId: number) => void;
  end: (pointerId: number) => Vec2;
  cancel: (pointerId: number) => void;
};

const DEFAULT_OPTIONS: PointerAimOptions = {
  maxDragPixels: 120,
  pixelsToVelocity: 0.3,
};

export function createPointerAim(options: Partial<PointerAimOptions> = {}): PointerAim {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  const aim: PointerAim = {
    isDragging: false,
    pointerId: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    dragVector: { x: 0, y: 0 },
    options: resolved,
    start: (x, y, pointerId) => {
      aim.isDragging = true;
      aim.pointerId = pointerId;
      aim.startPoint = { x, y };
      aim.currentPoint = { x, y };
      aim.dragVector = { x: 0, y: 0 };
    },
    move: (x, y, pointerId) => {
      if (!aim.isDragging || aim.pointerId !== pointerId) {
        return;
      }

      aim.currentPoint = { x, y };
      aim.dragVector = clampVector({
        x: x - aim.startPoint.x,
        y: y - aim.startPoint.y,
      }, aim.options.maxDragPixels);
    },
    end: (pointerId) => {
      if (!aim.isDragging || aim.pointerId !== pointerId) {
        return { x: 0, y: 0 };
      }

      const launch = getLaunchVector(aim);
      clearAim(aim);
      return launch;
    },
    cancel: (pointerId) => {
      if (aim.pointerId === pointerId) {
        clearAim(aim);
      }
    },
  };

  return aim;
}

export function getLaunchVector(aim: PointerAim): Vec2 {
  if (!aim.isDragging) {
    return { x: 0, y: 0 };
  }

  return {
    x: -aim.dragVector.x * aim.options.pixelsToVelocity,
    y: aim.dragVector.y * aim.options.pixelsToVelocity,
  };
}

function clearAim(aim: PointerAim): void {
  aim.isDragging = false;
  aim.pointerId = null;
  aim.startPoint = { x: 0, y: 0 };
  aim.currentPoint = { x: 0, y: 0 };
  aim.dragVector = { x: 0, y: 0 };
}

function clampVector(vector: Vec2, maxLength: number): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxLength) {
    return vector;
  }

  const scale = maxLength / length;
  return {
    x: vector.x * scale,
    y: vector.y * scale,
  };
}
```

- [ ] **Step 4: Run pointer aim tests**

Run:

```bash
npm test -- src/input/pointerAim.test.ts
```

Expected: PASS for all pointer aim tests.

- [ ] **Step 5: Commit pointer aim**

Run:

```bash
git add src/input/pointerAim.ts src/input/pointerAim.test.ts
git commit -m "feat: add drag launch input model"
```

Expected: a commit containing the pointer aim model and tests.

## Task 4: HUD And Storage

**Files:**
- Create: `src/ui/hud.test.ts`
- Create: `src/ui/hud.ts`

- [ ] **Step 1: Write failing HUD tests**

Create `src/ui/hud.test.ts` with this content:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBestDistanceStore, createHud } from './hud';

describe('best distance store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads zero when storage is empty', () => {
    const store = createBestDistanceStore('test-best');

    expect(store.load()).toBe(0);
  });

  it('saves and loads best distance', () => {
    const store = createBestDistanceStore('test-best');

    store.save(14.25);

    expect(store.load()).toBe(14.25);
  });

  it('falls back to memory when storage throws', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    } as unknown as Storage;
    const store = createBestDistanceStore('test-best', storage);

    store.save(9);

    expect(store.load()).toBe(9);
  });
});

describe('hud', () => {
  it('updates distance and best labels', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <button id="reset-button"></button>
    `;

    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      resetButton: document.querySelector('#reset-button') as HTMLButtonElement,
    });

    hud.update({ distance: 12.3, bestDistance: 44.8, phase: 'flying' });

    expect(document.querySelector('#distance')?.textContent).toBe('12 m');
    expect(document.querySelector('#best-distance')?.textContent).toBe('Best 45 m');
    expect((document.querySelector('#reset-button') as HTMLButtonElement).disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run HUD tests and verify failure**

Run:

```bash
npm test -- src/ui/hud.test.ts
```

Expected: FAIL with module resolution errors because `src/ui/hud.ts` has not been created.

- [ ] **Step 3: Implement HUD and storage**

Create `src/ui/hud.ts` with this content:

```ts
import type { GamePhase } from '../simulation/game';

export type HudElements = {
  distanceElement: HTMLElement;
  bestDistanceElement: HTMLElement;
  resetButton: HTMLButtonElement;
};

export type HudState = {
  distance: number;
  bestDistance: number;
  phase: GamePhase;
};

export type Hud = {
  update: (state: HudState) => void;
  onReset: (handler: () => void) => void;
};

export type BestDistanceStore = {
  load: () => number;
  save: (distance: number) => void;
};

export function createHud(elements: HudElements): Hud {
  return {
    update: (state) => {
      elements.distanceElement.textContent = `${Math.round(state.distance)} m`;
      elements.bestDistanceElement.textContent = `Best ${Math.round(state.bestDistance)} m`;
      elements.resetButton.disabled = state.phase === 'aiming' && state.distance === 0;
    },
    onReset: (handler) => {
      elements.resetButton.addEventListener('click', handler);
    },
  };
}

export function createBestDistanceStore(key: string, storage: Storage = window.localStorage): BestDistanceStore {
  let memoryValue = 0;

  return {
    load: () => {
      try {
        const rawValue = storage.getItem(key);
        if (rawValue === null) {
          return memoryValue;
        }

        const parsed = Number.parseFloat(rawValue);
        memoryValue = Number.isFinite(parsed) ? parsed : 0;
        return memoryValue;
      } catch {
        return memoryValue;
      }
    },
    save: (distance) => {
      memoryValue = Math.max(memoryValue, distance);
      try {
        storage.setItem(key, String(memoryValue));
      } catch {
        return;
      }
    },
  };
}
```

- [ ] **Step 4: Run HUD tests**

Run:

```bash
npm test -- src/ui/hud.test.ts
```

Expected: PASS for all HUD tests.

- [ ] **Step 5: Commit HUD**

Run:

```bash
git add src/ui/hud.ts src/ui/hud.test.ts
git commit -m "feat: add hud and score persistence"
```

Expected: a commit containing HUD and storage code.

## Task 5: Three.js World Rendering

**Files:**
- Create: `src/render/world.test.ts`
- Create: `src/render/world.ts`

- [ ] **Step 1: Write failing render helper tests**

Create `src/render/world.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest';
import { LAUNCHER_POSITION } from '../simulation/game';
import { calculateCameraTargetX, createTrajectoryPoints } from './world';

describe('render world helpers', () => {
  it('keeps camera near launcher before the penguin moves forward', () => {
    expect(calculateCameraTargetX(-1)).toBe(0);
    expect(calculateCameraTargetX(0)).toBe(0);
  });

  it('follows forward progress with a readable lead', () => {
    expect(calculateCameraTargetX(20)).toBe(14);
  });

  it('converts simulation trajectory into three-friendly points', () => {
    const points = createTrajectoryPoints([
      { x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y },
      { x: 2, y: 3 },
    ]);

    expect(points[0].x).toBe(LAUNCHER_POSITION.x);
    expect(points[0].y).toBe(LAUNCHER_POSITION.y);
    expect(points[0].z).toBe(0);
    expect(points[1].x).toBe(2);
    expect(points[1].y).toBe(3);
    expect(points[1].z).toBe(0);
  });
});
```

- [ ] **Step 2: Run render helper tests and verify failure**

Run:

```bash
npm test -- src/render/world.test.ts
```

Expected: FAIL with module resolution errors because `src/render/world.ts` has not been created.

- [ ] **Step 3: Implement Three.js world**

Create `src/render/world.ts` with this content:

```ts
import * as THREE from 'three';
import type { GameState, Vec2 } from '../simulation/game';

export type RenderWorld = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  penguin: THREE.Group;
  launcherBand: THREE.Line;
  trajectoryLine: THREE.Line;
  impactParticles: THREE.Points;
  update: (state: GameState, trajectory: Vec2[], aimStart: Vec2 | null, aimEnd: Vec2 | null) => void;
  resize: () => void;
  dispose: () => void;
};

const CAMERA_WIDTH = 18;
const CAMERA_HEIGHT = 10;

export function createRenderWorld(canvas: HTMLCanvasElement): RenderWorld {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x9ad7e8, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9ad7e8, 35, 120);

  const camera = new THREE.OrthographicCamera(-CAMERA_WIDTH / 2, CAMERA_WIDTH / 2, CAMERA_HEIGHT / 2, -CAMERA_HEIGHT / 2, 0.1, 200);
  camera.position.set(0, 5.5, 14);
  camera.lookAt(0, 2, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb4c8, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-5, 10, 8);
  scene.add(sun);

  const ground = createGround();
  scene.add(ground);
  scene.add(createDistanceMarkers());
  scene.add(createIcebergs());

  const launcher = createLauncher();
  scene.add(launcher);

  const penguin = createPenguin();
  scene.add(penguin);

  const launcherBand = createLine(0x203040, 3);
  scene.add(launcherBand);

  const trajectoryLine = createLine(0xffffff, 2);
  scene.add(trajectoryLine);

  const impactParticles = createImpactParticles();
  scene.add(impactParticles);

  const world: RenderWorld = {
    renderer,
    scene,
    camera,
    penguin,
    launcherBand,
    trajectoryLine,
    impactParticles,
    update: (state, trajectory, aimStart, aimEnd) => {
      penguin.position.set(state.position.x, state.position.y + 0.55, 0);
      penguin.rotation.z = -state.position.x * 0.35;

      camera.position.x = calculateCameraTargetX(state.position.x);
      camera.lookAt(camera.position.x, 2, 0);

      updateLine(trajectoryLine, createTrajectoryPoints(trajectory));
      trajectoryLine.visible = trajectory.length > 1 && state.phase === 'aiming';

      if (aimStart && aimEnd && state.phase === 'aiming') {
        updateLine(launcherBand, [
          new THREE.Vector3(aimStart.x, aimStart.y, 0.05),
          new THREE.Vector3(aimEnd.x, aimEnd.y, 0.05),
        ]);
        launcherBand.visible = true;
      } else {
        launcherBand.visible = false;
      }

      impactParticles.visible = state.phase === 'settled';
      impactParticles.position.set(state.position.x, 0.08, 0);

      renderer.render(scene, camera);
    },
    resize: () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);

      const aspect = Math.max(width / Math.max(height, 1), 0.6);
      camera.left = (-CAMERA_HEIGHT * aspect) / 2;
      camera.right = (CAMERA_HEIGHT * aspect) / 2;
      camera.top = CAMERA_HEIGHT / 2;
      camera.bottom = -CAMERA_HEIGHT / 2;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      scene.traverse((object) => {
        if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.dispose();
        }
        if ('material' in object) {
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
          } else if (material instanceof THREE.Material) {
            material.dispose();
          }
        }
      });
      renderer.dispose();
    },
  };

  world.resize();
  return world;
}

export function calculateCameraTargetX(penguinX: number): number {
  return Math.max(0, penguinX - 6);
}

export function createTrajectoryPoints(points: Vec2[]): THREE.Vector3[] {
  return points.map((point) => new THREE.Vector3(point.x, point.y, 0));
}

function createPenguin(): THREE.Group {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.45 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf59b32, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), black);
  body.scale.set(0.8, 1.05, 0.7);
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), white);
  belly.position.set(0.05, -0.08, 0.38);
  belly.scale.set(0.85, 1, 0.35);
  group.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), black);
  head.position.set(0.03, 0.58, 0);
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 16), orange);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0.05, 0.55, 0.38);
  group.add(beak);

  const footGeometry = new THREE.BoxGeometry(0.28, 0.07, 0.18);
  const leftFoot = new THREE.Mesh(footGeometry, orange);
  leftFoot.position.set(-0.18, -0.55, 0.15);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.18;
  group.add(leftFoot, rightFoot);

  return group;
}

function createLauncher(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xb9f0ff, roughness: 0.35, metalness: 0.05 });
  const postGeometry = new THREE.CylinderGeometry(0.08, 0.12, 2, 12);

  const left = new THREE.Mesh(postGeometry, material);
  left.position.set(-0.55, 0.75, -0.1);
  left.rotation.z = -0.2;

  const right = new THREE.Mesh(postGeometry, material);
  right.position.set(0.3, 0.75, -0.1);
  right.rotation.z = 0.2;

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.8), material);
  base.position.set(-0.12, 0.1, -0.1);

  group.add(left, right, base);
  return group;
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(220, 0.25, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xdaf8ff, roughness: 0.4 });
  const ground = new THREE.Mesh(geometry, material);
  ground.position.set(65, -0.15, 0);
  return ground;
}

function createDistanceMarkers(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x6cb6ce, roughness: 0.5 });

  for (let distance = 10; distance <= 120; distance += 10) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.7), material);
    marker.position.set(distance, 0.08, -1.6);
    group.add(marker);
  }

  return group;
}

function createIcebergs(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc7f0ff, roughness: 0.7 });

  for (let i = 0; i < 14; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2 + (i % 3) * 0.3, 2.5 + (i % 4) * 0.4, 5), material);
    cone.position.set(-12 + i * 12, 0.9, -4.2);
    cone.rotation.y = i * 0.7;
    group.add(cone);
  }

  return group;
}

function createLine(color: number, linewidth: number): THREE.Line {
  const material = new THREE.LineBasicMaterial({ color, linewidth });
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  return line;
}

function updateLine(line: THREE.Line, points: THREE.Vector3[]): void {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points.length > 0 ? points : [new THREE.Vector3(), new THREE.Vector3()]);
}

function createImpactParticles(): THREE.Points {
  const vertices = new Float32Array([
    -0.35, 0.05, 0,
    -0.18, 0.16, 0.12,
    0, 0.08, -0.1,
    0.22, 0.14, 0.08,
    0.38, 0.06, -0.05,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16 });
  const particles = new THREE.Points(geometry, material);
  particles.visible = false;
  return particles;
}
```

- [ ] **Step 4: Run render helper tests**

Run:

```bash
npm test -- src/render/world.test.ts
```

Expected: PASS for all render helper tests.

- [ ] **Step 5: Commit render world**

Run:

```bash
git add src/render/world.ts src/render/world.test.ts
git commit -m "feat: add threejs penguin world"
```

Expected: a commit containing Three.js world rendering and tests.

## Task 6: App Integration And Styling

**Files:**
- Create: `src/main.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Create main app wiring**

Create `src/main.ts` with this content:

```ts
import './styles.css';
import { createPointerAim, getLaunchVector } from './input/pointerAim';
import { createRenderWorld } from './render/world';
import {
  LAUNCHER_POSITION,
  createGameState,
  launchPenguin,
  predictTrajectory,
  resetGame,
  stepGame,
  type Vec2,
} from './simulation/game';
import { createBestDistanceStore, createHud } from './ui/hud';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const distanceElement = document.querySelector<HTMLElement>('#distance');
const bestDistanceElement = document.querySelector<HTMLElement>('#best-distance');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button');
const message = document.querySelector<HTMLElement>('#message');

if (!canvas || !distanceElement || !bestDistanceElement || !resetButton || !message) {
  throw new Error('Penguin Shoot could not find required DOM elements.');
}

const bestDistanceStore = createBestDistanceStore('penguin-shoot:best-distance');
const state = createGameState(bestDistanceStore.load());
const aim = createPointerAim();
const hud = createHud({ distanceElement, bestDistanceElement, resetButton });
const world = createRenderWorld(canvas);

let lastFrameTime = performance.now();
let animationFrame = 0;

hud.onReset(() => {
  resetGame(state);
  hud.update(state);
});

canvas.addEventListener('pointerdown', (event) => {
  if (state.phase !== 'aiming') {
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  aim.start(event.clientX, event.clientY, event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!aim.isDragging) {
    return;
  }

  aim.move(event.clientX, event.clientY, event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointerup', (event) => {
  if (!aim.isDragging) {
    return;
  }

  const launch = aim.end(event.pointerId);
  launchPenguin(state, launch);
  event.preventDefault();
});

canvas.addEventListener('pointercancel', (event) => {
  aim.cancel(event.pointerId);
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  message.hidden = false;
  message.textContent = 'WebGL context lost. Reload the page to restart the prototype.';
});

window.addEventListener('resize', () => {
  world.resize();
});

function frame(now: number): void {
  const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  stepGame(state, deltaSeconds);
  if (state.phase === 'settled') {
    bestDistanceStore.save(state.bestDistance);
  }

  const launchVector = getLaunchVector(aim);
  const trajectory = state.phase === 'aiming' && aim.isDragging ? predictTrajectory(state, launchVector, 24) : [];
  const aimEnd = aim.isDragging ? screenDragToWorldEnd(aim.dragVector) : null;
  const aimStart = aim.isDragging ? { ...LAUNCHER_POSITION } : null;

  world.update(state, trajectory, aimStart, aimEnd);
  hud.update(state);
  animationFrame = requestAnimationFrame(frame);
}

function screenDragToWorldEnd(dragVector: Vec2): Vec2 {
  return {
    x: LAUNCHER_POSITION.x + dragVector.x / 70,
    y: LAUNCHER_POSITION.y - dragVector.y / 70,
  };
}

animationFrame = requestAnimationFrame(frame);
hud.update(state);

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationFrame);
  world.dispose();
});
```

- [ ] **Step 2: Create styles**

Create `src/styles.css` with this content:

```css
* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #9ad7e8;
  color: #102532;
}

#app {
  position: fixed;
  inset: 0;
}

#game-canvas {
  display: block;
  width: 100vw;
  height: 100vh;
  touch-action: none;
  cursor: grab;
}

#game-canvas:active {
  cursor: grabbing;
}

.hud {
  position: fixed;
  top: max(14px, env(safe-area-inset-top));
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.hud__stats {
  display: grid;
  gap: 4px;
  min-width: 116px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 8px;
  background: rgba(242, 252, 255, 0.78);
  box-shadow: 0 8px 24px rgba(24, 84, 110, 0.16);
  font-weight: 800;
  line-height: 1.1;
}

#distance {
  font-size: 18px;
}

#best-distance {
  font-size: 13px;
  color: #31576b;
}

#reset-button {
  width: 64px;
  min-height: 40px;
  border: 1px solid rgba(13, 51, 67, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #143241;
  box-shadow: 0 8px 24px rgba(24, 84, 110, 0.14);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  pointer-events: auto;
}

#reset-button:disabled {
  opacity: 0.48;
}

.message {
  position: fixed;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  max-width: min(460px, calc(100vw - 32px));
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16, 37, 50, 0.9);
  color: #fff;
  font-size: 14px;
  text-align: center;
}

@media (max-width: 560px) {
  .hud {
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
  }

  .hud__stats {
    padding: 7px 9px;
  }

  #distance {
    font-size: 16px;
  }

  #best-distance {
    font-size: 12px;
  }

  #reset-button {
    width: 58px;
    min-height: 38px;
    font-size: 12px;
  }
}
```

- [ ] **Step 3: Run unit tests**

Run:

```bash
npm test
```

Expected: PASS for simulation, input, HUD, and render helper tests.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and `dist/` is generated.

- [ ] **Step 5: Commit integrated prototype**

Run:

```bash
git add src/main.ts src/styles.css
git commit -m "feat: wire playable penguin prototype"
```

Expected: a commit containing app integration and styling.

## Task 7: Browser Smoke Tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/playwright/penguin-shoot.spec.ts`

- [ ] **Step 1: Create Playwright config**

Create `playwright.config.ts` with this content:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/playwright',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
```

- [ ] **Step 2: Create browser smoke test**

Create `tests/playwright/penguin-shoot.spec.ts` with this content:

```ts
import { expect, test } from '@playwright/test';

test('launches, records distance, and resets', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const startX = box.x + box.width * 0.28;
  const startY = box.y + box.height * 0.58;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 95, startY + 42, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => {
    const text = await page.locator('#distance').textContent();
    return Number.parseInt(text ?? '0', 10);
  }).toBeGreaterThan(1);

  await page.locator('#reset-button').click();
  await expect(page.locator('#distance')).toHaveText('0 m');
});

test('mobile viewport keeps HUD readable and prevents touch scrolling during aim', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#reset-button')).toBeVisible();

  const beforeScroll = await page.evaluate(() => window.scrollY);
  await page.locator('#game-canvas').dispatchEvent('pointerdown', {
    pointerId: 21,
    pointerType: 'touch',
    clientX: 160,
    clientY: 400,
  });
  await page.locator('#game-canvas').dispatchEvent('pointermove', {
    pointerId: 21,
    pointerType: 'touch',
    clientX: 80,
    clientY: 430,
  });
  await page.locator('#game-canvas').dispatchEvent('pointercancel', {
    pointerId: 21,
    pointerType: 'touch',
  });

  const afterScroll = await page.evaluate(() => window.scrollY);
  expect(afterScroll).toBe(beforeScroll);
});
```

- [ ] **Step 3: Install Playwright browser**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium browser binaries are installed or already present.

- [ ] **Step 4: Run browser smoke tests**

Run:

```bash
npm run test:e2e
```

Expected: PASS for `desktop-chromium` and `mobile-chromium`.

- [ ] **Step 5: Commit smoke tests**

Run:

```bash
git add playwright.config.ts tests/playwright/penguin-shoot.spec.ts
git commit -m "test: add browser smoke coverage"
```

Expected: a commit containing Playwright smoke tests.

## Task 8: Final Verification And Handoff

**Files:**
- Modify: none unless verification reveals a bug.

- [ ] **Step 1: Run all unit tests**

Run:

```bash
npm test
```

Expected: PASS for all Vitest suites.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 3: Run browser smoke tests**

Run:

```bash
npm run test:e2e
```

Expected: PASS for desktop and mobile Chromium projects.

- [ ] **Step 4: Start local dev server for user testing**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 5: Final status check**

Run:

```bash
git status --short --branch
```

Expected: current branch is `codex/penguin-shoot-prototype` and the worktree is clean.

## Self-Review

- Spec coverage: the plan covers scaffold, Angry Birds-style pointer launch, 2.5D side-view rendering, deterministic launch simulation, camera follow, trajectory preview, distance and best score, reset, localStorage fallback, resize handling, WebGL context-loss message, desktop smoke testing, and mobile-width smoke testing.
- Scope check: the plan intentionally excludes Rapier, imported GLB assets, obstacles, coins, upgrades, backend services, and complex menus, matching the approved first-prototype scope.
- Placeholder scan: every task contains concrete files, commands, code, and expected outcomes.
- Type consistency: `Vec2`, `GameState`, `GamePhase`, `PointerAim`, `Hud`, and `RenderWorld` are introduced before later tasks use them.
