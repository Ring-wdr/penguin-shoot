import { describe, expect, it } from 'vitest';
import { createPointerAim, getLaunchVector } from './pointerAim';

describe('pointer aim model', () => {
  it('starts inactive with zero vector', () => {
    const aim = createPointerAim();

    expect(aim.isDragging).toBe(false);
    expect(aim.dragVector).toEqual({ x: 0, y: 0 });
  });

  it('maps DOM screen-space y-down drag into simulation y-up launch vector', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(60, 130, 1);

    expect(aim.isDragging).toBe(true);
    expect(aim.dragVector).toEqual({ x: -40, y: 30 });
    // Screen-space y increases downward; simulation y increases upward, so only x is negated.
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

  it('ignores a second start while dragging with the active pointer', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 7);
    aim.start(40, 30, 8);
    aim.move(80, 100, 7);

    expect(aim.pointerId).toBe(7);
    expect(aim.startPoint).toEqual({ x: 100, y: 100 });
    expect(aim.dragVector).toEqual({ x: -20, y: 0 });
  });

  it('returns null for wrong-pointer release and keeps the active drag', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 7);
    aim.move(75, 80, 7);
    const launch = aim.end(8);

    expect(launch).toBeNull();
    expect(aim.isDragging).toBe(true);
    expect(aim.pointerId).toBe(7);
    expect(aim.dragVector).toEqual({ x: -25, y: -20 });
  });

  it('returns launch vector on release and clears active pointer', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(75, 80, 1);
    const launch = aim.end(1);

    expect(launch).toEqual({ x: 7.5, y: -6 });
    expect(aim.isDragging).toBe(false);
    expect(aim.pointerId).toBeNull();
    expect(aim.startPoint).toEqual({ x: 0, y: 0 });
    expect(aim.currentPoint).toEqual({ x: 0, y: 0 });
    expect(aim.dragVector).toEqual({ x: 0, y: 0 });
  });

  it('does not clear active drag when cancel comes from the wrong pointer', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 7);
    aim.move(60, 100, 7);
    aim.cancel(8);

    expect(aim.isDragging).toBe(true);
    expect(aim.pointerId).toBe(7);
    expect(aim.dragVector).toEqual({ x: -40, y: 0 });
  });

  it('cancels without producing a launch vector', () => {
    const aim = createPointerAim();

    aim.start(100, 100, 1);
    aim.move(60, 100, 1);
    aim.cancel(1);

    expect(aim.isDragging).toBe(false);
    expect(aim.pointerId).toBeNull();
    expect(aim.startPoint).toEqual({ x: 0, y: 0 });
    expect(aim.currentPoint).toEqual({ x: 0, y: 0 });
    expect(aim.dragVector).toEqual({ x: 0, y: 0 });
    expect(getLaunchVector(aim)).toEqual({ x: 0, y: 0 });
  });
});
