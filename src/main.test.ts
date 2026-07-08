import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, Vec2 } from './simulation/game';

type FrameCallback = (time: number) => void;

type BootContext = {
  canvas: HTMLCanvasElement;
  cancelAnimationFrame: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  frameCallbacks: Map<number, FrameCallback>;
  isCameraTransitioning: ReturnType<typeof vi.fn>;
  launchPenguin: ReturnType<typeof vi.fn>;
  resetGame: ReturnType<typeof vi.fn>;
  state: GameState;
  transitionCameraToPenguin: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

describe('main app integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('stops the animation loop and skips rendering after WebGL context loss', async () => {
    const app = await bootApp();
    const firstFrame = app.frameCallbacks.get(1);
    expect(firstFrame).toBeDefined();

    const contextLost = new Event('webglcontextlost', { cancelable: true });
    app.canvas.dispatchEvent(contextLost);
    firstFrame?.(16);

    expect(contextLost.defaultPrevented).toBe(true);
    expect(document.querySelector('#message')?.textContent).toBe(
      'WebGL context lost. Reload the page to restart the prototype.',
    );
    expect(app.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(app.dispose).toHaveBeenCalledTimes(1);
    expect(app.update).not.toHaveBeenCalled();

    expect(() => app.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))).not.toThrow();
    expect(app.dispose).toHaveBeenCalledTimes(1);
  });

  it('cancels aiming when pointer capture is lost before release', async () => {
    const app = await bootApp();

    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 7, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 7, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'lostpointercapture', { pointerId: 7, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 7, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).not.toHaveBeenCalled();
  });

  it('cancels active aiming when the window loses focus', async () => {
    const app = await bootApp();

    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 9, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 9, clientX: 60, clientY: 130 });
    window.dispatchEvent(new Event('blur'));
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 9, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).not.toHaveBeenCalled();
  });

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

  it('blocks launching while the camera moves to the next relay attempt', async () => {
    const app = await bootApp();
    document.querySelector<HTMLInputElement>('#attempt-count')!.value = '2';
    document.querySelector<HTMLButtonElement>('#start-session-button')?.click();

    app.state.phase = 'settled';
    app.state.distance = 100;
    app.frameCallbacks.get(1)?.(16);

    expect(app.transitionCameraToPenguin).toHaveBeenCalledTimes(1);
    expect(app.resetGame).toHaveBeenLastCalledWith(app.state, 100);

    app.isCameraTransitioning.mockReturnValue(true);
    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 5, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 5, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 5, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).not.toHaveBeenCalled();

    app.isCameraTransitioning.mockReturnValue(false);
    dispatchPointerEvent(app.canvas, 'pointerdown', { pointerId: 6, clientX: 100, clientY: 100 });
    dispatchPointerEvent(app.canvas, 'pointermove', { pointerId: 6, clientX: 60, clientY: 130 });
    dispatchPointerEvent(app.canvas, 'pointerup', { pointerId: 6, clientX: 60, clientY: 130 });

    expect(app.launchPenguin).toHaveBeenCalledTimes(1);
  });
});

async function bootApp(): Promise<BootContext> {
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
        <table>
          <tbody id="results-body"></tbody>
        </table>
        <button id="play-again-button" type="button"></button>
      </section>
    </div>
  `;

  const frameCallbacks = new Map<number, FrameCallback>();
  let nextFrameId = 1;
  const requestAnimationFrame = vi.fn((callback: FrameCallback) => {
    const frameId = nextFrameId;
    nextFrameId += 1;
    frameCallbacks.set(frameId, callback);
    return frameId;
  });
  const cancelAnimationFrame = vi.fn((frameId: number) => {
    frameCallbacks.delete(frameId);
  });

  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame);
  vi.stubGlobal('performance', { now: () => 0 });

  Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });

  const state: GameState = {
    phase: 'aiming',
    position: { x: 0, y: 1.1 },
    velocity: { x: 0, y: 0 },
    distance: 0,
    startDistance: 0,
    bestDistance: 0,
    flightTime: 0,
    lastImpactTime: -1,
    mapItems: [],
  };
  const update = vi.fn();
  const dispose = vi.fn();
  const transitionCameraToPenguin = vi.fn();
  const isCameraTransitioning = vi.fn(() => false);
  const launchPenguin = vi.fn((gameState: GameState, launch: Vec2) => {
    gameState.phase = 'flying';
    gameState.velocity = launch;
  });
  const resetGame = vi.fn((gameState: GameState, startDistance = 0) => {
    gameState.phase = 'aiming';
    gameState.position = { x: startDistance, y: 1.1 };
    gameState.distance = startDistance;
    gameState.startDistance = startDistance;
  });

  vi.doMock('./render/world', () => ({
    createRenderWorld: vi.fn(() => ({
      update,
      transitionCameraToPenguin,
      isCameraTransitioning,
      resize: vi.fn(),
      dispose,
    })),
  }));
  vi.doMock('./simulation/game', () => ({
    LAUNCHER_POSITION: { x: 0, y: 1.1 },
    createGameState: vi.fn(() => state),
    launchPenguin,
    predictTrajectory: vi.fn(() => []),
    resetGame,
    stepGame: vi.fn(),
  }));
  vi.doMock('./ui/hud', () => ({
    createBestDistanceStore: vi.fn(() => ({
      load: vi.fn(() => 0),
      save: vi.fn(),
    })),
    createHud: vi.fn(() => ({
      update: vi.fn(),
      onReset: vi.fn(),
    })),
  }));

  await import('./main');

  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) {
    throw new Error('Test did not create the game canvas.');
  }

  return {
    canvas,
    cancelAnimationFrame,
    dispose,
    frameCallbacks,
    isCameraTransitioning,
    launchPenguin,
    resetGame,
    state,
    transitionCameraToPenguin,
    update,
  };
}

function dispatchPointerEvent(target: EventTarget, type: string, init: Partial<PointerEvent>): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.assign(event, init);
  target.dispatchEvent(event);
}
