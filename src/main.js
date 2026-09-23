import './scene/color.js'; // 반드시 첫 import
import './style.css';
import { Sim } from './core/sim.js';
import { parseStore, recordRun } from './core/records.js';
import { createStage } from './scene/stage.js';
import { createView } from './view.js';
import { createUI, HIT_POP } from './ui.js';
import { bindInput } from './input.js';
import { ac, sfx, slideStart, slideSet, slideStop } from './audio.js';

/* 저장: localStorage 키 'penguin-smash-3d' → { best, recent[5] } */
const KEY = 'penguin-smash-3d';
let store;
try { store = parseStore(localStorage.getItem(KEY)); } catch (e) { store = parseStore(null); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* 저장 불가 환경 */ } }

const ui = createUI();
const stage = createStage(document.getElementById('game'));

// 뷰는 sim을 읽고, sim은 fx 콜백으로 연출을 요청한다
const fx = {};
const sim = new Sim({ fx });
const view = createView(stage, sim);

Object.assign(fx, {
  course: view.course,
  reset() { view.reset(); ui.startRun(sim.run.wind); },
  hint: ui.hint,
  energy: ui.energy,
  ring: view.ring,
  shake: view.shake,
  squash: view.squash,
  penHidden: view.penHidden,
  objectHit: view.objectHit,
  burst: view.particles.burst,
  sparkle: view.particles.sparkle,
  trail: x => view.particles.trail.add(x),
  slidePuff: view.particles.slidePuff,
  pop: ui.pop,
  sfx: (name, arg) => sfx[name](arg),
  hit(judge) {
    const [label, color] = HIT_POP[judge];
    ui.pop(label, color);
    sfx.hit(judge === 'perfect'); setTimeout(sfx.squeak, 60);
  },
  slide(cmd, v) { if (cmd === 'start') slideStart(); else if (cmd === 'set') slideSet(v); else slideStop(); },
  finish(run) {
    run.isNew = recordRun(store, run);
    if (run.isNew) { view.bestFlag.set(store.best); setTimeout(sfx.record, 400); }
    save(); ui.refreshBest(store.best);
  },
  result(run) { ui.showResult(run, store); },
});

ui.refreshBest(store.best);
view.bestFlag.set(store.best);

function start() { ac(); sim.resetRun(); }
bindInput({ sim, ui, start });

/* 루프 */
let time = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  time += dt;
  const k = sim.tick(dt);
  view.update(dt * k, time);
  ui.dist(distShown());
  stage.renderer.render(stage.scene, stage.camera);
}
function distShown() {
  const s = sim.state;
  if (s === 'flight' || s === 'slide' || s === 'sink' || s === 'done') return Math.max(0, sim.run && sim.run.kind === 'miss' ? 0 : sim.P.x);
  return 0;
}

/* 초기 상태: 타이틀 화면 뒤에서 펭귄이 대기 */
stage.resize();
sim.newCourse();
requestAnimationFrame(frame);
setTimeout(() => { try { ui.el.startBtn.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 100);

/* 디버그 훅 (테스트·튜닝용, 프로덕션에 남아 있어도 무해) */
window.__game = {
  sim,
  get state() { return sim.state; }, P: sim.P, resetRun: () => sim.resetRun(), action: () => sim.action(),
  get energy() { return sim.energy; }, get objs() { return sim.objs; }, get airs() { return sim.airs; }, get run() { return sim.run; },
  snap() { view.update(5, time); stage.renderer.render(stage.scene, stage.camera); }, // 카메라·포즈를 즉시 목표로 맞추고 한 장 그림

  advance: (sec, until) => sim.advance(sec, until),
};
