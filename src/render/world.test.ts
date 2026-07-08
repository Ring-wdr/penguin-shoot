import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { LAUNCHER_POSITION } from '../simulation/game';
import {
  applyCameraFocus,
  calculateCameraBounds,
  calculateCameraTargetX,
  calculateTransitionedCameraX,
  calculateWorldChunkCenters,
  createMapItemVisual,
  createTrajectoryPoints,
  shouldRebuildLineGeometry,
} from './world';
import type { MapItem } from '../simulation/game';

describe('render world helpers', () => {
  it('frames the launcher on the left side before the penguin moves forward', () => {
    expect(calculateCameraTargetX(-1)).toBe(6);
    expect(calculateCameraTargetX(LAUNCHER_POSITION.x)).toBe(6);
  });

  it('follows forward progress with a readable lead', () => {
    expect(calculateCameraTargetX(20)).toBe(14);
  });

  it('eases camera transition toward the next attempt framing', () => {
    expect(calculateTransitionedCameraX(10, 30, 0, 520, false)).toBe(10);
    expect(calculateTransitionedCameraX(10, 30, 260, 520, false)).toBeGreaterThan(29);
    expect(calculateTransitionedCameraX(10, 30, 520, 520, false)).toBe(30);
  });

  it('snaps camera transition when reduced motion is requested', () => {
    expect(calculateTransitionedCameraX(10, 30, 0, 520, true)).toBe(30);
  });

  it('keeps the launcher visible in narrow mobile framing', () => {
    expect(calculateCameraTargetX(LAUNCHER_POSITION.x, 5.5)).toBeCloseTo(1.38, 2);
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

  it('generates enough world chunks to cover far camera positions', () => {
    const chunks = calculateWorldChunkCenters(174, 25);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((center) => center - 60 <= 174 && center + 60 >= 174)).toBe(true);
    expect(chunks.some((center) => center + 60 >= 230)).toBe(true);
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

  it('creates recognizable map item visuals at their simulation positions', () => {
    const item: MapItem = {
      id: 'bomb-visual',
      type: 'ice-bomb',
      position: { x: 12, y: 0 },
      radius: 0.9,
      consumed: false,
    };

    const visual = createMapItemVisual(item);

    expect(visual.name).toBe('map-item-ice-bomb');
    expect(visual.position.x).toBe(12);
    expect(visual.position.y).toBe(0);
    expect(visual.children.length).toBeGreaterThan(0);
    expect(visual.visible).toBe(true);
  });

  it('fades consumed map item visuals without hiding persistent fields', () => {
    const consumedBomb = createMapItemVisual({
      id: 'spent-bomb',
      type: 'ice-bomb',
      position: { x: 4, y: 0 },
      radius: 0.9,
      consumed: true,
    });
    const turbine = createMapItemVisual({
      id: 'turbine',
      type: 'headwind-turbine',
      position: { x: 8, y: 0 },
      radius: 1.4,
      consumed: false,
    });

    expect(consumedBomb.visible).toBe(false);
    expect(turbine.visible).toBe(true);
  });
});
