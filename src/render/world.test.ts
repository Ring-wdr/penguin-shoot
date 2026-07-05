import { describe, expect, it } from 'vitest';
import { LAUNCHER_POSITION } from '../simulation/game';
import {
  calculateCameraBounds,
  calculateCameraTargetX,
  createTrajectoryPoints,
  shouldRebuildLineGeometry,
} from './world';

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

  it('preserves narrow canvas aspect in camera bounds', () => {
    const bounds = calculateCameraBounds(320, 800);
    const worldWidth = bounds.right - bounds.left;
    const worldHeight = bounds.top - bounds.bottom;

    expect(worldWidth / worldHeight).toBeCloseTo(0.4, 5);
  });

  it('skips line geometry rebuilds while hidden or unchanged', () => {
    const previous = [
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 2, z: 0 },
    ];

    expect(shouldRebuildLineGeometry(previous, [{ x: 9, y: 9, z: 0 }], false)).toBe(false);
    expect(shouldRebuildLineGeometry(previous, previous, true)).toBe(false);
    expect(shouldRebuildLineGeometry(previous, [{ x: 0, y: 1, z: 0 }], true)).toBe(true);
  });
});
