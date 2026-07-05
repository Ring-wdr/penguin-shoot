import * as THREE from 'three';
import type { GameState, MapItem, Vec2 } from '../simulation/game';

export type RenderWorld = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  penguin: THREE.Group;
  launcherBand: THREE.Line;
  trajectoryLine: THREE.Line;
  impactParticles: THREE.Points;
  update: (state: GameState, trajectory: Vec2[], aimStart: Vec2 | null, aimEnd: Vec2 | null) => void;
  resize: () => void;
  dispose: () => void;
};

export type CameraBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type LinePoint = {
  x: number;
  y: number;
  z: number;
};

const CAMERA_WIDTH = 18;
const CAMERA_HEIGHT = 14;
const START_CAMERA_X = 6;
const CAMERA_Y = 5.5;
const CAMERA_Z = 14;
const CAMERA_LOOK_AT_Y = 5;
const WORLD_CHUNK_LENGTH = 120;
const WORLD_CHUNK_MARGIN = 40;

export function createRenderWorld(canvas: HTMLCanvasElement): RenderWorld {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x9ad7e8, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9ad7e8, 35, 120);

  const camera = new THREE.OrthographicCamera(-CAMERA_WIDTH / 2, CAMERA_WIDTH / 2, CAMERA_HEIGHT / 2, -CAMERA_HEIGHT / 2, 0.1, 200);
  camera.position.set(calculateCameraTargetX(0), CAMERA_Y, CAMERA_Z);
  applyCameraFocus(camera, camera.position.x);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb4c8, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-5, 10, 8);
  scene.add(sun);

  const worldChunks = new THREE.Group();
  scene.add(worldChunks);
  const mapItems = new THREE.Group();
  scene.add(mapItems);

  const launcher = createLauncher();
  scene.add(launcher);

  const penguin = createPenguin();
  scene.add(penguin);

  const launcherBand = createLine(0x203040, 3);
  scene.add(launcherBand);

  const trajectoryLine = createLine(0xffffff, 2);
  scene.add(trajectoryLine);

  const impactParticles = createImpactParticles();
  scene.add(impactParticles);

  let trajectoryLinePoints: THREE.Vector3[] = [];
  let launcherBandPoints: THREE.Vector3[] = [];
  const mapItemVisuals = new Map<string, THREE.Object3D>();
  const worldChunkVisuals = new Map<number, THREE.Group>();

  const world: RenderWorld = {
    renderer,
    scene,
    camera,
    penguin,
    launcherBand,
    trajectoryLine,
    impactParticles,
    update: (state, trajectory, aimStart, aimEnd) => {
      syncMapItemVisuals(mapItems, mapItemVisuals, state.mapItems);

      penguin.position.set(state.position.x, state.position.y + 0.55, 0);
      penguin.rotation.z = -state.position.x * 0.35;

      camera.position.x = calculateCameraTargetX(state.position.x, camera.right - camera.left);
      applyCameraFocus(camera, camera.position.x);
      syncWorldChunks(worldChunks, worldChunkVisuals, camera.position.x, camera.right - camera.left);

      const trajectoryVisible = trajectory.length > 1 && state.phase === 'aiming';
      trajectoryLine.visible = trajectoryVisible;
      if (trajectoryVisible) {
        const nextTrajectoryPoints = createTrajectoryPoints(trajectory);
        if (shouldRebuildLineGeometry(trajectoryLinePoints, nextTrajectoryPoints, trajectoryVisible)) {
          updateLine(trajectoryLine, nextTrajectoryPoints);
          trajectoryLinePoints = nextTrajectoryPoints;
        }
      }

      if (aimStart && aimEnd && state.phase === 'aiming') {
        const nextLauncherBandPoints = [
          new THREE.Vector3(aimStart.x, aimStart.y, 0.05),
          new THREE.Vector3(aimEnd.x, aimEnd.y, 0.05),
        ];
        if (shouldRebuildLineGeometry(launcherBandPoints, nextLauncherBandPoints, true)) {
          updateLine(launcherBand, nextLauncherBandPoints);
          launcherBandPoints = nextLauncherBandPoints;
        }
        launcherBand.visible = true;
      } else {
        launcherBand.visible = false;
      }

      impactParticles.visible = state.phase === 'settled';
      impactParticles.position.set(state.position.x, 0.08, 0);

      renderer.render(scene, camera);
    },
    resize: () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);

      const bounds = calculateCameraBounds(width, height);
      camera.left = bounds.left;
      camera.right = bounds.right;
      camera.top = bounds.top;
      camera.bottom = bounds.bottom;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      disposeSceneGraph(scene);
      renderer.dispose();
    },
  };

  world.resize();
  return world;
}

export function createMapItemVisual(item: MapItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `map-item-${item.type}`;
  group.position.set(item.position.x, item.position.y, 0);
  group.visible = shouldShowMapItem(item);

  switch (item.type) {
    case 'ice-bomb':
      group.add(createSphere(0.32, 0x1c2530, 0, 0.38, 0));
      group.add(createCylinder(0.035, 0.42, 0xffd166, 0.12, 0.76, 0, Math.PI * 0.18));
      group.add(createSphere(0.08, 0xfff3b0, 0.25, 0.93, 0));
      break;
    case 'cannon-cave':
      group.add(createCylinder(0.48, 0.75, 0x6bb6d8, 0, 0.45, 0, Math.PI / 2));
      group.add(createSphere(0.34, 0x17384a, 0, 0.45, 0.32));
      break;
    case 'geyser-vent':
      group.add(createCylinder(0.28, 0.18, 0x5f7f90, 0, 0.1, 0, 0));
      group.add(createCylinder(0.16, 1.25, 0xb8f4ff, 0, 0.72, 0, 0, 0.7));
      break;
    case 'headwind-turbine':
      group.add(createCylinder(0.38, 0.22, 0x8ca3ad, 0, 0.8, -0.15, Math.PI / 2));
      group.add(createBlade(0, 0.8, 0));
      group.add(createBlade(0, 0.8, Math.PI / 2));
      group.add(createBlade(0, 0.8, Math.PI));
      group.add(createBlade(0, 0.8, Math.PI * 1.5));
      break;
    case 'jelly-wall':
      group.add(createBox(0.28, 1.45, 1.2, 0xa965ff, 0, 0.72, 0, 0.62));
      break;
    case 'snow-tornado':
      group.add(createCylinder(0.25, 1.4, 0xffffff, 0, 0.72, 0, -0.22, 0.55));
      group.add(createCylinder(0.52, 0.28, 0xd8f7ff, 0, 0.25, 0, 0.35, 0.6));
      group.add(createCylinder(0.68, 0.22, 0xd8f7ff, 0, 0.78, 0, -0.45, 0.5));
      break;
  }

  return group;
}

export function calculateCameraTargetX(penguinX: number, visibleWorldWidth = CAMERA_WIDTH): number {
  const startCameraX = visibleWorldWidth < 10 ? penguinX + visibleWorldWidth * 0.25 : START_CAMERA_X;
  return Math.max(startCameraX, penguinX - 6);
}

export function calculateWorldChunkCenters(cameraX: number, visibleWorldWidth: number): number[] {
  const leftEdge = cameraX - visibleWorldWidth / 2 - WORLD_CHUNK_MARGIN;
  const rightEdge = cameraX + visibleWorldWidth / 2 + WORLD_CHUNK_MARGIN;
  const firstChunk = Math.floor(leftEdge / WORLD_CHUNK_LENGTH) - 1;
  const lastChunk = Math.floor(rightEdge / WORLD_CHUNK_LENGTH) + 1;
  const centers: number[] = [];

  for (let chunkIndex = firstChunk; chunkIndex <= lastChunk; chunkIndex += 1) {
    centers.push(chunkIndex * WORLD_CHUNK_LENGTH + WORLD_CHUNK_LENGTH / 2);
  }

  return centers;
}

export function applyCameraFocus(camera: THREE.Camera, targetX: number): void {
  camera.lookAt(targetX, CAMERA_LOOK_AT_Y, 0);
}

export function createTrajectoryPoints(points: Vec2[]): THREE.Vector3[] {
  return points.map((point) => new THREE.Vector3(point.x, point.y, 0));
}

export function calculateCameraBounds(width: number, height: number): CameraBounds {
  const safeWidth = Math.max(width, 1);
  const safeHeight = Math.max(height, 1);
  const aspect = safeWidth / safeHeight;
  const worldWidth = CAMERA_HEIGHT * aspect;

  return {
    left: -worldWidth / 2,
    right: worldWidth / 2,
    top: CAMERA_HEIGHT / 2,
    bottom: -CAMERA_HEIGHT / 2,
  };
}

export function shouldRebuildLineGeometry(previous: readonly LinePoint[], next: readonly LinePoint[], visible: boolean): boolean {
  if (!visible) {
    return false;
  }

  if (previous.length !== next.length) {
    return true;
  }

  return next.some((point, index) => !linePointsEqual(previous[index], point));
}

function createPenguin(): THREE.Group {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.45 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xf59b32, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), black);
  body.scale.set(0.8, 1.05, 0.7);
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), white);
  belly.position.set(0.05, -0.08, 0.38);
  belly.scale.set(0.85, 1, 0.35);
  group.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), black);
  head.position.set(0.03, 0.58, 0);
  group.add(head);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 16), orange);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0.05, 0.55, 0.38);
  group.add(beak);

  const footGeometry = new THREE.BoxGeometry(0.28, 0.07, 0.18);
  const leftFoot = new THREE.Mesh(footGeometry, orange);
  leftFoot.position.set(-0.18, -0.55, 0.15);
  const rightFoot = leftFoot.clone();
  rightFoot.position.x = 0.18;
  group.add(leftFoot, rightFoot);

  return group;
}

function createLauncher(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xb9f0ff, roughness: 0.35, metalness: 0.05 });
  const postGeometry = new THREE.CylinderGeometry(0.08, 0.12, 2, 12);

  const left = new THREE.Mesh(postGeometry, material);
  left.position.set(-0.55, 0.75, -0.1);
  left.rotation.z = -0.2;

  const right = new THREE.Mesh(postGeometry, material);
  right.position.set(0.3, 0.75, -0.1);
  right.rotation.z = 0.2;

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.8), material);
  base.position.set(-0.12, 0.1, -0.1);

  group.add(left, right, base);
  return group;
}

function createWorldChunk(centerX: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `world-chunk-${centerX}`;
  group.add(createGroundSegment(centerX));
  group.add(createDistanceMarkers(centerX));
  group.add(createIcebergs(centerX));
  return group;
}

function createGroundSegment(centerX: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(WORLD_CHUNK_LENGTH, 0.25, 8);
  const material = new THREE.MeshStandardMaterial({ color: 0xdaf8ff, roughness: 0.4 });
  const ground = new THREE.Mesh(geometry, material);
  ground.position.set(centerX, -0.15, 0);
  return ground;
}

function createDistanceMarkers(centerX: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0x6cb6ce, roughness: 0.5 });
  const start = Math.max(10, Math.ceil((centerX - WORLD_CHUNK_LENGTH / 2) / 10) * 10);
  const end = Math.floor((centerX + WORLD_CHUNK_LENGTH / 2) / 10) * 10;

  for (let distance = start; distance <= end; distance += 10) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.7), material);
    marker.position.set(distance, 0.08, -1.6);
    group.add(marker);
  }

  return group;
}

function createIcebergs(centerX: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc7f0ff, roughness: 0.7 });
  const startX = centerX - WORLD_CHUNK_LENGTH / 2;

  for (let i = 0; i < 10; i += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2 + (i % 3) * 0.3, 2.5 + (i % 4) * 0.4, 5), material);
    cone.position.set(startX + 6 + i * 12, 0.9, -4.2);
    cone.rotation.y = (centerX + i) * 0.7;
    group.add(cone);
  }

  return group;
}

function createLine(color: number, linewidth: number): THREE.Line {
  const material = new THREE.LineBasicMaterial({ color, linewidth });
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  return line;
}

function updateLine(line: THREE.Line, points: THREE.Vector3[]): void {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points.length > 0 ? points : [new THREE.Vector3(), new THREE.Vector3()]);
}

function linePointsEqual(left: LinePoint, right: LinePoint): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function createImpactParticles(): THREE.Points {
  const vertices = new Float32Array([
    -0.35, 0.05, 0,
    -0.18, 0.16, 0.12,
    0, 0.08, -0.1,
    0.22, 0.14, 0.08,
    0.38, 0.06, -0.05,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.16 });
  const particles = new THREE.Points(geometry, material);
  particles.visible = false;
  return particles;
}

function syncMapItemVisuals(container: THREE.Group, visuals: Map<string, THREE.Object3D>, items: MapItem[]): void {
  const activeIds = new Set<string>();
  for (const item of items) {
    activeIds.add(item.id);
    let visual = visuals.get(item.id);
    if (!visual) {
      visual = createMapItemVisual(item);
      visuals.set(item.id, visual);
      container.add(visual);
    }

    visual.position.set(item.position.x, item.position.y, 0);
    visual.visible = shouldShowMapItem(item);
  }

  for (const [id, visual] of visuals) {
    if (!activeIds.has(id)) {
      container.remove(visual);
      visuals.delete(id);
    }
  }
}

function syncWorldChunks(container: THREE.Group, visuals: Map<number, THREE.Group>, cameraX: number, visibleWorldWidth: number): void {
  const neededCenters = new Set(calculateWorldChunkCenters(cameraX, visibleWorldWidth));

  for (const center of neededCenters) {
    if (!visuals.has(center)) {
      const chunk = createWorldChunk(center);
      visuals.set(center, chunk);
      container.add(chunk);
    }
  }

  for (const [center, chunk] of visuals) {
    if (!neededCenters.has(center)) {
      container.remove(chunk);
      disposeObjectGraph(chunk);
      visuals.delete(center);
    }
  }
}

function shouldShowMapItem(item: MapItem): boolean {
  return !item.consumed || item.type === 'headwind-turbine';
}

function createSphere(radius: number, color: number, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 12), createMaterial(color, opacity));
  mesh.position.set(x, y, z);
  return mesh;
}

function createCylinder(
  radius: number,
  height: number,
  color: number,
  x: number,
  y: number,
  z: number,
  rotationZ: number,
  opacity = 1,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 18), createMaterial(color, opacity));
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  return mesh;
}

function createBox(width: number, height: number, depth: number, color: number, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), createMaterial(color, opacity));
  mesh.position.set(x, y, z);
  return mesh;
}

function createBlade(x: number, y: number, rotationZ: number): THREE.Mesh {
  const blade = createBox(0.16, 0.8, 0.08, 0xe7f8ff, x, y, 0.05, 0.9);
  blade.rotation.z = rotationZ;
  return blade;
}

function createMaterial(color: number, opacity: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    transparent: opacity < 1,
    opacity,
  });
}

function disposeSceneGraph(scene: THREE.Scene): void {
  disposeObjectGraph(scene);
}

function disposeObjectGraph(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((object) => {
    if (hasGeometry(object)) {
      geometries.add(object.geometry);
    }

    if (hasMaterial(object)) {
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach((item) => materials.add(item));
      } else {
        materials.add(material);
      }
    }
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function hasGeometry(object: THREE.Object3D): object is THREE.Object3D & { geometry: THREE.BufferGeometry } {
  return 'geometry' in object && object.geometry instanceof THREE.BufferGeometry;
}

function hasMaterial(object: THREE.Object3D): object is THREE.Object3D & { material: THREE.Material | THREE.Material[] } {
  return 'material' in object && (object.material instanceof THREE.Material || Array.isArray(object.material));
}
