import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LAUNCHER_POSITION } from '../simulation/game';
import {
  applyCameraFocus,
  calculateCameraBounds,
  calculateCameraTargetX,
  createTrajectoryPoints,
  shouldRebuildLineGeometry,
} from './world';

describe('render world helpers', () => {
  it('frames the launcher on the left side before the penguin moves forward', () => {
    expect(calculateCameraTargetX(-1)).toBe(6);
    expect(calculateCameraTargetX(LAUNCHER_POSITION.x)).toBe(6);
  });

  it('follows forward progress with a readable lead', () => {
    expect(calculateCameraTargetX(20)).toBe(14);
  });

  it('projects the ground into the lower part of the viewport', () => {
    const bounds = calculateCameraBounds(1280, 720);
    const camera = new THREE.OrthographicCamera(bounds.left, bounds.right, bounds.top, bounds.bottom, 0.1, 200);
    camera.position.set(calculateCameraTargetX(LAUNCHER_POSITION.x), 5.5, 14);
    applyCameraFocus(camera, camera.position.x);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    const groundScreenY = (1 - new THREE.Vector3(LAUNCHER_POSITION.x, 0, 0).project(camera).y) / 2;

    expect(groundScreenY).toBeGreaterThan(0.8);
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

  it('uses a pulled-back view to show more of the playfield at once', () => {
    const bounds = calculateCameraBounds(1280, 720);
    const worldWidth = bounds.right - bounds.left;
    const worldHeight = bounds.top - bounds.bottom;

    expect(worldHeight).toBe(14);
    expect(worldWidth).toBeGreaterThan(24);
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
