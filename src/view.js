import * as THREE from 'three';
import { clamp, damp, rand } from './core/math.js';
import { START } from './core/constants.js';
import { balloonY } from './core/course.js';
import { buildTerrain } from './scene/terrain.js';
import { buildScenery } from './scene/scenery.js';
import { buildParticles } from './scene/particles.js';
import { buildYeti } from './models/yeti.js';
import { buildPenguin } from './models/penguin.js';
import { buildCourseMeshes } from './models/course-objects.js';

const SLIDE_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2));
const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
const vA = new THREE.Vector3(), vB = new THREE.Vector3();

/** 3D 연출: 시뮬레이션 상태를 읽어 포즈·카메라·파티클을 갱신한다 */
export function createView(stage, sim) {
  const { scene, camera, sun, sky } = stage;
  const { ring } = buildTerrain(scene);
  const scenery = buildScenery(scene);
  const fx = buildParticles(scene);
  const yeti = buildYeti(); scene.add(yeti.g);
  const pen = buildPenguin(); scene.add(pen);
  pen.position.set(START.x, START.y, 0);
  const objGroup = new THREE.Group(); scene.add(objGroup);

  const camPos = new THREE.Vector3(-1.5, 10.5, 20), camLook = new THREE.Vector3(-1.8, 9.6, 0);
  camera.position.copy(camPos);
  let shake = 0, orbitA = 0;

  function reset() {
    fx.clear();
    pen.scale.set(1, 1, 1); pen.visible = true;
    pen.quaternion.setFromEuler(tmpE.set(0, Math.PI / 2, 0));
    orbitA = 0;
    const k = stage.aspectK;
    camPos.set(-1.2, k > 1.3 ? 10.8 : 10.2, 19.5 * k); camLook.set(-1.6, k > 1.3 ? 10 : 9.8, 0);
  }

  /** 오브젝트에 부딪힌 순간의 연출 */
  function objectHit(o) {
    if (o.type === 'seal' || o.type === 'tramp') o.anim = 1;
    else if (o.type === 'fire' || o.type === 'snowman' || o.type === 'balloon') o.m.visible = false;
    else if (o.type === 'birds') o.m.userData.birds.forEach(b => { b.vx = rand(-6, 10); b.vy = rand(4, 10); b.vz = rand(-6, 6); });
  }

  function animateObjects(dt, time) {
    const cx = camera.position.x;
    for (const o of sim.objs) {
      if (Math.abs(o.x - cx) > 220) continue;
      const u = o.m.userData;
      if (o.type === 'tramp' && o.anim > 0) { o.anim = Math.max(0, o.anim - dt * 2.5); u.top.scale.y = 1 - Math.sin(o.anim * Math.PI * 3) * 0.45 * o.anim; }
      else if (o.type === 'seal') {
        if (o.anim > 0) o.anim = Math.max(0, o.anim - dt * 2);
        u.neck.rotation.z = Math.sin(time * 2.4 + o.x) * 0.08 + Math.sin(o.anim * Math.PI) * 0.7;
        u.ball.rotation.x += dt * 2; u.ball.position.y = 1.3 + Math.abs(Math.sin(time * 3 + o.x)) * 0.25 + o.anim * 3;
      } else if (o.type === 'fire' && !o.used) { u.spark.visible = Math.sin(time * 30 + o.x) > -0.3; u.spark.rotation.y += dt * 8; }
    }
    for (const o of sim.airs) {
      if (Math.abs(o.x - cx) > 260) continue;
      const u = o.m.userData;
      if (o.type === 'birds') {
        o.m.position.x = o.x;
        if (o.used) o.t += dt;
        u.birds.forEach(b => {
          const fl = Math.sin(time * (o.used ? 26 : 12) + b.ph) * 0.7;
          b.wl.rotation.x = fl; b.wr.rotation.x = -fl;
          b.b.position.y += Math.sin(time * 3 + b.ph) * 0.004;
          if (o.used) { b.b.position.x += b.vx * dt; b.b.position.y += b.vy * dt; b.b.position.z += b.vz * dt; b.b.rotation.z = 0.5; }
        });
        if (o.used && o.t > 3) o.m.visible = false;
      } else if (o.type === 'balloon' && !o.used) {
        // 판정 y도 여기서 갱신된다(카메라 근처만) — 원본 동작 유지
        o.y = balloonY(o, time);
        o.m.position.y = o.y;
        o.m.rotation.z = Math.sin(time * 0.9 + o.x) * 0.06;
      }
    }
  }

  function update(dt, time) {
    const state = sim.state, P = sim.P, run = sim.run, swing = sim.swing;

    // 예티
    const breathe = Math.sin(time * 2.2) * 0.02;
    yeti.upper.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
    sim.easeSwing(dt, time);
    const sa = clamp(swing.a, -3, 2.4);
    yeti.swing.rotation.set(0, swing.a, 0);
    yeti.upper.rotation.y = sa * 0.16;
    yeti.head.rotation.y = -sa * 0.1 + (state === 'flight' || state === 'slide' ? 0.35 : 0);
    yeti.head.rotation.x = state === 'flight' ? -0.25 : 0;

    // 펭귄 자세
    const u = pen.userData;
    pen.position.set(P.x, P.y, 0);
    if (state === 'ready' || state === 'waddle' || state === 'title') {
      const w = state === 'waddle' ? 1 : 0.25;
      tmpE.set(0, Math.PI / 2, Math.sin(time * 13) * 0.14 * w); pen.quaternion.setFromEuler(tmpE);
      u.inner.position.y = -0.62 + Math.abs(Math.sin(time * 13)) * 0.07 * w;
      u.fl[0].rotation.z = -0.25 - Math.sin(time * 13) * 0.2 * w; u.fl[1].rotation.z = 0.25 - Math.sin(time * 13) * 0.2 * w;
    } else if (state === 'fall') {
      tmpQ.setFromEuler(tmpE.set(0, 0, Math.sin(time * 10) * 0.08)); pen.quaternion.slerp(tmpQ, damp(8, dt));
      u.inner.position.y = -0.62;
      u.fl[0].rotation.z = -1.4 - Math.sin(time * 34) * 0.6; u.fl[1].rotation.z = 1.4 + Math.sin(time * 34) * 0.6;
    } else if (state === 'flight') {
      tmpE.set(0, 0, P.spin); pen.quaternion.setFromEuler(tmpE);
      const f = sim.energy === 0 ? 30 : 22;
      u.fl[0].rotation.z = -1.2 - Math.sin(time * f) * 0.7; u.fl[1].rotation.z = 1.2 + Math.sin(time * f) * 0.7;
    } else if (state === 'sink') {
      pen.quaternion.slerp(tmpQ.setFromEuler(tmpE.set(0, 0, 0)), damp(10, dt));
      u.fl[0].rotation.z = -2.6 - Math.sin(time * 40) * 0.4; u.fl[1].rotation.z = 2.6 + Math.sin(time * 40) * 0.4;
    } else if (state === 'slide' || ((state === 'done' || state === 'result') && run && run.kind !== 'miss')) {
      pen.quaternion.slerp(SLIDE_Q, damp(10, dt));
      const wig = state === 'slide' ? 0 : Math.sin(time * 5) * 0.3;
      u.fl[0].rotation.z = -1.5 + wig; u.fl[1].rotation.z = 1.5 - wig;
    }
    if (state !== 'done' && state !== 'result') pen.scale.lerp(vA.set(1, 1, 1), damp(8, dt));

    ring.material.opacity = 0.55 + Math.sin(time * 6) * 0.3;
    ring.scale.setScalar(1 + Math.sin(time * 6) * 0.06);

    animateObjects(dt, time);
    fx.update(dt);

    const wind = run ? run.wind : 0;
    scenery.sock.update(wind, time);

    // 카메라
    const k = stage.aspectK;
    if (state === 'title' || state === 'ready' || state === 'waddle' || state === 'fall' || (state !== 'flight' && state !== 'slide' && run && run.kind === 'miss')) {
      const drift = state === 'title' ? Math.sin(time * 0.3) * 1.5 : 0;
      vA.set(-1.2 + drift, 10.2, 19.5 * k); vB.set(-1.6, state === 'fall' ? 9.2 : 9.8, 0);
      if (k > 1.3) { vA.y = 10.8; vB.y = 10; }
      camPos.lerp(vA, damp(2.5, dt)); camLook.lerp(vB, damp(3, dt));
    } else if (state === 'flight' || state === 'slide' || state === 'sink') {
      const spd = Math.min(Math.hypot(P.vx, P.vy), 90);
      vA.set(P.x - 5.5 * k - Math.min(P.vx, 60) * 0.04, Math.max(P.y + 2.2 - Math.min(P.y * 0.1, 4), 2.8), (13 + spd * 0.13) * k);
      vB.set(P.x + P.vx * 0.12, P.y + 0.6 - Math.min(P.y * 0.12, 5), 0);
      camPos.x += (vA.x - camPos.x) * damp(7, dt); camPos.y += (vA.y - camPos.y) * damp(3.5, dt); camPos.z += (vA.z - camPos.z) * damp(2, dt);
      camLook.x += (vB.x - camLook.x) * damp(9, dt); camLook.y += (vB.y - camLook.y) * damp(4, dt); camLook.z = 0;
    } else {
      orbitA += dt * 0.35;
      const r = 9 * Math.min(k, 1.8);
      vA.set(P.x + Math.sin(orbitA - 0.6) * r, 3.4, Math.cos(orbitA - 0.6) * r); vB.set(P.x, 0.8, 0);
      camPos.lerp(vA, damp(1.5, dt)); camLook.lerp(vB, damp(3, dt));
    }
    shake = Math.max(0, shake - dt * 2.2);
    const s = shake * shake;
    camera.position.set(camPos.x + (Math.random() - .5) * s, camPos.y + (Math.random() - .5) * s, camPos.z);
    camera.lookAt(camLook);

    sky.position.copy(camera.position);
    scenery.mountains.position.x = camera.position.x * 0.92;
    // 그림자 카메라(±36m)가 펭귄을 따라간다
    const focus = (state === 'flight' || state === 'slide' || state === 'sink' || state === 'done' || state === 'result') ? P.x : -2;
    sun.target.position.set(focus, 0, 0); sun.position.set(focus - 30, 55, 32);

    fx.snow.update(dt, time, wind, camera.position.x, camera.position.y);
  }

  return {
    update, reset, objectHit,
    course(objs, airs) { buildCourseMeshes(objGroup, objs, airs); },
    ring(visible) { ring.visible = visible; },
    shake(v) { shake = v; },
    squash() { pen.scale.set(1.25, 0.55, 1.25); },
    penHidden() { pen.visible = false; },
    bestFlag: scenery.bestFlag,
    particles: fx,
  };
}
