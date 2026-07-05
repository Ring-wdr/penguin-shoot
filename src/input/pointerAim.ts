import type { Vec2 } from '../simulation/game';

export type PointerAimOptions = {
  maxDragPixels: number;
  pixelsToVelocity: number;
};

export type PointerAim = {
  isDragging: boolean;
  pointerId: number | null;
  startPoint: Vec2;
  currentPoint: Vec2;
  dragVector: Vec2;
  options: PointerAimOptions;
  start: (x: number, y: number, pointerId: number) => void;
  move: (x: number, y: number, pointerId: number) => void;
  end: (pointerId: number) => Vec2 | null;
  cancel: (pointerId: number) => void;
};

const DEFAULT_OPTIONS: PointerAimOptions = {
  maxDragPixels: 120,
  pixelsToVelocity: 0.3,
};

export function createPointerAim(options: Partial<PointerAimOptions> = {}): PointerAim {
  const resolved = { ...DEFAULT_OPTIONS, ...options };

  const aim: PointerAim = {
    isDragging: false,
    pointerId: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    dragVector: { x: 0, y: 0 },
    options: resolved,
    start: (x, y, pointerId) => {
      if (aim.isDragging) {
        return;
      }

      aim.isDragging = true;
      aim.pointerId = pointerId;
      aim.startPoint = { x, y };
      aim.currentPoint = { x, y };
      aim.dragVector = { x: 0, y: 0 };
    },
    move: (x, y, pointerId) => {
      if (!aim.isDragging || aim.pointerId !== pointerId) {
        return;
      }

      aim.currentPoint = { x, y };
      aim.dragVector = clampVector({
        x: x - aim.startPoint.x,
        y: y - aim.startPoint.y,
      }, aim.options.maxDragPixels);
    },
    end: (pointerId) => {
      if (!aim.isDragging || aim.pointerId !== pointerId) {
        return null;
      }

      const launch = getLaunchVector(aim);
      clearAim(aim);
      return launch;
    },
    cancel: (pointerId) => {
      if (aim.pointerId === pointerId) {
        clearAim(aim);
      }
    },
  };

  return aim;
}

export function getLaunchVector(aim: PointerAim): Vec2 {
  if (!aim.isDragging) {
    return { x: 0, y: 0 };
  }

  return {
    x: -aim.dragVector.x * aim.options.pixelsToVelocity,
    y: aim.dragVector.y * aim.options.pixelsToVelocity,
  };
}

function clearAim(aim: PointerAim): void {
  aim.isDragging = false;
  aim.pointerId = null;
  aim.startPoint = { x: 0, y: 0 };
  aim.currentPoint = { x: 0, y: 0 };
  aim.dragVector = { x: 0, y: 0 };
}

function clampVector(vector: Vec2, maxLength: number): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= maxLength) {
    return vector;
  }

  const scale = maxLength / length;
  return {
    x: vector.x * scale,
    y: vector.y * scale,
  };
}
