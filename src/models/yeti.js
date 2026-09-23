import * as THREE from 'three';
import { PIVOT } from '../core/constants.js';
import { MS, mesh } from '../scene/materials.js';

/** 예티: 캐릭터라 매끈한 고분할 지오메트리. swing 그룹의 y축 회전이 방망이 각도 */
export function buildYeti() {
  const g = new THREE.Group();
  const fur = MS(0xEEF1FA, 0.9), furS = MS(0xD9E0F1, 0.9), face = MS(0x9DB3D8, 0.7), dark = MS(0x1B2340, 0.35), horn = MS(0xF0DAAA, 0.5), scarf = MS(0xE5483B, 0.85), white = MS(0xFFFFFF, 0.3);
  const upper = new THREE.Group(); g.add(upper);
  for (const s of [-1, 1]) {
    const leg = mesh(new THREE.CapsuleGeometry(0.4, 0.45, 10, 24), fur); leg.position.set(s * 0.55, 0.62, 0); g.add(leg);
    const foot = mesh(new THREE.SphereGeometry(0.45, 32, 20), face); foot.scale.set(1, 0.42, 1.35); foot.position.set(s * 0.6, 0.16, 0.2); g.add(foot);
  }
  const body = mesh(new THREE.SphereGeometry(1.25, 48, 32), fur); body.scale.set(1.05, 1.2, 0.95); body.position.y = 2.15; upper.add(body);
  const belly = mesh(new THREE.SphereGeometry(1, 40, 28), furS); belly.scale.set(0.78, 0.92, 0.42); belly.position.set(0, 1.95, 0.75); upper.add(belly);
  const sc = mesh(new THREE.TorusGeometry(0.82, 0.22, 18, 48), scarf); sc.rotation.x = Math.PI / 2; sc.position.y = 3.08; upper.add(sc);
  const tail = mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 16), scarf); tail.scale.set(1, 1, 0.45); tail.position.set(0.5, 2.62, 0.88); tail.rotation.z = 0.25; upper.add(tail);
  const head = new THREE.Group(); head.position.y = 3.78; upper.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.95, 48, 32), fur); skull.scale.set(1.08, 0.95, 1); head.add(skull);
  const fp = mesh(new THREE.SphereGeometry(1, 40, 28), face); fp.scale.set(0.7, 0.55, 0.36); fp.position.set(0, -0.14, 0.7); head.add(fp);
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.13, 24, 16), dark, false); e.position.set(s * 0.26, 0.03, 0.98); head.add(e);
    const hl = mesh(new THREE.SphereGeometry(0.045, 12, 8), white, false); hl.position.set(s * 0.26 + 0.04, 0.08, 1.09); head.add(hl);
    const br = mesh(new THREE.CapsuleGeometry(0.04, 0.24, 4, 10), dark, false); br.rotation.z = Math.PI / 2 - s * 0.28; br.position.set(s * 0.27, 0.23, 1.0); head.add(br);
    const h = mesh(new THREE.ConeGeometry(0.16, 0.6, 24), horn); h.position.set(s * 0.72, 0.62, 0); h.rotation.z = -s * 0.65; head.add(h);
  }
  const mouth = mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 32, Math.PI), dark, false); mouth.rotation.z = Math.PI; mouth.position.set(0, -0.28, 1.04); head.add(mouth);
  for (const s of [-1, 1]) { const t = mesh(new THREE.CapsuleGeometry(0.04, 0.03, 4, 10), white, false); t.scale.set(1, 1, 0.6); t.position.set(s * 0.08, -0.33, 1.06); head.add(t); }
  for (let i = 0; i < 6; i++) {
    const t = mesh(new THREE.ConeGeometry(0.14, 0.45, 18), fur);
    t.position.set(-0.35 + i * 0.14, 0.82 + Math.sin(i) * 0.05, 0.1 - (i % 2) * 0.25); t.rotation.z = (i - 2.5) * 0.18; head.add(t);
  }
  // 스윙 (팔 + 방망이)
  const swing = new THREE.Group(); swing.position.set(0, 2.55, 0.35); g.add(swing);
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.27, 0.8, 10, 20), fur); arm.rotation.z = Math.PI / 2; arm.position.set(0.55, 0, s * 0.24); swing.add(arm);
  }
  const hand = mesh(new THREE.SphereGeometry(0.3, 24, 16), face); hand.position.set(1.12, 0, 0); swing.add(hand);
  const wood = MS(0xC98A4B, 0.45);
  const handle = mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 20), wood); handle.rotation.z = -Math.PI / 2; handle.position.x = 1.35; swing.add(handle);
  const knob = mesh(new THREE.SphereGeometry(0.11, 16, 12), wood); knob.position.x = 0.85; swing.add(knob);
  const barrel = mesh(new THREE.CylinderGeometry(0.23, 0.1, 2.1, 28), wood); barrel.rotation.z = -Math.PI / 2; barrel.position.x = 2.85; swing.add(barrel);
  const band = mesh(new THREE.CylinderGeometry(0.19, 0.18, 0.14, 28), scarf); band.rotation.z = -Math.PI / 2; band.position.x = 2.2; swing.add(band);
  const tip = mesh(new THREE.SphereGeometry(0.23, 28, 14), wood); tip.scale.set(0.35, 1, 1); tip.position.x = 3.9; swing.add(tip);
  g.position.set(PIVOT.x, 6, PIVOT.z - 0.35);
  return { g, upper, head, swing };
}
