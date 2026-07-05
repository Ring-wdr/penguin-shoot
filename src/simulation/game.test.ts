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
