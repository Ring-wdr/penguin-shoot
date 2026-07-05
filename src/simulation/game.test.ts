import { describe, expect, it } from 'vitest';
import {
  LAUNCHER_POSITION,
  createMapItems,
  createGameState,
  launchPenguin,
  predictTrajectory,
  resetGame,
  stepGame,
} from './game';
import type { GameState } from './game';

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

  it('consumes larger deltas through deterministic substeps', () => {
    const oneLargeStep = createGameState(0, []);
    const twoSmallerSteps = createGameState(0, []);
    launchPenguin(oneLargeStep, { x: 12, y: 8 });
    launchPenguin(twoSmallerSteps, { x: 12, y: 8 });

    stepGame(oneLargeStep, 0.2);
    stepGame(twoSmallerSteps, 0.1);
    stepGame(twoSmallerSteps, 0.1);

    expectStateToBeClose(oneLargeStep, twoSmallerSteps);
  });

  it('stops consuming a large delta once the penguin settles', () => {
    const oneLargeStep = createGameState(0, []);
    const frameSteps = createGameState(0, []);
    launchPenguin(oneLargeStep, { x: 10, y: 8 });
    launchPenguin(frameSteps, { x: 10, y: 8 });

    stepGame(oneLargeStep, 20);
    for (let i = 0; i < 600; i += 1) {
      stepGame(frameSteps, 1 / 30);
    }

    expect(oneLargeStep.phase).toBe('settled');
    expectStateToBeClose(oneLargeStep, frameSteps);
  });

  it('bounces on the ground and eventually settles', () => {
    const state = createGameState(0, []);
    launchPenguin(state, { x: 10, y: 8 });

    for (let i = 0; i < 700; i += 1) {
      stepGame(state, 1 / 60);
    }

    expect(state.phase).toBe('settled');
    expect(state.position.y).toBe(0);
    expect(state.velocity).toEqual({ x: 0, y: 0 });
    expect(state.distance).toBeGreaterThan(5);
    expect(state.bestDistance).toBe(state.distance);
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
    const snapshot = {
      ...state,
      position: { ...state.position },
      velocity: { ...state.velocity },
    };
    const points = predictTrajectory(state, { x: 12, y: 8 }, 8);

    expect(points).toHaveLength(8);
    expect(points[0].x).toBeGreaterThanOrEqual(LAUNCHER_POSITION.x);
    expect(points.some((point) => point.y > LAUNCHER_POSITION.y)).toBe(true);
    expect(state).toEqual(snapshot);
  });

  it('places map items with enough space to avoid stacked pickups', () => {
    const items = createMapItems(1234);

    const fixedOrder = ['ice-bomb', 'cannon-cave', 'geyser-vent', 'headwind-turbine', 'jelly-wall', 'snow-tornado'];
    expect([...items.map((item) => item.type)].sort()).toEqual([...fixedOrder].sort());
    expect(items.map((item) => item.type)).not.toEqual(fixedOrder);

    for (let index = 1; index < items.length; index += 1) {
      expect(items[index].position.x - items[index - 1].position.x).toBeGreaterThanOrEqual(9);
    }
  });

  it('uses seed-driven variation for item order and spacing', () => {
    const first = createMapItems(1234);
    const second = createMapItems(1235);

    expect(first.map((item) => item.type)).not.toEqual(second.map((item) => item.type));
    expect(getRoundedGaps(first)).not.toEqual(getRoundedGaps(second));
    expect(new Set(getRoundedGaps(first)).size).toBeGreaterThan(2);
  });

  it('generates more map items ahead during long-distance runs', () => {
    const state = createGameState(0, createMapItems(1234));
    state.phase = 'flying';
    state.position = { x: 135, y: 1 };
    state.velocity = { x: 15, y: 0 };

    stepGame(state, 1 / 60);

    expect(state.mapItems.length).toBeGreaterThan(6);
    expect(Math.max(...state.mapItems.map((item) => item.position.x))).toBeGreaterThan(190);
    for (let index = 1; index < state.mapItems.length; index += 1) {
      expect(state.mapItems[index].position.x - state.mapItems[index - 1].position.x).toBeGreaterThanOrEqual(9);
    }

    expect(state.mapItems.slice(6, 12).map((item) => item.type)).not.toEqual(state.mapItems.slice(0, 6).map((item) => item.type));
  });

  it('ice bomb launches the penguin forward and upward once', () => {
    const state = createGameState(0, [
      { id: 'bomb-test', type: 'ice-bomb', position: { x: 2, y: 0 }, radius: 0.9, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 1.85, y: 0 };
    state.velocity = { x: 4, y: -1 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeGreaterThan(14);
    expect(state.velocity.y).toBeGreaterThan(9);
    expect(state.mapItems[0].consumed).toBe(true);

    const velocityAfterBlast = { ...state.velocity };
    state.position = { x: 1.9, y: 0 };
    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeLessThanOrEqual(velocityAfterBlast.x);
  });

  it('cannon ice cave fires the penguin at a fixed forward arc once', () => {
    const state = createGameState(0, [
      { id: 'cannon-test', type: 'cannon-cave', position: { x: 3, y: 0 }, radius: 1, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 2.9, y: 0.1 };
    state.velocity = { x: 3, y: -2 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeCloseTo(24, 1);
    expect(state.velocity.y).toBeCloseTo(10, 1);
    expect(state.mapItems[0].consumed).toBe(true);

    state.position = { x: 2.95, y: 0.1 };
    state.velocity = { x: 5, y: 0 };
    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeLessThan(24);
  });

  it('geyser vent blasts the penguin upward without stealing forward speed', () => {
    const state = createGameState(0, [
      { id: 'geyser-test', type: 'geyser-vent', position: { x: 4, y: 0 }, radius: 0.9, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 3.95, y: 0 };
    state.velocity = { x: 8, y: -3 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeGreaterThan(7.8);
    expect(state.velocity.y).toBeGreaterThan(15);
    expect(state.mapItems[0].consumed).toBe(true);
  });

  it('headwind turbine slows forward velocity without being consumed', () => {
    const state = createGameState(0, [
      { id: 'turbine-test', type: 'headwind-turbine', position: { x: 5, y: 0.6 }, radius: 1.6, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 5, y: 0.55 };
    state.velocity = { x: 12, y: 1 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeLessThan(10);
    expect(state.velocity.y).toBeLessThan(1);
    expect(state.mapItems[0].consumed).toBe(false);
  });

  it('jelly wall absorbs a collision and nudges the penguin away once', () => {
    const state = createGameState(0, [
      { id: 'jelly-test', type: 'jelly-wall', position: { x: 6, y: 0.4 }, radius: 0.8, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 5.95, y: 0.35 };
    state.velocity = { x: 18, y: 2 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeLessThan(6);
    expect(state.velocity.y).toBeGreaterThan(3);
    expect(state.position.x).toBeLessThan(6);
    expect(state.mapItems[0].consumed).toBe(true);
  });

  it('snow tornado lifts and swirls the penguin once', () => {
    const state = createGameState(0, [
      { id: 'tornado-test', type: 'snow-tornado', position: { x: 8, y: 0.6 }, radius: 1.5, consumed: false },
    ]);
    state.phase = 'flying';
    state.position = { x: 7.9, y: 0.55 };
    state.velocity = { x: 10, y: -1 };

    stepGame(state, 1 / 60);

    expect(state.velocity.x).toBeGreaterThan(12);
    expect(state.velocity.y).toBeGreaterThan(11);
    expect(state.position.y).toBeGreaterThan(1);
    expect(state.mapItems[0].consumed).toBe(true);
  });
});

function expectStateToBeClose(actual: GameState, expected: GameState): void {
  expect(actual.phase).toBe(expected.phase);
  expect(actual.position.x).toBeCloseTo(expected.position.x, 5);
  expect(actual.position.y).toBeCloseTo(expected.position.y, 5);
  expect(actual.velocity.x).toBeCloseTo(expected.velocity.x, 5);
  expect(actual.velocity.y).toBeCloseTo(expected.velocity.y, 5);
  expect(actual.distance).toBeCloseTo(expected.distance, 5);
  expect(actual.bestDistance).toBeCloseTo(expected.bestDistance, 5);
  expect(actual.flightTime).toBeCloseTo(expected.flightTime, 5);
  expect(actual.lastImpactTime).toBeCloseTo(expected.lastImpactTime, 5);
}

function getRoundedGaps(items: { position: { x: number } }[]): number[] {
  return items.slice(1).map((item, index) => Number((item.position.x - items[index].position.x).toFixed(1)));
}
