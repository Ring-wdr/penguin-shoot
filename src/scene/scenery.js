import * as THREE from 'three';
import { rand } from '../core/math.js';
import { M, mesh } from './materials.js';

/* 나무 (인스턴스 950그루) */
function trees(scene) {
  const N = 950;
  const parts = [
    [new THREE.CylinderGeometry(0.22, 0.3, 1.3, 6), M(0x6B4A2E), 0.65],
    [new THREE.ConeGeometry(1.7, 2.4, 7), M(0x2E5E4E), 1.9],
    [new THREE.ConeGeometry(1.3, 2.1, 7), M(0x346A58), 3.1],
    [new THREE.ConeGeometry(0.85, 1.7, 7), M(0x3A7461), 4.2],
    [new THREE.ConeGeometry(0.5, 0.8, 7), M(0xF7FBFF), 4.85],
    [new THREE.CylinderGeometry(1.3, 1.72, 0.25, 7), M(0xF7FBFF), 1.15],
  ];
  const ims = parts.map(([g, m]) => { const im = new THREE.InstancedMesh(g, m, N); im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; });
  const d = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const x = rand(-60, 5600);
    const z = -rand(12, 150);
    const s = rand(0.8, 1.9);
    const ry = rand(0, Math.PI * 2);
    const lift = z < -60 ? (Math.abs(z) - 60) * 0.18 : 0; // 뒤쪽 비탈 높이
    parts.forEach(([, , y], k) => {
      d.position.set(x, y * s + lift, z);
      d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); ims[k].setMatrixAt(i, d.matrix);
    });
  }
  ims.forEach(im => { im.instanceMatrix.needsUpdate = true; });
}

/* 원경 산 */
function mountains(scene) {
  const group = new THREE.Group();
  const rockM = new THREE.MeshStandardMaterial({ color: 0x8FA8C8, flatShading: true, roughness: 1, fog: false });
  const capM = new THREE.MeshStandardMaterial({ color: 0xF3F8FD, flatShading: true, roughness: 1, fog: false });
  for (let i = 0; i < 18; i++) {
    const h = rand(110, 230), r = h * rand(0.6, 0.85), seg = 6 + (i % 3);
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg, 1), rockM);
    const x = -520 + i * 62 + rand(-20, 20), z = -rand(430, 560);
    m.position.set(x, h / 2 - 10, z); m.rotation.y = rand(0, 3);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 0.36, h * 0.36, seg, 1), capM);
    c.position.set(x, h - 10 - h * 0.18 + 0.5, z); c.rotation.y = m.rotation.y;
    group.add(m, c);
  }
  scene.add(group);
  return group;
}

/* 거리 표지판: 50m 간격, 1km 이후 100m 간격 */
function drawSign(cv, d) {
  const c = cv.getContext('2d'); const hot = d % 100 === 0;
  c.clearRect(0, 0, 256, 128);
  c.fillStyle = hot ? '#FF5D3A' : '#F7FBFF'; c.strokeStyle = '#17233B'; c.lineWidth = 10;
  c.beginPath(); if (c.roundRect) c.roundRect(6, 6, 244, 116, 22); else c.rect(6, 6, 244, 116); c.fill(); c.stroke();
  c.fillStyle = hot ? '#FFFFFF' : '#17233B'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = (d >= 1000 ? '62px' : '72px') + ' Jua, "Gowun Dodum", sans-serif'; c.fillText(d + 'm', 128, 70);
}
function signs(scene) {
  const postM = M(0x3B4660);
  const list = [];
  for (let d = 50; d <= 5000; d += (d < 1000 ? 50 : 100)) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; drawSign(cv, d);
    const tex = new THREE.CanvasTexture(cv); list.push({ cv, d, tex });
    const g = new THREE.Group();
    const post = mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6), postM); post.position.y = 1.1; g.add(post);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8 }));
    board.position.y = 2.6; board.castShadow = true; g.add(board);
    g.position.set(d, 0, -4.2); scene.add(g);
  }
  whenFontsReady(() => list.forEach(s => { drawSign(s.cv, s.d); s.tex.needsUpdate = true; }));
}

/* 최고 기록 깃발 */
function bestFlag(scene) {
  const flag = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6), M(0x17233B)); pole.position.y = 2.1; flag.add(pole);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
  const c = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  const draw = () => {
    c.fillStyle = '#FFC23C'; c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#17233B'; c.font = '64px Jua, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BEST', 128, 68);
    tex.needsUpdate = true;
  };
  draw();
  const f = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
  f.position.set(0.95, 3.7, 0); f.castShadow = true; flag.add(f);
  scene.add(flag);
  whenFontsReady(draw);
  return {
    /** 기록 위치로 깃발 이동 (1m 이하면 숨김) */
    set(best) { flag.position.set(best, 0, 3.2); flag.visible = best > 1; },
  };
}

/* 풍향계 */
function windsock(scene) {
  const sock = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), M(0x3B4660)); pole.position.y = 1.5; sock.add(pole);
  const arm = new THREE.Group(); arm.position.y = 2.9; sock.add(arm);
  const c = mesh(new THREE.CylinderGeometry(0.28, 0.12, 1.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xFF5D3A, side: THREE.DoubleSide, flatShading: true }));
  c.rotation.z = -Math.PI / 2; c.position.x = 0.75; arm.add(c);
  const stripe = mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.35, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide }));
  stripe.rotation.z = -Math.PI / 2; stripe.position.x = 0.75; arm.add(stripe);
  sock.position.set(-8.6, 6, -2.5); scene.add(sock);
  return {
    update(wind, time) {
      arm.rotation.y = wind < 0 ? Math.PI : 0;
      arm.rotation.z = -1.2 + Math.min(1.15, Math.abs(wind) * 9) + Math.sin(time * 7) * 0.05 * (0.3 + Math.abs(wind) * 8);
    },
  };
}

function whenFontsReady(fn) { if (document.fonts && document.fonts.ready) document.fonts.ready.then(fn); }

export function buildScenery(scene) {
  trees(scene);
  const mountainGroup = mountains(scene);
  signs(scene);
  return { mountains: mountainGroup, bestFlag: bestFlag(scene), sock: windsock(scene) };
}
