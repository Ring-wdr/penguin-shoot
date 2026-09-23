import * as THREE from 'three';
import { hash3, rand } from '../core/math.js';
import { PIVOT, FALLX } from '../core/constants.js';
import { M, mesh } from './materials.js';

/* 지형: 환경은 로우폴리(flatShading) 유지 */
function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(5800, 720, 580, 72);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + 2800, z = p.getZ(i);
    const az = Math.abs(z);
    const w = THREE.MathUtils.smoothstep(az, 7, 40);
    let h = (Math.sin(x * 0.045) * 1.6 + Math.sin(z * 0.07 + x * 0.013) * 2.2 + Math.sin(x * 0.11 + z * 0.13) * 0.7) * w;
    if (z < -60) h += (az - 60) * 0.18 * (0.7 + 0.3 * Math.sin(x * 0.02));
    h += (hash3(Math.round(x), 0, Math.round(z)) - 0.5) * 0.5 * w;
    p.setY(i, Math.max(h, z > 0 ? -1.2 : -2) * (az < 7 ? 0 : 1));
  }
  geo.computeVertexNormals();
  const g = mesh(geo, M(0xF3F8FD, { roughness: 0.95 }), false);
  g.position.x = 2800;
  scene.add(g);

  /* 활주로 옆 얕은 선 (코스 가이드) */
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(5800, 0.18), new THREE.MeshBasicMaterial({ color: 0xC7DAEC }));
  lane.rotation.x = -Math.PI / 2; lane.position.set(2800, 0.02, -2.4); scene.add(lane);
  const lane2 = lane.clone(); lane2.position.z = 2.4; scene.add(lane2);
}

function rockBlock(w, h, d, amp, color) {
  const geo = new THREE.BoxGeometry(w, h, d, Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 1.6)), Math.max(2, Math.ceil(d / 2)));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const top = y > h / 2 - 0.01;
    const k = top ? 0.25 : 1;
    p.setX(i, x + (hash3(x, y, z) - 0.5) * amp * k);
    p.setZ(i, z + (hash3(z, x, y) - 0.5) * amp * k);
    if (!top) p.setY(i, y + (hash3(y, z, x) - 0.5) * amp * 0.6);
  }
  geo.computeVertexNormals();
  return mesh(geo, M(color));
}

function cliff(w, h, d, cx, cz) {
  const g = new THREE.Group();
  const rh = h - 0.35; // 바위 윗면을 눈 덮개 안쪽으로 내려 z-fighting(깜빡임) 방지
  const r = rockBlock(w, rh, d, 1.0, 0x6F7F99); r.position.y = rh / 2; g.add(r);
  const band = rockBlock(w + 0.2, h * 0.3, d + 0.2, 0.8, 0x5E6D86); band.position.y = h * 0.2; g.add(band);
  const cap = rockBlock(w + 0.6, 0.6, d + 0.6, 0.35, 0xF7FBFF); cap.position.y = h - 0.3; g.add(cap);
  for (let i = 0; i < 6; i++) { // 눈 흘러내림
    const dr = mesh(new THREE.ConeGeometry(rand(0.3, 0.6), rand(0.8, 1.8), 5), M(0xF7FBFF));
    dr.rotation.x = Math.PI; dr.position.set(w / 2 + 0.2, h - 0.8, rand(-d / 2 + 1, d / 2 - 1)); g.add(dr);
  }
  g.position.set(cx, 0, cz);
  return g;
}

function plank(scene) {
  const wood = M(0xB57A45), woodD = M(0x8A5A30);
  const board = mesh(new THREE.BoxGeometry(7.8, 0.25, 1.15), wood); board.position.set(-4.1, 14.125, 0); scene.add(board);
  for (let i = 0; i < 7; i++) { const s = mesh(new THREE.BoxGeometry(0.05, 0.26, 1.16), woodD, false); s.position.set(-7.6 + i * 1.1, 14.13, 0); scene.add(s); }
  const strut = mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 6), woodD);
  strut.position.set(-5.2, 12.3, 0); strut.rotation.z = -1.0; scene.add(strut);
  const snow = mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), M(0xF7FBFF)); snow.position.set(-6.6, 14.3, 0); scene.add(snow);
  const flagPole = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), M(0x3B4660)); flagPole.position.set(-7.4, 15.4, -0.5); scene.add(flagPole);
  const flag = mesh(new THREE.ConeGeometry(0.35, 1.0, 3), M(0xFF5D3A)); flag.rotation.z = -Math.PI / 2; flag.position.set(-6.9, 16.3, -0.5); scene.add(flag);
}

/** 지형·절벽·다이빙대·타이밍 고리. 고리 메시를 돌려준다. */
export function buildTerrain(scene) {
  buildGround(scene);
  scene.add(cliff(9, 6, 12, -5.5, 0));    // 예티 절벽 (x -10 ~ -1, 높이 6)
  scene.add(cliff(30, 14, 16, -22, -1));  // 다이빙대 절벽 (x -37 ~ -7, 높이 14)
  plank(scene);

  /* 타이밍 고리 (판정 기준: PIVOT.y + 0.1) */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xFFC23C, transparent: true, opacity: 0.9 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(FALLX, PIVOT.y + 0.1, 0); scene.add(ring);
  return { ring };
}
