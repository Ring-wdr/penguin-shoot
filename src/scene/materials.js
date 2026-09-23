import * as THREE from 'three';

const matCache = {};
/** 캐시된 로우폴리(flatShading) 재질 — 환경·코스 오브젝트용 */
export function M(color, extra) {
  const key = color + JSON.stringify(extra || {});
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0, flatShading: true }, extra || {}));
  return matCache[key];
}
/** 매끈한 재질 — 예티·펭귄 캐릭터 전용 */
export function MS(color, rough = 0.6) { return M(color, { flatShading: false, roughness: rough }); }

export function mesh(geo, mat, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }

export function part(geo, mat, sx, sy, sz, x, y, z, parent, shadow = true) {
  const m = mesh(geo, mat, shadow); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m;
}
