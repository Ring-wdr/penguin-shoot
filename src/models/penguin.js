import * as THREE from 'three';
import { MS, mesh } from '../scene/materials.js';

/** 펭귄: 캐릭터라 매끈한 고분할 지오메트리. userData = { inner, fl(날개 피벗 2개), eyes } */
export function buildPenguin() {
  const g = new THREE.Group(); const inner = new THREE.Group(); inner.position.y = -0.62; g.add(inner);
  const navy = MS(0x1E2A3F, 0.45), white = MS(0xFBFDFF, 0.5), orange = MS(0xFF9A2E, 0.4), dark = MS(0x0E1322, 0.25), pink = MS(0xFF9DB0, 0.6), hat = MS(0x2FB5A8, 0.85), knit = MS(0xFFFFFF, 0.9);
  const body = mesh(new THREE.SphereGeometry(0.5, 48, 32), navy); body.scale.set(1, 1.3, 0.95); body.position.y = 0.66; inner.add(body);
  const belly = mesh(new THREE.SphereGeometry(0.42, 40, 28), white); belly.scale.set(0.86, 1.12, 0.62); belly.position.set(0, 0.56, 0.24); inner.add(belly);
  const facep = mesh(new THREE.SphereGeometry(0.3, 36, 24), white); facep.scale.set(1.2, 0.9, 0.62); facep.position.set(0, 1.0, 0.3); inner.add(facep);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.075, 20, 14), dark, false); e.position.set(s * 0.13, 1.04, 0.46); inner.add(e); eyes.push(e);
    const hl = mesh(new THREE.SphereGeometry(0.025, 12, 8), white, false); hl.position.set(s * 0.13 + 0.025, 1.07, 0.52); inner.add(hl);
    const ch = mesh(new THREE.SphereGeometry(0.06, 16, 10), pink, false); ch.scale.set(1, 0.6, 0.4); ch.position.set(s * 0.25, 0.92, 0.42); inner.add(ch);
  }
  const beak = mesh(new THREE.ConeGeometry(0.09, 0.26, 24), orange); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.93, 0.56); inner.add(beak);
  const fl = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * 0.46, 0.86, 0); inner.add(pv);
    const f = mesh(new THREE.SphereGeometry(0.4, 28, 18), navy); f.scale.set(0.28, 1.0, 0.6); f.position.y = -0.34; pv.add(f);
    fl.push(pv);
  }
  for (const s of [-1, 1]) { const ft = mesh(new THREE.SphereGeometry(0.16, 24, 14), orange); ft.scale.set(1, 0.35, 1.5); ft.position.set(s * 0.17, 0.04, 0.16); inner.add(ft); }
  const cap = mesh(new THREE.SphereGeometry(0.42, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), hat); cap.position.y = 1.12; cap.scale.set(1, 0.9, 1); inner.add(cap);
  const cuff = mesh(new THREE.TorusGeometry(0.4, 0.07, 12, 40), knit); cuff.rotation.x = Math.PI / 2; cuff.position.y = 1.14; inner.add(cuff);
  const pom = mesh(new THREE.SphereGeometry(0.13, 20, 14), knit); pom.position.y = 1.55; inner.add(pom);
  g.userData = { inner, fl, eyes };
  return g;
}
