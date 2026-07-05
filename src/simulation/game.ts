export type GamePhase = 'aiming' | 'flying' | 'settled';

export type Vec2 = {
  x: number;
  y: number;
};

export type GameState = {
  phase: GamePhase;
  position: Vec2;
  velocity: Vec2;
  distance: number;
  bestDistance: number;
  flightTime: number;
  lastImpactTime: number;
};

export const LAUNCHER_POSITION: Vec2 = { x: 0, y: 1.1 };

const GRAVITY = -18;
const GROUND_Y = 0;
const MAX_LAUNCH_VELOCITY: Vec2 = { x: 24, y: 14.4 };
const MAX_LAUNCH_SPEED = Math.hypot(MAX_LAUNCH_VELOCITY.x, MAX_LAUNCH_VELOCITY.y);
const AIM_TO_SPEED = 1.2;
const BOUNCE_DAMPING = 0.42;
const ROLLING_FRICTION = 4.8;
const AIR_DRAG = 0.05;
const SETTLE_SPEED = 0.75;
const MAX_STEP = 1 / 30;

export function createGameState(bestDistance = 0): GameState {
  return {
    phase: 'aiming',
    position: { ...LAUNCHER_POSITION },
    velocity: { x: 0, y: 0 },
    distance: 0,
    bestDistance,
    flightTime: 0,
    lastImpactTime: -1,
  };
}

export function resetGame(state: GameState): void {
  state.phase = 'aiming';
  state.position = { ...LAUNCHER_POSITION };
  state.velocity = { x: 0, y: 0 };
  state.distance = 0;
  state.flightTime = 0;
  state.lastImpactTime = -1;
}

export function launchPenguin(state: GameState, aimVelocity: Vec2): void {
  if (state.phase !== 'aiming') {
    return;
  }

  state.velocity = clampVelocity({
    x: aimVelocity.x * AIM_TO_SPEED,
    y: aimVelocity.y * AIM_TO_SPEED,
  });
  state.phase = 'flying';
  state.flightTime = 0;
  state.lastImpactTime = -1;
}

export function stepGame(state: GameState, deltaSeconds: number): void {
  if (state.phase !== 'flying' || deltaSeconds <= 0 || !Number.isFinite(deltaSeconds)) {
    return;
  }

  let remaining = deltaSeconds;
  while (remaining > 0 && state.phase === 'flying') {
    const step = Math.min(remaining, MAX_STEP);
    integrateStep(state, step);
    remaining -= step;
  }
}

export function predictTrajectory(state: GameState, aimVelocity: Vec2, sampleCount: number): Vec2[] {
  const preview = createGameState(state.bestDistance);
  preview.position = { ...state.position };
  launchPenguin(preview, aimVelocity);

  const points: Vec2[] = [];
  for (let i = 0; i < sampleCount; i += 1) {
    stepGame(preview, 0.14);
    points.push({ ...preview.position });
    if (preview.phase === 'settled') {
      break;
    }
  }
  return points;
}

function integrateStep(state: GameState, deltaSeconds: number): void {
  state.flightTime += deltaSeconds;

  state.velocity.x -= state.velocity.x * AIR_DRAG * deltaSeconds;
  state.velocity.y += GRAVITY * deltaSeconds;
  state.position.x += state.velocity.x * deltaSeconds;
  state.position.y += state.velocity.y * deltaSeconds;

  if (state.position.y <= GROUND_Y) {
    state.position.y = GROUND_Y;
    state.lastImpactTime = state.flightTime;

    if (Math.abs(state.velocity.y) > 1.2) {
      state.velocity.y = Math.abs(state.velocity.y) * BOUNCE_DAMPING;
    } else {
      state.velocity.y = 0;
    }

    state.velocity.x = moveTowardZero(state.velocity.x, ROLLING_FRICTION * deltaSeconds);
  }

  state.distance = Math.max(0, state.position.x - LAUNCHER_POSITION.x);
  state.bestDistance = Math.max(state.bestDistance, state.distance);

  if (state.position.y === GROUND_Y && Math.abs(state.velocity.x) < SETTLE_SPEED && Math.abs(state.velocity.y) < SETTLE_SPEED) {
    state.velocity = { x: 0, y: 0 };
    state.phase = 'settled';
  }
}

function clampVelocity(velocity: Vec2): Vec2 {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (speed <= MAX_LAUNCH_SPEED) {
    return velocity;
  }

  const scale = MAX_LAUNCH_SPEED / speed;
  return {
    x: velocity.x * scale,
    y: velocity.y * scale,
  };
}

function moveTowardZero(value: number, amount: number): number {
  if (Math.abs(value) <= amount) {
    return 0;
  }

  return value > 0 ? value - amount : value + amount;
}
