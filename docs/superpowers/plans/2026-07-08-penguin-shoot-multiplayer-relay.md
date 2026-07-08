# Penguin Shoot Multiplayer Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local relay mode where 1 to 10 numbered attempts launch sequentially, each attempt starts from the previous final distance, and final results are shown sorted by score descending.

**Architecture:** Add a pure session module above the existing single-attempt simulation. Extend simulation state with a cumulative start distance while keeping current default behavior. Add DOM overlay helpers for setup/results and wire them through `main.ts`.

**Tech Stack:** Vite, TypeScript, Vitest with jsdom, Playwright, Three.js render adapter.

---

## File Structure

- Create `src/session/multiplayer.ts`: pure local relay session state, attempt count normalization, recording, next-attempt transition, sorted result rows.
- Create `src/session/multiplayer.test.ts`: unit tests for all relay session rules without DOM or Three.js.
- Modify `src/simulation/game.ts`: add `startDistance` to `GameState`; support creating/resetting at non-zero cumulative distance; preserve default single-run behavior.
- Modify `src/simulation/game.test.ts`: verify default behavior and non-zero start distance.
- Modify `src/ui/hud.ts`: add attempt progress field support without putting session rules in HUD.
- Modify `src/ui/hud.test.ts`: cover attempt label rendering.
- Create `src/ui/overlays.ts`: setup overlay and results overlay DOM adapter.
- Create `src/ui/overlays.test.ts`: cover count submission, clamping behavior, result rendering, and play-again callback.
- Modify `index.html`: add attempt progress HUD node, setup overlay, and results overlay.
- Modify `src/styles.css`: style overlays, compact table, and responsive HUD text.
- Modify `src/main.ts`: coordinate setup, session lifecycle, attempt transitions, duplicate settled-frame prevention, reset behavior.
- Modify `src/main.test.ts`: update boot DOM/mocks for new required nodes and add lightweight integration around startup blocking.
- Modify `tests/playwright/penguin-shoot.spec.ts`: start through setup overlay and add a short one-attempt result smoke test.

---

### Task 1: Relay Session Module

**Files:**
- Create: `src/session/multiplayer.ts`
- Create: `src/session/multiplayer.test.ts`

- [ ] **Step 1: Write failing session tests**

Create `src/session/multiplayer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  createRelaySession,
  getCurrentAttempt,
  getNextStartDistance,
  getSortedResults,
  normalizeAttemptCount,
  recordAttempt,
} from './multiplayer';

describe('multiplayer relay session', () => {
  it('normalizes attempt counts to whole numbers from 1 to 10', () => {
    expect(normalizeAttemptCount('')).toBe(1);
    expect(normalizeAttemptCount('0')).toBe(1);
    expect(normalizeAttemptCount('3.8')).toBe(3);
    expect(normalizeAttemptCount('11')).toBe(10);
    expect(normalizeAttemptCount('abc')).toBe(1);
  });

  it('starts with attempt 1 at zero distance', () => {
    const session = createRelaySession(3);

    expect(session.totalAttempts).toBe(3);
    expect(getCurrentAttempt(session)).toEqual({ attemptNumber: 1, startDistance: 0 });
    expect(session.results).toEqual([]);
    expect(session.status).toBe('playing');
  });

  it('records attempts with start distance, added distance, and final score', () => {
    const session = createRelaySession(2);

    const first = recordAttempt(session, 100);
    expect(first).toEqual({
      attemptNumber: 1,
      startDistance: 0,
      addedDistance: 100,
      score: 100,
    });
    expect(session.status).toBe('playing');
    expect(getCurrentAttempt(session)).toEqual({ attemptNumber: 2, startDistance: 100 });
    expect(getNextStartDistance(session)).toBe(100);

    const second = recordAttempt(session, 160);
    expect(second).toEqual({
      attemptNumber: 2,
      startDistance: 100,
      addedDistance: 60,
      score: 160,
    });
    expect(session.status).toBe('complete');
  });

  it('does not record duplicate settled frames for the same attempt', () => {
    const session = createRelaySession(1);

    const first = recordAttempt(session, 42);
    const duplicate = recordAttempt(session, 45);

    expect(first?.score).toBe(42);
    expect(duplicate).toBeNull();
    expect(session.results).toHaveLength(1);
  });

  it('sorts results by score descending without mutating stored order', () => {
    const session = createRelaySession(3);
    recordAttempt(session, 120);
    recordAttempt(session, 180);
    recordAttempt(session, 170);

    expect(session.results.map((result) => result.score)).toEqual([120, 180, 170]);
    expect(getSortedResults(session).map((result) => result.score)).toEqual([180, 170, 120]);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test -- src/session/multiplayer.test.ts`

Expected: FAIL because `src/session/multiplayer.ts` does not exist.

- [ ] **Step 3: Implement the session module**

Create `src/session/multiplayer.ts`:

```ts
export type RelayStatus = 'idle' | 'playing' | 'complete';

export type AttemptResult = {
  attemptNumber: number;
  startDistance: number;
  addedDistance: number;
  score: number;
};

export type CurrentAttempt = {
  attemptNumber: number;
  startDistance: number;
};

export type RelaySession = {
  totalAttempts: number;
  currentAttemptNumber: number;
  currentStartDistance: number;
  status: RelayStatus;
  results: AttemptResult[];
};

const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS = 10;

export function normalizeAttemptCount(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return MIN_ATTEMPTS;
  }

  return Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Math.floor(parsed)));
}

export function createRelaySession(totalAttempts: string | number): RelaySession {
  return {
    totalAttempts: normalizeAttemptCount(totalAttempts),
    currentAttemptNumber: 1,
    currentStartDistance: 0,
    status: 'playing',
    results: [],
  };
}

export function getCurrentAttempt(session: RelaySession): CurrentAttempt | null {
  if (session.status !== 'playing') {
    return null;
  }

  return {
    attemptNumber: session.currentAttemptNumber,
    startDistance: session.currentStartDistance,
  };
}

export function recordAttempt(session: RelaySession, score: number): AttemptResult | null {
  if (session.status !== 'playing' || session.results.length >= session.currentAttemptNumber) {
    return null;
  }

  const safeScore = Number.isFinite(score) ? Math.max(score, session.currentStartDistance) : session.currentStartDistance;
  const result: AttemptResult = {
    attemptNumber: session.currentAttemptNumber,
    startDistance: session.currentStartDistance,
    addedDistance: safeScore - session.currentStartDistance,
    score: safeScore,
  };

  session.results.push(result);

  if (session.currentAttemptNumber >= session.totalAttempts) {
    session.status = 'complete';
  } else {
    session.currentAttemptNumber += 1;
    session.currentStartDistance = result.score;
  }

  return result;
}

export function getNextStartDistance(session: RelaySession): number {
  return session.currentStartDistance;
}

export function getSortedResults(session: RelaySession): AttemptResult[] {
  return [...session.results].sort((left, right) => right.score - left.score || left.attemptNumber - right.attemptNumber);
}
```

- [ ] **Step 4: Run session tests**

Run: `npm run test -- src/session/multiplayer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit session module**

```bash
git add src/session/multiplayer.ts src/session/multiplayer.test.ts
git commit -m "feat: add relay session model"
```

---

### Task 2: Simulation Start Distance

**Files:**
- Modify: `src/simulation/game.ts`
- Modify: `src/simulation/game.test.ts`

- [ ] **Step 1: Add failing simulation tests**

Append these tests inside the existing `describe('penguin launch simulation', () => { ... })` block in `src/simulation/game.test.ts`:

```ts
  it('can start a run from a cumulative distance', () => {
    const state = createGameState(0, [], 100);

    expect(state.phase).toBe('aiming');
    expect(state.startDistance).toBe(100);
    expect(state.position).toEqual({ x: 100, y: LAUNCHER_POSITION.y });
    expect(state.distance).toBe(100);
  });

  it('resets to a non-zero cumulative start distance while preserving best distance', () => {
    const state = createGameState();
    state.bestDistance = 140;
    state.distance = 125;
    state.phase = 'settled';

    resetGame(state, 100);

    expect(state.phase).toBe('aiming');
    expect(state.startDistance).toBe(100);
    expect(state.position).toEqual({ x: 100, y: LAUNCHER_POSITION.y });
    expect(state.distance).toBe(100);
    expect(state.bestDistance).toBe(140);
  });
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm run test -- src/simulation/game.test.ts`

Expected: FAIL because `GameState` has no `startDistance` and `createGameState` does not accept the third argument yet.

- [ ] **Step 3: Update simulation implementation**

In `src/simulation/game.ts`, add `startDistance` to `GameState`, add a third `startDistance = 0` parameter to `createGameState`, and update reset/distance math:

```ts
export type GameState = {
  phase: GamePhase;
  position: Vec2;
  velocity: Vec2;
  distance: number;
  startDistance: number;
  bestDistance: number;
  flightTime: number;
  lastImpactTime: number;
  mapItems: MapItem[];
};
```

```ts
export function createGameState(bestDistance = 0, mapItems = createMapItems(), startDistance = 0): GameState {
  const safeStartDistance = sanitizeDistance(startDistance);
  return {
    phase: 'aiming',
    position: { x: safeStartDistance, y: LAUNCHER_POSITION.y },
    velocity: { x: 0, y: 0 },
    distance: safeStartDistance,
    startDistance: safeStartDistance,
    bestDistance,
    flightTime: 0,
    lastImpactTime: -1,
    mapItems: cloneMapItems(mapItems),
  };
}

export function resetGame(state: GameState, startDistance = 0): void {
  const safeStartDistance = sanitizeDistance(startDistance);
  state.phase = 'aiming';
  state.position = { x: safeStartDistance, y: LAUNCHER_POSITION.y };
  state.velocity = { x: 0, y: 0 };
  state.distance = safeStartDistance;
  state.startDistance = safeStartDistance;
  state.flightTime = 0;
  state.lastImpactTime = -1;
  state.mapItems = createMapItems();
}
```

Update `integrateStep` so distance stays cumulative:

```ts
  state.distance = Math.max(state.startDistance, state.position.x);
  state.bestDistance = Math.max(state.bestDistance, state.distance);
```

Update `predictTrajectory` to keep the same start distance and map items:

```ts
  const preview = createGameState(state.bestDistance, state.mapItems, state.startDistance);
  preview.position = { ...state.position };
```

Add this helper near `cloneMapItems`:

```ts
function sanitizeDistance(distance: number): number {
  return Number.isFinite(distance) && distance > 0 ? distance : 0;
}
```

- [ ] **Step 4: Update main aiming vector origin**

In `src/main.ts`, replace fixed `LAUNCHER_POSITION` aim origin usage with `state.position` while aiming:

```ts
const trajectory = state.phase === 'aiming' && aim.isDragging ? predictTrajectory(state, launchVector, 24) : [];
const aimEnd = aim.isDragging ? screenDragToWorldEnd(aim.dragVector) : null;
const aimStart = aim.isDragging ? { ...state.position } : null;
```

Update `screenDragToWorldEnd`:

```ts
function screenDragToWorldEnd(dragVector: Vec2): Vec2 {
  return {
    x: state.position.x + dragVector.x / 70,
    y: state.position.y - dragVector.y / 70,
  };
}
```

Remove the unused `LAUNCHER_POSITION` import if TypeScript reports it.

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/simulation/game.test.ts src/main.test.ts`

Expected: PASS after updating `main.test.ts` fixture `state` to include `startDistance: 0` if needed.

- [ ] **Step 6: Commit simulation update**

```bash
git add src/simulation/game.ts src/simulation/game.test.ts src/main.ts src/main.test.ts
git commit -m "feat: support relay start distances"
```

---

### Task 3: HUD And Overlay UI

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `src/ui/hud.ts`
- Modify: `src/ui/hud.test.ts`
- Create: `src/ui/overlays.ts`
- Create: `src/ui/overlays.test.ts`

- [ ] **Step 1: Add failing HUD test**

In `src/ui/hud.test.ts`, update DOM snippets to include `<span id="attempt-progress"></span>`, pass it into `createHud`, and add:

```ts
  it('updates attempt progress when provided', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <span id="attempt-progress"></span>
      <button id="reset-button"></button>
    `;

    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      attemptProgressElement: document.querySelector('#attempt-progress') as HTMLElement,
      resetButton: document.querySelector('#reset-button') as HTMLButtonElement,
    });

    hud.update({ distance: 12.3, bestDistance: 44.8, phase: 'flying', attemptNumber: 2, totalAttempts: 4 });

    expect(document.querySelector('#attempt-progress')?.textContent).toBe('Attempt 2 / 4');
  });
```

- [ ] **Step 2: Add failing overlay tests**

Create `src/ui/overlays.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRelayOverlays } from './overlays';
import type { AttemptResult } from '../session/multiplayer';

describe('relay overlays', () => {
  it('submits a normalized attempt count from the setup overlay', () => {
    document.body.innerHTML = `
      <section id="setup-overlay">
        <input id="attempt-count" value="12" />
        <button id="start-session-button"></button>
      </section>
      <section id="results-overlay" hidden>
        <tbody id="results-body"></tbody>
        <button id="play-again-button"></button>
      </section>
    `;
    const onStart = vi.fn();
    const overlays = createRelayOverlays({
      setupOverlay: document.querySelector('#setup-overlay') as HTMLElement,
      attemptCountInput: document.querySelector('#attempt-count') as HTMLInputElement,
      startButton: document.querySelector('#start-session-button') as HTMLButtonElement,
      resultsOverlay: document.querySelector('#results-overlay') as HTMLElement,
      resultsBody: document.querySelector('#results-body') as HTMLElement,
      playAgainButton: document.querySelector('#play-again-button') as HTMLButtonElement,
    });

    overlays.onStart(onStart);
    document.querySelector<HTMLButtonElement>('#start-session-button')?.click();

    expect(onStart).toHaveBeenCalledWith(10);
    expect((document.querySelector('#attempt-count') as HTMLInputElement).value).toBe('10');
  });

  it('renders sorted result rows and handles play again', () => {
    document.body.innerHTML = `
      <section id="setup-overlay">
        <input id="attempt-count" value="2" />
        <button id="start-session-button"></button>
      </section>
      <section id="results-overlay" hidden>
        <tbody id="results-body"></tbody>
        <button id="play-again-button"></button>
      </section>
    `;
    const overlays = createRelayOverlays({
      setupOverlay: document.querySelector('#setup-overlay') as HTMLElement,
      attemptCountInput: document.querySelector('#attempt-count') as HTMLInputElement,
      startButton: document.querySelector('#start-session-button') as HTMLButtonElement,
      resultsOverlay: document.querySelector('#results-overlay') as HTMLElement,
      resultsBody: document.querySelector('#results-body') as HTMLElement,
      playAgainButton: document.querySelector('#play-again-button') as HTMLButtonElement,
    });
    const onPlayAgain = vi.fn();
    const rows: AttemptResult[] = [
      { attemptNumber: 2, startDistance: 100, addedDistance: 60, score: 160 },
      { attemptNumber: 1, startDistance: 0, addedDistance: 100, score: 100 },
    ];

    overlays.showResults(rows);
    overlays.onPlayAgain(onPlayAgain);
    document.querySelector<HTMLButtonElement>('#play-again-button')?.click();

    expect(document.querySelector('#results-overlay')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#results-body')?.textContent).toContain('Attempt 2');
    expect(document.querySelector('#results-body')?.textContent).toContain('160 m');
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run tests and verify they fail**

Run: `npm run test -- src/ui/hud.test.ts src/ui/overlays.test.ts`

Expected: FAIL because HUD types and overlay module are not implemented.

- [ ] **Step 4: Implement HUD attempt progress**

In `src/ui/hud.ts`, extend types and update rendering:

```ts
export type HudElements = {
  distanceElement: HTMLElement;
  bestDistanceElement: HTMLElement;
  attemptProgressElement?: HTMLElement;
  resetButton: HTMLButtonElement;
};

export type HudState = {
  distance: number;
  bestDistance: number;
  phase: GamePhase;
  attemptNumber?: number;
  totalAttempts?: number;
};
```

Inside `update`:

```ts
      if (elements.attemptProgressElement) {
        elements.attemptProgressElement.textContent =
          state.attemptNumber && state.totalAttempts ? `Attempt ${state.attemptNumber} / ${state.totalAttempts}` : '';
      }
```

- [ ] **Step 5: Implement overlay adapter**

Create `src/ui/overlays.ts`:

```ts
import type { AttemptResult } from '../session/multiplayer';
import { normalizeAttemptCount } from '../session/multiplayer';

export type RelayOverlayElements = {
  setupOverlay: HTMLElement;
  attemptCountInput: HTMLInputElement;
  startButton: HTMLButtonElement;
  resultsOverlay: HTMLElement;
  resultsBody: HTMLElement;
  playAgainButton: HTMLButtonElement;
};

export type RelayOverlays = {
  showSetup: () => void;
  hideSetup: () => void;
  showResults: (results: AttemptResult[]) => void;
  hideResults: () => void;
  onStart: (handler: (attemptCount: number) => void) => void;
  onPlayAgain: (handler: () => void) => void;
};

export function createRelayOverlays(elements: RelayOverlayElements): RelayOverlays {
  return {
    showSetup: () => {
      elements.setupOverlay.hidden = false;
      elements.resultsOverlay.hidden = true;
      elements.attemptCountInput.focus();
      elements.attemptCountInput.select();
    },
    hideSetup: () => {
      elements.setupOverlay.hidden = true;
    },
    showResults: (results) => {
      elements.resultsBody.replaceChildren(...results.map(createResultRow));
      elements.resultsOverlay.hidden = false;
    },
    hideResults: () => {
      elements.resultsOverlay.hidden = true;
      elements.resultsBody.replaceChildren();
    },
    onStart: (handler) => {
      elements.startButton.addEventListener('click', () => {
        const attemptCount = normalizeAttemptCount(elements.attemptCountInput.value);
        elements.attemptCountInput.value = String(attemptCount);
        handler(attemptCount);
      });
    },
    onPlayAgain: (handler) => {
      elements.playAgainButton.addEventListener('click', handler);
    },
  };
}

function createResultRow(result: AttemptResult, index: number): HTMLTableRowElement {
  const row = document.createElement('tr');
  const values = [
    `${index + 1}`,
    `Attempt ${result.attemptNumber}`,
    `${Math.round(result.startDistance)} m`,
    `+${Math.round(result.addedDistance)} m`,
    `${Math.round(result.score)} m`,
  ];

  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }

  return row;
}
```

- [ ] **Step 6: Add DOM and CSS**

Update `index.html` HUD stats:

```html
<div class="hud__stats">
  <span id="distance">0 m</span>
  <span id="best-distance">Best 0 m</span>
  <span id="attempt-progress"></span>
</div>
```

Add overlays inside `#app` after `#message`:

```html
<section id="setup-overlay" class="overlay" aria-labelledby="setup-title">
  <div class="overlay__panel">
    <h1 id="setup-title">Penguin Shoot</h1>
    <label class="field">
      <span>Attempts</span>
      <input id="attempt-count" type="number" min="1" max="10" step="1" value="2" inputmode="numeric" />
    </label>
    <button id="start-session-button" class="primary-button" type="button">Start</button>
  </div>
</section>
<section id="results-overlay" class="overlay" aria-labelledby="results-title" hidden>
  <div class="overlay__panel overlay__panel--wide">
    <h1 id="results-title">Results</h1>
    <div class="results-table-wrap">
      <table class="results-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Attempt</th>
            <th>Start</th>
            <th>Added</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody id="results-body"></tbody>
      </table>
    </div>
    <button id="play-again-button" class="primary-button" type="button">Play Again</button>
  </div>
</section>
```

Add compact overlay styles to `src/styles.css` with 8px radii, responsive widths, and no nested card styling:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(16, 37, 50, 0.38);
}

.overlay[hidden] {
  display: none;
}

.overlay__panel {
  width: min(360px, 100%);
  padding: 18px;
  border: 1px solid rgba(13, 51, 67, 0.16);
  border-radius: 8px;
  background: rgba(248, 253, 255, 0.96);
  box-shadow: 0 18px 38px rgba(24, 84, 110, 0.22);
}

.overlay__panel--wide {
  width: min(620px, 100%);
}
```

Also style `h1`, `.field`, `.primary-button`, `.results-table-wrap`, and `.results-table` consistently with existing colors.

- [ ] **Step 7: Run UI tests**

Run: `npm run test -- src/ui/hud.test.ts src/ui/overlays.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit UI layer**

```bash
git add index.html src/styles.css src/ui/hud.ts src/ui/hud.test.ts src/ui/overlays.ts src/ui/overlays.test.ts
git commit -m "feat: add relay setup and results UI"
```

---

### Task 4: Main Integration And Browser Smoke

**Files:**
- Modify: `src/main.ts`
- Modify: `src/main.test.ts`
- Modify: `tests/playwright/penguin-shoot.spec.ts`

- [ ] **Step 1: Update main test DOM and mocks**

In `src/main.test.ts`, update the test DOM in `bootApp()` to include all required nodes:

```ts
document.body.innerHTML = `
  <div id="app">
    <canvas id="game-canvas"></canvas>
    <span id="distance"></span>
    <span id="best-distance"></span>
    <span id="attempt-progress"></span>
    <button id="reset-button" type="button"></button>
    <div id="message" hidden></div>
    <section id="setup-overlay">
      <input id="attempt-count" value="1" />
      <button id="start-session-button" type="button"></button>
    </section>
    <section id="results-overlay" hidden>
      <tbody id="results-body"></tbody>
      <button id="play-again-button" type="button"></button>
    </section>
  </div>
`;
```

Add `startDistance: 0` to the mocked `state`.

- [ ] **Step 2: Add failing startup-block test**

Add to `src/main.test.ts`:

```ts
  it('blocks launching until a relay session starts', async () => {
    const app = await bootApp();

    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 3, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 3, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 3, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).not.toHaveBeenCalled();

    document.querySelector<HTMLButtonElement>('#start-session-button')?.click();
    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 4, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 4, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 4, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 3: Run tests and verify they fail**

Run: `npm run test -- src/main.test.ts`

Expected: FAIL because `main.ts` does not require a session yet.

- [ ] **Step 4: Wire session and overlays in main**

In `src/main.ts`, query these elements and include them in the required DOM guard:

```ts
const attemptProgressElement = document.querySelector<HTMLElement>('#attempt-progress');
const setupOverlay = document.querySelector<HTMLElement>('#setup-overlay');
const attemptCountInput = document.querySelector<HTMLInputElement>('#attempt-count');
const startSessionButton = document.querySelector<HTMLButtonElement>('#start-session-button');
const resultsOverlay = document.querySelector<HTMLElement>('#results-overlay');
const resultsBody = document.querySelector<HTMLElement>('#results-body');
const playAgainButton = document.querySelector<HTMLButtonElement>('#play-again-button');
```

Import and instantiate session/UI helpers:

```ts
import {
  createRelaySession,
  getCurrentAttempt,
  getSortedResults,
  recordAttempt,
  type RelaySession,
} from './session/multiplayer';
import { createRelayOverlays } from './ui/overlays';
```

Create local state:

```ts
let session: RelaySession | null = null;
let recordedSettledAttempt = false;
```

Start sessions:

```ts
overlays.onStart((attemptCount) => {
  session = createRelaySession(attemptCount);
  recordedSettledAttempt = false;
  overlays.hideSetup();
  overlays.hideResults();
  resetGame(state, 0);
  hud.update(getHudState());
});
```

Gate pointer input with `canPlay()`:

```ts
function canPlay(): boolean {
  return isRunning && session?.status === 'playing';
}
```

Use `canPlay()` in pointerdown, pointermove, and pointerup guards.

Handle settled frames in `frame()`:

```ts
  if (state.phase === 'settled') {
    bestDistanceStore.save(state.bestDistance);
    handleSettledAttempt();
  }
```

Add:

```ts
function handleSettledAttempt(): void {
  if (!session || recordedSettledAttempt) {
    return;
  }

  recordedSettledAttempt = true;
  recordAttempt(session, state.distance);

  if (session.status === 'complete') {
    overlays.showResults(getSortedResults(session));
    hud.update(getHudState());
    return;
  }

  const nextAttempt = getCurrentAttempt(session);
  if (nextAttempt) {
    resetGame(state, nextAttempt.startDistance);
    recordedSettledAttempt = false;
  }
}
```

Reset current attempt:

```ts
hud.onReset(() => {
  const currentAttempt = session ? getCurrentAttempt(session) : null;
  resetGame(state, currentAttempt?.startDistance ?? 0);
  recordedSettledAttempt = false;
  hud.update(getHudState());
});
```

Play again:

```ts
overlays.onPlayAgain(() => {
  session = null;
  recordedSettledAttempt = false;
  overlays.hideResults();
  resetGame(state, 0);
  overlays.showSetup();
  hud.update(getHudState());
});
```

Use a helper for HUD state:

```ts
function getHudState(): Parameters<typeof hud.update>[0] {
  const currentAttempt = session ? getCurrentAttempt(session) : null;
  return {
    ...state,
    attemptNumber: currentAttempt?.attemptNumber,
    totalAttempts: session?.totalAttempts,
  };
}
```

- [ ] **Step 5: Update Playwright smoke**

In `tests/playwright/penguin-shoot.spec.ts`, before launch actions in existing tests:

```ts
await page.locator('#attempt-count').fill('2');
await page.locator('#start-session-button').click();
await expect(page.locator('#setup-overlay')).toBeHidden();
await expect(page.locator('#attempt-progress')).toHaveText('Attempt 1 / 2');
```

Add a one-attempt result test:

```ts
test('shows sorted results after the configured attempts finish', async ({ page }) => {
  await page.goto('/');
  await page.locator('#attempt-count').fill('1');
  await page.locator('#start-session-button').click();

  const canvas = page.locator('#game-canvas');
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

  await expect(page.locator('#results-overlay')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#results-body')).toContainText('Attempt 1');
});
```

- [ ] **Step 6: Run focused tests**

Run: `npm run test -- src/session/multiplayer.test.ts src/simulation/game.test.ts src/ui/hud.test.ts src/ui/overlays.test.ts src/main.test.ts`

Expected: PASS.

- [ ] **Step 7: Run full verification**

Run:

```bash
npm run test
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 8: Commit integration**

```bash
git add src/main.ts src/main.test.ts tests/playwright/penguin-shoot.spec.ts
git commit -m "feat: add multiplayer relay flow"
```

---

## Self-Review

- Spec coverage: setup overlay, 1-10 attempt count, attempt-number labels, cumulative starts, per-attempt result storage, score-desc results, reset edge case, duplicate settled-frame prevention, and browser verification are each mapped to tasks.
- Placeholder scan: no `TBD`, `TODO`, "implement later", or unnamed edge handling steps remain.
- Type consistency: `RelaySession`, `AttemptResult`, `CurrentAttempt`, `normalizeAttemptCount`, `recordAttempt`, `getCurrentAttempt`, `getNextStartDistance`, and `getSortedResults` are introduced in Task 1 and reused consistently in later tasks.
