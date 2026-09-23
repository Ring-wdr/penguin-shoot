import * as THREE from 'three';
import { rand } from '../core/math.js';

const dummy = new THREE.Object3D();

/** InstancedMesh 기반 파티클 풀 */
class Pool {
  constructor(scene, geo, mat, n, grav) {
    this.n = n; this.grav = grav; this.i = 0;
    this.m = new THREE.InstancedMesh(geo, mat, n); this.m.frustumCulled = false; this.m.castShadow = false;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.l = new Float32Array(n); this.ml = new Float32Array(n); this.s = new Float32Array(n); this.r = new Float32Array(n);
    dummy.scale.setScalar(0); dummy.updateMatrix(); for (let i = 0; i < n; i++) this.m.setMatrixAt(i, dummy.matrix);
    scene.add(this.m);
  }
  emit(x, y, z, vx, vy, vz, life, size) {
    const i = this.i; this.i = (i + 1) % this.n;
    this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.l[i] = this.ml[i] = life; this.s[i] = size; this.r[i] = Math.random() * 6;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.l[i] <= 0) continue;
      this.l[i] -= dt; const k = i * 3;
      this.v[k + 1] -= this.grav * dt;
      this.v[k] *= 1 - 1.2 * dt; this.v[k + 2] *= 1 - 1.2 * dt;
      this.p[k] += this.v[k] * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      if (this.p[k + 1] < 0.05) { this.p[k + 1] = 0.05; this.v[k + 1] *= -0.2; this.v[k] *= 0.5; }
      const t = Math.max(0, this.l[i] / this.ml[i]);
      dummy.position.set(this.p[k], this.p[k + 1], this.p[k + 2]);
      dummy.rotation.set(this.r[i] + this.l[i] * 4, this.r[i], 0);
      dummy.scale.setScalar(this.s[i] * (0.3 + 0.7 * t));
      if (this.l[i] <= 0) dummy.scale.setScalar(0);
      dummy.updateMatrix(); this.m.setMatrixAt(i, dummy.matrix);
    }
    this.m.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.l.fill(0); dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < this.n; i++) this.m.setMatrixAt(i, dummy.matrix);
    this.m.instanceMatrix.needsUpdate = true;
  }
}

/** 눈 자국 (미끄러진 자리) */
class Trail {
  constructor(scene, n = 600) {
    this.n = n;
    this.m = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 8), new THREE.MeshBasicMaterial({ color: 0xCBDDEE }), n);
    this.m.frustumCulled = false; scene.add(this.m);
    this.clear();
  }
  clear() {
    dummy.scale.setScalar(0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
    for (let i = 0; i < this.n; i++) this.m.setMatrixAt(i, dummy.matrix);
    this.m.instanceMatrix.needsUpdate = true; this.i = 0; this.lastX = -999;
  }
  /** 0.45m마다 자국 하나 */
  add(x) {
    if (x - this.lastX <= 0.45) return;
    this.lastX = x;
    dummy.position.set(x, 0.015, rand(-0.05, 0.05)); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1.3, 1, 1); dummy.updateMatrix();
    this.m.setMatrixAt(this.i, dummy.matrix); this.i = (this.i + 1) % this.n; this.m.instanceMatrix.needsUpdate = true;
  }
}

/** 내리는 눈 (카메라 주변을 순환) */
class Snowfall {
  constructor(scene, n = 1400) {
    this.n = n;
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(0, 50); pos[i * 3 + 2] = rand(-40, 30); }
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const c = cv.getContext('2d'); const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 32, 32);
    const pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ color: 0xFFFFFF, size: 0.28, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.95, depthWrite: false }));
    pts.frustumCulled = false; scene.add(pts);
  }
  update(dt, time, wind, cx, cy) {
    const sp = this.geo.attributes.position.array;
    for (let i = 0; i < this.n; i++) {
      const j = i * 3;
      sp[j + 1] -= (1.6 + (i % 7) * 0.25) * dt; sp[j] += (Math.sin(time + i) * 0.3 + wind * 40) * dt;
      if (sp[j + 1] < cy - 30 || sp[j + 1] < -1) sp[j + 1] += 55;
      if (sp[j] < cx - 60) sp[j] += 120; else if (sp[j] > cx + 60) sp[j] -= 120;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}

export function buildParticles(scene) {
  const puffs = new Pool(scene, new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, flatShading: true, roughness: 1 }), 500, 9);
  const stars = new Pool(scene, new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xFFC23C }), 80, 3);
  const trail = new Trail(scene);
  const snow = new Snowfall(scene);

  /** 눈가루 폭발 */
  function burst(x, y, z, n, spd, up, size = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.8);
      puffs.emit(x + rand(-.3, .3), y + rand(0, .3), z + rand(-.3, .3), Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s, rand(0.5, 1.1), size * rand(0.7, 1.6));
    }
  }

  /** 별 파티클: 타격·폭죽·풍선 */
  function sparkle(kind, x, y) {
    if (kind === 'perfect' || kind === 'hit') {
      for (let i = 0; i < (kind === 'perfect' ? 26 : 14); i++) {
        const t = Math.random() * Math.PI * 2, s = rand(4, 10);
        stars.emit(x, y, 0, Math.cos(t) * s, Math.sin(t) * s, rand(-3, 3), rand(0.4, 0.8), rand(0.8, 1.5));
      }
    } else if (kind === 'fire') {
      for (let i = 0; i < 40; i++) { const t = Math.random() * Math.PI * 2, sp = rand(6, 16); stars.emit(x, y, 0, Math.cos(t) * sp, Math.abs(Math.sin(t)) * sp, rand(-5, 5), rand(0.6, 1.2), rand(1, 2)); }
    } else if (kind === 'balloon') {
      for (let i = 0; i < 20; i++) { const t = Math.random() * Math.PI * 2, sp = rand(3, 8); stars.emit(x, y, 0, Math.cos(t) * sp, Math.sin(t) * sp, rand(-3, 3), rand(0.4, 0.8), rand(0.6, 1.1)); }
    }
  }

  /** 미끄러질 때 튀는 눈가루 (속도에 비례한 확률) */
  function slidePuff(x, vx, h) {
    if (Math.random() < vx * h * 3) puffs.emit(x + rand(-.3, .3), 0.2, rand(-.5, .5), rand(-2, 1), rand(1, 3), rand(-2, 2), rand(0.3, 0.7), rand(0.5, 1));
  }

  return {
    puffs, stars, trail, snow, burst, sparkle, slidePuff,
    clear() { puffs.clear(); stars.clear(); trail.clear(); },
    update(dt) { puffs.update(dt); stars.update(dt); },
  };
}
