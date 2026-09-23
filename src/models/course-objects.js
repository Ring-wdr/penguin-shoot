import * as THREE from 'three';
import { rand } from '../core/math.js';
import { M, mesh, part } from '../scene/materials.js';

/* 코스 오브젝트 메시 (로우폴리). 배치·판정은 core/course.js */

const G = {
  moundG: new THREE.CylinderGeometry(1.5, 1.9, 0.45, 12), padG: new THREE.CylinderGeometry(1.25, 1.25, 0.22, 16), ringG: new THREE.TorusGeometry(1.25, 0.1, 6, 22),
  coilG: new THREE.CylinderGeometry(0.08, 0.08, 0.38, 5),
  s1: new THREE.IcosahedronGeometry(0.8, 1), s2: new THREE.IcosahedronGeometry(0.56, 1), s3: new THREE.IcosahedronGeometry(0.42, 1),
  carrot: new THREE.ConeGeometry(0.08, 0.4, 6), coal: new THREE.SphereGeometry(0.06, 6, 4), stick: new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4),
  rock: new THREE.DodecahedronGeometry(0.95, 0), rockCap: new THREE.DodecahedronGeometry(0.6, 0),
  unitBox: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 14, 10), sphLo: new THREE.SphereGeometry(1, 8, 6),
  cone: new THREE.ConeGeometry(1, 1, 6), torus: new THREE.TorusGeometry(1, 0.22, 6, 16), wing: new THREE.BoxGeometry(0.5, 0.04, 0.95),
  string: new THREE.CylinderGeometry(0.015, 0.015, 2.6, 3), plane: new THREE.PlaneGeometry(1, 1),
};

const crevTex = (() => {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 4; const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, '#9CCBE8'); gr.addColorStop(0.18, '#3F7FB0'); gr.addColorStop(0.5, '#0A1A2E'); gr.addColorStop(0.82, '#3F7FB0'); gr.addColorStop(1, '#9CCBE8');
  c.fillStyle = gr; c.fillRect(0, 0, 128, 4); return new THREE.CanvasTexture(cv);
})();
const iceMat = new THREE.MeshStandardMaterial({ color: 0x9FD8F3, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.85 });
const glintMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });
const crevMat = new THREE.MeshBasicMaterial({ map: crevTex });

function makeTramp() {
  const g = new THREE.Group();
  const mound = mesh(G.moundG, M(0xF3F8FD)); mound.position.y = 0.22; g.add(mound);
  const top = new THREE.Group(); top.position.y = 0.45; g.add(top);
  for (let i = 0; i < 6; i++) { const c = mesh(G.coilG, M(0x9AA6BA, { metalness: 0.4, roughness: 0.4 })); c.position.set(Math.cos(i * 1.05) * 0.8, 0.19, Math.sin(i * 1.05) * 0.8); top.add(c); }
  const pad = mesh(G.padG, M(0xFF5D3A)); pad.position.y = 0.45; top.add(pad);
  const r = mesh(G.ringG, M(0xFFFFFF)); r.rotation.x = Math.PI / 2; r.position.y = 0.57; top.add(r);
  g.userData.top = top; return g;
}
function makeSeal() {
  const g = new THREE.Group(); const body = M(0x5B6F8E), belly = M(0xAFBDD0), dark = M(0x17233B), red = M(0xE5483B), white = M(0xFFFFFF);
  part(G.sph, body, 1.35, 0.62, 0.72, -0.2, 0.55, 0, g);
  part(G.sph, belly, 1.1, 0.42, 0.55, -0.05, 0.42, 0.22, g);
  const tail = part(G.cone, body, 0.35, 0.7, 0.2, -1.65, 0.35, 0, g); tail.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) { const f = part(G.sphLo, body, 0.35, 0.1, 0.22, 0.2, 0.18, s * 0.62, g); f.rotation.y = s * 0.5; }
  const neck = new THREE.Group(); neck.position.set(0.8, 0.8, 0); g.add(neck);
  part(G.sph, body, 0.52, 0.5, 0.5, 0.2, 0.45, 0, neck);
  part(G.sph, belly, 0.26, 0.2, 0.3, 0.62, 0.38, 0, neck);
  part(G.sphLo, dark, 0.09, 0.08, 0.1, 0.87, 0.45, 0, neck, false);
  for (const s of [-1, 1]) part(G.sphLo, dark, 0.085, 0.085, 0.085, 0.45, 0.66, s * 0.24, neck, false);
  const ball = new THREE.Group(); ball.position.set(0.95, 1.3, 0); neck.add(ball);
  part(G.sph, red, 0.48, 0.48, 0.48, 0, 0, 0, ball);
  const band = part(G.torus, white, 0.47, 0.47, 0.47, 0, 0, 0, ball); band.rotation.y = Math.PI / 2;
  part(G.torus, M(0xFFC23C), 0.47, 0.47, 0.47, 0, 0, 0, ball);
  g.userData = { neck, ball }; return g;
}
function makeFireBox() {
  const g = new THREE.Group(); const red = M(0xE5483B), gold = M(0xFFC23C);
  part(G.unitBox, red, 1.5, 1.3, 1.5, 0, 0.65, 0, g);
  part(G.unitBox, gold, 1.54, 1.32, 0.28, 0, 0.65, 0, g);
  part(G.unitBox, gold, 0.28, 1.32, 1.54, 0, 0.65, 0, g);
  for (const s of [-1, 1]) { const b = part(G.torus, gold, 0.3, 0.3, 0.3, s * 0.25, 1.45, 0, g); b.rotation.y = Math.PI / 2; b.rotation.z = s * 0.6; }
  const fuse = part(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), M(0x3B4660), 1, 1, 1, 0.45, 1.55, 0.45, g); fuse.rotation.z = -0.5;
  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xFFE27A }));
  spark.position.set(0.62, 1.82, 0.45); g.add(spark);
  g.userData = { spark }; return g;
}
function makeSnowman() {
  const g = new THREE.Group(); const w = M(0xF7FBFF), k = M(0x17233B);
  const a = mesh(G.s1, w); a.position.y = 0.72; g.add(a);
  const b = mesh(G.s2, w); b.position.y = 1.78; g.add(b);
  const c = mesh(G.s3, w); c.position.y = 2.55; g.add(c);
  const n = mesh(G.carrot, M(0xFF8A2A)); n.rotation.x = Math.PI / 2; n.position.set(0, 2.55, 0.55); g.add(n);
  for (const s of [-1, 1]) {
    const e = mesh(G.coal, k, false); e.position.set(s * 0.14, 2.68, 0.36); g.add(e);
    const st = mesh(G.stick, M(0x6B4A2E)); st.position.set(s * 0.85, 1.95, 0); st.rotation.z = s * 1.0; g.add(st);
  }
  for (let i = 0; i < 3; i++) { const bt = mesh(G.coal, k, false); bt.position.set(0, 1.55 + i * 0.22, 0.53 - Math.abs(i - 1) * 0.03); g.add(bt); }
  return g;
}
function makeRock() {
  const g = new THREE.Group();
  const r = mesh(G.rock, M(0x7C879A)); r.scale.set(1.25, 0.85, 1.05); r.position.y = 0.55; r.rotation.y = rand(0, 3); g.add(r);
  const c = mesh(G.rockCap, M(0xF7FBFF)); c.scale.set(1.3, 0.35, 1.1); c.position.y = 1.2; g.add(c);
  return g;
}
function makeIce(len) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(G.unitBox, iceMat); m.scale.set(len, 0.06, 3.4); m.receiveShadow = true; m.position.set(len / 2, 0.03, 0); g.add(m);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(G.plane, glintMat); s.scale.set(rand(1, 2.4), 0.08, 1); s.rotation.x = -Math.PI / 2; s.rotation.z = rand(-0.5, 0.5); s.position.set(rand(1, len - 1), 0.07, rand(-1.2, 1.2)); g.add(s); }
  return g;
}
function makeCrevasse(w) {
  const g = new THREE.Group();
  const pit = new THREE.Mesh(G.plane, crevMat); pit.scale.set(w, 9, 1); pit.rotation.x = -Math.PI / 2; pit.position.set(w / 2, 0.03, 0); g.add(pit);
  for (const ex of [0, w]) {
    part(G.unitBox, M(0xF7FBFF), 0.5, 0.3, 9, ex, 0.12, 0, g);
    for (let i = 0; i < 5; i++) { const ic = part(G.cone, M(0xBFE3F7, { roughness: 0.3 }), 0.14, 0.45, 0.14, ex + (ex ? -0.25 : 0.25), 0.12, -3.6 + i * 1.8 + rand(-.3, .3), g, false); ic.rotation.z = ex ? -2.4 : 2.4; }
  }
  // 경고 깃발
  part(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5), M(0x17233B), 1, 1, 1, -3, 0.9, -3.3, g);
  const fl = part(G.cone, M(0xFF5D3A), 0.3, 0.7, 0.05, -2.62, 1.55, -3.3, g); fl.rotation.z = -Math.PI / 2;
  return g;
}
function makeFlock() {
  const g = new THREE.Group(); const birds = [];
  const bodyM = M(0xF3F6FA), wingM = M(0xC9D3E1), beakM = M(0xFF9A2E), eyeM = M(0x17233B);
  const n = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    part(G.sphLo, bodyM, 0.42, 0.2, 0.2, 0, 0, 0, b);
    part(G.sphLo, bodyM, 0.15, 0.15, 0.15, 0.36, 0.08, 0, b);
    const bk = part(G.cone, beakM, 0.05, 0.16, 0.05, 0.55, 0.07, 0, b, false); bk.rotation.z = -Math.PI / 2;
    part(G.sphLo, eyeM, 0.03, 0.03, 0.03, 0.42, 0.14, 0.12, b, false);
    const wl = new THREE.Group(), wr = new THREE.Group(); b.add(wl, wr);
    part(G.wing, wingM, 1, 1, 1, 0, 0, 0.5, wl); part(G.wing, wingM, 1, 1, 1, 0, 0, -0.5, wr);
    b.position.set(rand(-2, 2), rand(-1.1, 1.1), rand(-1.2, 1.2)); g.add(b);
    birds.push({ b, wl, wr, ph: Math.random() * 6, vx: 0, vy: 0, vz: 0 });
  }
  g.userData = { birds }; return g;
}
function makeBalloons() {
  const g = new THREE.Group(); const cols = [0xFF5D3A, 0xFFC23C, 0x2FB5A8];
  const offs = [[-0.6, 0.2, 0], [0.6, 0.4, 0.2], [0, 1.2, -0.2]];
  offs.forEach(([x, y, z], i) => {
    const b = new THREE.Group(); b.position.set(x, y, z); g.add(b);
    const s = mesh(G.sph, new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.35 })); s.scale.set(0.72, 0.88, 0.72); b.add(s);
    part(G.cone, M(cols[i]), 0.1, 0.16, 0.1, 0, -0.92, 0, b, false);
    const st = new THREE.Mesh(G.string, M(0x3B4660)); st.position.set(-x * 0.5, -1.0 - 1.3 - y * 0.5, -z * 0.5); st.rotation.z = x * 0.2; b.add(st);
  });
  return g;
}

const MAKERS = {
  seal: makeSeal, tramp: makeTramp, fire: makeFireBox, snowman: makeSnowman, rock: makeRock,
  ice: o => makeIce(o.len), crevasse: o => makeCrevasse(o.len),
  birds: makeFlock, balloon: makeBalloons,
};

/** 코스 데이터에 맞춰 메시를 만들고 각 오브젝트에 o.m으로 붙인다 */
export function buildCourseMeshes(group, objs, airs) {
  group.clear();
  for (const o of objs) { o.m = MAKERS[o.type](o); o.m.position.set(o.x, 0, 0); group.add(o.m); }
  for (const o of airs) { o.m = MAKERS[o.type](o); o.m.position.set(o.x, o.y, 0); group.add(o.m); }
}
