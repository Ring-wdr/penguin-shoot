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
  startDistance: number;
  bestDistance: number;
  flightTime: number;
  lastImpactTime: number;
  mapItems: MapItem[];
};

export type MapItemType =
  | 'ice-bomb'
  | 'cannon-cave'
  | 'geyser-vent'
  | 'headwind-turbine'
  | 'jelly-wall'
  | 'snow-tornado';

export type MapItem = {
  id: string;
  type: MapItemType;
  position: Vec2;
  radius: number;
  consumed: boolean;
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
const MIN_ITEM_SPACING = 9;
const RANDOM_ITEM_SPACING = 20;
const ITEM_LOOKAHEAD_DISTANCE = 80;
const ITEM_TYPES: MapItemType[] = [
  'ice-bomb',
  'cannon-cave',
  'geyser-vent',
  'headwind-turbine',
  'jelly-wall',
  'snow-tornado',
];

export function createGameState(bestDistance = 0, mapItems: MapItem[] | undefined = undefined, startDistance = 0): GameState {
  const safeStartDistance = sanitizeDistance(startDistance);
  return {
    phase: 'aiming',
    position: { x: safeStartDistance, y: LAUNCHER_POSITION.y },
    velocity: { x: 0, y: 0 },
    distance: safeStartDistance,
    startDistance: safeStartDistance,
    bestDistance,
    flightTime: 0,
    lastImpactTime: -1,
    mapItems: cloneMapItems(mapItems ?? createMapItems(undefined, safeStartDistance)),
  };
}

export function resetGame(state: GameState, startDistance = 0, mapItems: MapItem[] | undefined = undefined): void {
  const safeStartDistance = sanitizeDistance(startDistance);
  state.phase = 'aiming';
  state.position = { x: safeStartDistance, y: LAUNCHER_POSITION.y };
  state.velocity = { x: 0, y: 0 };
  state.distance = safeStartDistance;
  state.startDistance = safeStartDistance;
  state.flightTime = 0;
  state.lastImpactTime = -1;
  state.mapItems = cloneMapItems(mapItems ?? createMapItems(undefined, safeStartDistance));
}

export function createMapItems(seed = Math.floor(Math.random() * 1_000_000), startDistance = 0): MapItem[] {
  const random = createSeededRandom(seed);
  const items: MapItem[] = [];
  const safeStartDistance = sanitizeDistance(startDistance);

  appendRandomizedMapItemBatch(items, random, safeStartDistance + 14 + random() * 8);
  return items;
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
  const preview = createGameState(state.bestDistance, state.mapItems, state.startDistance);
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

  applyMapItemEffects(state, deltaSeconds);

  state.distance = Math.max(state.startDistance, state.position.x);
  state.bestDistance = Math.max(state.bestDistance, state.distance);
  ensureMapItemsAhead(state);

  if (state.position.y === GROUND_Y && Math.abs(state.velocity.x) < SETTLE_SPEED && Math.abs(state.velocity.y) < SETTLE_SPEED) {
    state.velocity = { x: 0, y: 0 };
    state.phase = 'settled';
  }
}

function ensureMapItemsAhead(state: GameState): void {
  const targetX = state.position.x + ITEM_LOOKAHEAD_DISTANCE;
  let farthestItemX = getFarthestItemX(state.mapItems);

  while (farthestItemX < targetX) {
    const random = createSeededRandom(Math.floor(farthestItemX * 1000) + state.mapItems.length * 97);
    farthestItemX = appendRandomizedMapItemBatch(state.mapItems, random, farthestItemX + MIN_ITEM_SPACING + random() * RANDOM_ITEM_SPACING);
  }
}

function getFarthestItemX(items: MapItem[]): number {
  if (items.length === 0) {
    return 14;
  }

  return Math.max(...items.map((item) => item.position.x));
}

function appendRandomizedMapItemBatch(items: MapItem[], random: () => number, startX: number): number {
  let nextX = startX;
  let lastItemX = startX;
  const batchTypes = shuffleItemTypes(random);

  for (const type of batchTypes) {
    lastItemX = nextX;
    items.push({
      id: `${type}-${items.length}-${nextX.toFixed(2)}`,
      type,
      position: { x: Number(nextX.toFixed(2)), y: 0 },
      radius: getItemRadius(type),
      consumed: false,
    });
    nextX += MIN_ITEM_SPACING + random() * RANDOM_ITEM_SPACING;
  }

  return lastItemX;
}

function shuffleItemTypes(random: () => number): MapItemType[] {
  const shuffled = [...ITEM_TYPES];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function applyMapItemEffects(state: GameState, deltaSeconds: number): void {
  for (const item of state.mapItems) {
    if (item.type === 'headwind-turbine' && isTouchingItem(state.position, item)) {
      state.velocity.x = Math.max(0, state.velocity.x - 130 * deltaSeconds);
      state.velocity.y -= 2 * deltaSeconds;
      continue;
    }

    if (item.consumed || !isTouchingItem(state.position, item)) {
      continue;
    }

    if (item.type === 'ice-bomb') {
      state.velocity.x = Math.max(state.velocity.x, 18);
      state.velocity.y = Math.max(state.velocity.y, 12);
      item.consumed = true;
    } else if (item.type === 'cannon-cave') {
      state.velocity.x = 24;
      state.velocity.y = 10;
      state.position.y = Math.max(state.position.y, 0.2);
      item.consumed = true;
    } else if (item.type === 'geyser-vent') {
      state.velocity.y = Math.max(state.velocity.y, 16);
      state.position.y = Math.max(state.position.y, 0.25);
      item.consumed = true;
    } else if (item.type === 'jelly-wall') {
      state.velocity.x *= 0.28;
      state.velocity.y = Math.max(state.velocity.y * 0.45, 4);
      state.position.x = Math.min(state.position.x, item.position.x - item.radius * 0.35);
      item.consumed = true;
    } else if (item.type === 'snow-tornado') {
      state.velocity.x = Math.max(state.velocity.x + 4, 13);
      state.velocity.y = Math.max(state.velocity.y + 13, 12);
      state.position.y = Math.max(state.position.y, item.position.y + 0.6);
      item.consumed = true;
    }
  }
}

function isTouchingItem(position: Vec2, item: MapItem): boolean {
  return Math.hypot(position.x - item.position.x, position.y - item.position.y) <= item.radius;
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

function cloneMapItems(items: MapItem[]): MapItem[] {
  return items.map((item) => ({
    ...item,
    position: { ...item.position },
  }));
}

function sanitizeDistance(distance: number): number {
  return Number.isFinite(distance) && distance > 0 ? distance : 0;
}

function getItemRadius(type: MapItemType): number {
  switch (type) {
    case 'jelly-wall':
      return 0.75;
    case 'headwind-turbine':
    case 'snow-tornado':
      return 1.4;
    default:
      return 0.9;
  }
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
