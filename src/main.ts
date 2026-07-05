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
  if (launch) {
    launchPenguin(state, launch);
  }
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
