import './styles.css';
import { createPointerAim, getLaunchVector } from './input/pointerAim';
import { createRenderWorld } from './render/world';
import {
  createGameState,
  launchPenguin,
  predictTrajectory,
  resetGame,
  stepGame,
  type Vec2,
} from './simulation/game';
import {
  createRelaySession,
  getCurrentAttempt,
  getSortedResults,
  recordAttempt,
  type RelaySession,
} from './session/multiplayer';
import { createBestDistanceStore, createHud } from './ui/hud';
import { createRelayOverlays } from './ui/overlays';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const distanceElement = document.querySelector<HTMLElement>('#distance');
const bestDistanceElement = document.querySelector<HTMLElement>('#best-distance');
const attemptProgressElement = document.querySelector<HTMLElement>('#attempt-progress');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-button');
const message = document.querySelector<HTMLElement>('#message');
const setupOverlay = document.querySelector<HTMLElement>('#setup-overlay');
const attemptCountInput = document.querySelector<HTMLInputElement>('#attempt-count');
const startSessionButton = document.querySelector<HTMLButtonElement>('#start-session-button');
const resultsOverlay = document.querySelector<HTMLElement>('#results-overlay');
const resultsBody = document.querySelector<HTMLElement>('#results-body');
const playAgainButton = document.querySelector<HTMLButtonElement>('#play-again-button');

if (
  !canvas ||
  !distanceElement ||
  !bestDistanceElement ||
  !attemptProgressElement ||
  !resetButton ||
  !message ||
  !setupOverlay ||
  !attemptCountInput ||
  !startSessionButton ||
  !resultsOverlay ||
  !resultsBody ||
  !playAgainButton
) {
  throw new Error('Penguin Shoot could not find required DOM elements.');
}

const bestDistanceStore = createBestDistanceStore('penguin-shoot:best-distance');
const state = createGameState(bestDistanceStore.load());
const aim = createPointerAim();
const hud = createHud({ distanceElement, bestDistanceElement, attemptProgressElement, resetButton });
const overlays = createRelayOverlays({
  setupOverlay,
  attemptCountInput,
  startButton: startSessionButton,
  resultsOverlay,
  resultsBody,
  playAgainButton,
});
const world = createRenderWorld(canvas);

let lastFrameTime = performance.now();
let animationFrame = 0;
let isRunning = true;
let isWorldDisposed = false;
let session: RelaySession | null = null;
let recordedSettledAttempt = false;

hud.onReset(() => {
  const currentAttempt = session ? getCurrentAttempt(session) : null;
  resetGame(state, currentAttempt?.startDistance ?? 0);
  recordedSettledAttempt = false;
  hud.update(getHudState());
});

overlays.onStart((attemptCount) => {
  session = createRelaySession(attemptCount);
  recordedSettledAttempt = false;
  overlays.hideSetup();
  overlays.hideResults();
  resetGame(state, 0);
  hud.update(getHudState());
});

overlays.onPlayAgain(() => {
  session = null;
  recordedSettledAttempt = false;
  overlays.hideResults();
  resetGame(state, 0);
  overlays.showSetup();
  hud.update(getHudState());
});

canvas.addEventListener('pointerdown', (event) => {
  if (!canPlay() || state.phase !== 'aiming') {
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  aim.start(event.clientX, event.clientY, event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!canPlay() || !aim.isDragging) {
    return;
  }

  aim.move(event.clientX, event.clientY, event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointerup', (event) => {
  if (!canPlay() || !aim.isDragging) {
    return;
  }

  const launch = aim.end(event.pointerId);
  if (launch) {
    launchPenguin(state, launch);
  }
  event.preventDefault();
});

canvas.addEventListener('pointercancel', (event) => {
  aim.cancel(event.pointerId);
});

canvas.addEventListener('lostpointercapture', (event) => {
  aim.cancel(event.pointerId);
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  message.hidden = false;
  message.textContent = 'WebGL context lost. Reload the page to restart the prototype.';
  shutdown();
});

window.addEventListener('resize', () => {
  if (!isRunning) {
    return;
  }

  world.resize();
});

window.addEventListener('blur', () => {
  cancelActiveAim();
});

function frame(now: number): void {
  if (!isRunning) {
    return;
  }

  const deltaSeconds = Math.min((now - lastFrameTime) / 1000, 0.05);
  lastFrameTime = now;

  stepGame(state, deltaSeconds);
  if (state.phase === 'settled') {
    bestDistanceStore.save(state.bestDistance);
    handleSettledAttempt();
  }

  const launchVector = getLaunchVector(aim);
  const trajectory = state.phase === 'aiming' && aim.isDragging ? predictTrajectory(state, launchVector, 24) : [];
  const aimEnd = aim.isDragging ? screenDragToWorldEnd(aim.dragVector) : null;
  const aimStart = aim.isDragging ? { ...state.position } : null;

  world.update(state, trajectory, aimStart, aimEnd);
  hud.update(getHudState());
  if (isRunning) {
    animationFrame = requestAnimationFrame(frame);
  }
}

function screenDragToWorldEnd(dragVector: Vec2): Vec2 {
  return {
    x: state.position.x + dragVector.x / 70,
    y: state.position.y - dragVector.y / 70,
  };
}

animationFrame = requestAnimationFrame(frame);
hud.update(getHudState());

window.addEventListener('beforeunload', () => {
  shutdown();
});

function cancelActiveAim(): void {
  if (aim.pointerId !== null) {
    aim.cancel(aim.pointerId);
  }
}

function canPlay(): boolean {
  return isRunning && session?.status === 'playing' && !world.isCameraTransitioning();
}

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
    world.transitionCameraToPenguin(state);
    recordedSettledAttempt = false;
  }
}

function getHudState(): Parameters<typeof hud.update>[0] {
  const currentAttempt = session ? getCurrentAttempt(session) : null;
  return {
    ...state,
    attemptNumber: currentAttempt?.attemptNumber,
    totalAttempts: session?.totalAttempts,
  };
}

function shutdown(): void {
  if (!isRunning && isWorldDisposed) {
    return;
  }

  isRunning = false;
  cancelAnimationFrame(animationFrame);
  if (!isWorldDisposed) {
    isWorldDisposed = true;
    world.dispose();
  }
}
