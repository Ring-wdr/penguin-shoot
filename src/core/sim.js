import {
  PIVOT, FALLX, START, DIVE_X, SWING_REST, SWING_WINDUP, SWING_W, SWING_END,
  GRAV, GRAV_FALL, R, VMAX, SUBSTEP, MAX_ENERGY,
} from './constants.js';
import { clamp, lerp, damp, DEG } from './math.js';
import { ranger } from './rng.js';
import { genCourse, crevasseAt, onIce } from './course.js';
import { judgeHit, inSwingReach, rollWind } from './judge.js';

/*
 * 게임 로직(상태 머신 + 물리). DOM·three에 의존하지 않는다.
 *   title → ready → waddle → fall → (적중) flight ⇄ slide → done → result
 *                                   fall 바닥 → done('miss'),  flight/slide → sink → done('crevasse')
 *
 * rng  : 로직 난수(코스·바람·물개·폭죽). 시드를 넣으면 같은 입력에 같은 결과.
 * fx   : 연출 콜백 모음. 필요한 것만 구현하면 된다(없으면 무시).
 *   course(objs, airs)  reset()  hint(key)  energy(n, visible?)  ring(visible)
 *   sfx(name, arg?)  pop(text, color, sub?)  burst(x,y,z,n,spd,up,size)  sparkle(kind, x, y)
 *   shake(v)  squash()  penHidden()  objectHit(o)  slide('start'|'set'|'stop', v?)
 *   trail(x)  slidePuff(x, vx, h)  finish(run)  result(run)
 */
export class Sim {
  constructor({ rng = Math.random, fx = {} } = {}) {
    this.rng = rng;
    this.rand = ranger(rng);
    this.fx = fx;
    this.state = 'title';
    this.stateT = 0;
    this.freeze = 0;
    this.doneT = 0;
    this.sinkT = 0;
    this.P = { x: START.x, y: START.y, vx: 0, vy: 0, spin: 0 };
    this.swing = { a: SWING_REST, active: false, used: false };
    this.run = null;
    this.energy = MAX_ENERGY;
    this.bounces = 0;
    this.objs = [];
    this.airs = [];
  }

  emit(name, ...args) { const f = this.fx[name]; if (f) f(...args); }

  /** 새 코스 배치 (타이틀 화면 뒤 배경용으로도 쓴다) */
  newCourse() {
    const { objs, airs } = genCourse(this.rng);
    this.objs = objs; this.airs = airs;
    this.emit('course', objs, airs);
  }

  resetRun() {
    this.newCourse();
    const P = this.P;
    P.x = START.x; P.y = START.y; P.vx = 0; P.vy = 0; P.spin = 0;
    this.swing = { a: SWING_REST, active: false, used: false };
    this.energy = MAX_ENERGY; this.bounces = 0; this.freeze = 0;
    const wind = rollWind(this.rng);
    this.run = {
      judge: null, angle: 0, speed: 0, maxH: 0, hit: false, wind, combo: 0, maxCombo: 0,
      events: { seal: 0, tramp: 0, fire: 0, birds: 0, balloon: 0, snowman: 0, rock: 0 },
    };
    this.state = 'ready'; this.stateT = 0.5;
    this.emit('reset');
    this.emit('energy', this.energy, false);
    this.emit('ring', true);
    this.emit('hint', 'ready');
  }

  /** 원버튼 입력: 스윙 / 날개짓 / 점프 */
  action() {
    const s = this.state;
    if (s === 'ready' || s === 'waddle' || s === 'fall') this.startSwing();
    else if (s === 'flight' || s === 'slide') this.doFlap();
  }

  startSwing() {
    if (this.swing.used) return;
    this.swing.used = true; this.swing.active = true;
    this.emit('sfx', 'swing');
  }

  airHintKey() {
    if (this.state === 'slide') return this.energy > 0 ? 'slide' : 'slideNo';
    return this.energy > 0 ? 'flight' : 'flightNo';
  }
  airHint() { this.emit('hint', this.airHintKey()); }

  doHit(dy) {
    const P = this.P, run = this.run;
    const h = judgeHit(dy);
    const a = h.angle * DEG;
    P.vx = h.speed * Math.cos(a) * (1 + run.wind); P.vy = h.speed * Math.sin(a);
    run.hit = true; run.judge = h.judge; run.angle = h.angle; run.speed = h.speed;
    this.state = 'flight';
    const perfect = h.judge === 'perfect';
    this.freeze = perfect ? 0.13 : 0.08;
    this.emit('ring', false);
    this.emit('shake', perfect ? 0.9 : 0.5);
    this.emit('hit', h.judge);
    this.emit('sparkle', perfect ? 'perfect' : 'hit', P.x, P.y);
    this.emit('energy', this.energy, true);
    this.airHint();
  }

  doFlap() {
    if (this.energy <= 0) return;
    const P = this.P;
    this.energy--; this.emit('energy', this.energy);
    if (this.state === 'slide') {
      P.vy = 7.5; P.vx += 1; this.state = 'flight'; this.bounces = 3;
      this.emit('slide', 'stop');
      this.emit('sfx', 'flap'); this.emit('burst', P.x, 0.3, 0, 10, 3, 2, 0.7); this.emit('pop', '점프!', '#FFFFFF');
    } else {
      const low = P.y < 12 ? 1.35 : 1;
      P.vy = Math.max(P.vy + 7 * low, 6 * low); P.vx += 1.5 * low;
      this.emit('sfx', 'flap'); this.emit('burst', P.x, P.y, 0, 8, 3, 1, 0.6);
      if (low > 1) this.emit('pop', '힘찬 날개짓!', '#FFFFFF');
    }
    this.airHint();
  }

  launch() { this.state = 'flight'; this.bounces = 0; this.emit('slide', 'stop'); }

  bonus(key, label, color) {
    const run = this.run;
    run.events[key]++;
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
    this.energy = Math.min(MAX_ENERGY, this.energy + 1); this.emit('energy', this.energy);
    this.emit('pop', label, color, run.combo >= 2 ? `COMBO ×${run.combo}` : '');
    if (run.combo >= 2) this.emit('sfx', 'combo', run.combo);
    this.airHint();
  }

  fallIn(o) {
    const P = this.P;
    this.state = 'sink'; this.sinkT = 0; P.vy = 0;
    this.run.crevasse = true;
    P.x = clamp(P.x, o.x + 0.8, o.x + o.len - 0.8);
    this.emit('slide', 'stop'); this.emit('sfx', 'fallIn'); this.emit('shake', 0.4);
    this.emit('burst', P.x, 0.2, 0, 24, 3, 3, 0.9);
    this.emit('pop', '크레바스!', '#8FD3F5');
    this.emit('energy', this.energy, false); this.emit('hint', 'done');
  }

  finish(kind) {
    this.state = 'done'; this.doneT = kind === 'miss' ? 1.4 : 1.2;
    this.run.dist = kind === 'miss' ? 0 : Math.max(0, this.P.x);
    this.run.kind = kind;
    this.emit('slide', 'stop'); this.emit('hint', 'done');
    this.emit('finish', this.run);
  }

  showResult() {
    this.state = 'result';
    this.emit('result', this.run);
  }

  collide() {
    const P = this.P, run = this.run, rand = this.rand;
    const bottom = P.y - R;
    for (const o of this.objs) {
      if (o.used || o.type === 'ice' || o.type === 'crevasse') continue;
      const dx = P.x - o.x; if (dx < -2.5 || dx > 2.5) continue;
      if (o.type === 'seal' && Math.abs(dx) < 2.0 && bottom < 2.3) {
        o.used = true;
        const s = Math.max(Math.hypot(P.vx, P.vy), 22) * rand(0.96, 1.2), a = rand(38, 55) * DEG;
        P.vx = Math.min(s * Math.cos(a), VMAX); P.vy = s * Math.sin(a); P.y = Math.max(P.y, 2.2 + R);
        this.launch(); this.emit('objectHit', o);
        this.emit('sfx', 'seal'); this.emit('burst', o.x, 0.6, 0, 12, 4, 3, 0.8);
        this.bonus('seal', '물개 점프!', '#8FD3F5');
      } else if (o.type === 'tramp' && Math.abs(dx) < 1.5 && bottom < 0.85) {
        o.used = true;
        P.vy = clamp(Math.max(-P.vy, 12) * 1.1 + 6, 17, 36); P.vx = Math.min(Math.max(P.vx * 1.2, 24), VMAX); P.y = Math.max(P.y, 1.1 + R);
        this.launch(); this.emit('objectHit', o);
        this.emit('sfx', 'boing'); this.emit('burst', o.x, 0.5, 0, 14, 5, 3, 0.8);
        this.bonus('tramp', '트램펄린!', '#FFFFFF');
      } else if (o.type === 'fire' && Math.abs(dx) < 1.7 && bottom < 1.8) {
        o.used = true;
        const s = rand(58, 88), a = rand(42, 62) * DEG;
        P.vx = s * Math.cos(a); P.vy = s * Math.sin(a); P.y = Math.max(P.y, 1.6 + R);
        this.launch(); this.emit('objectHit', o);
        this.emit('sfx', 'boom'); this.emit('shake', 1.3); this.freeze = 0.1;
        this.emit('burst', o.x, 0.8, 0, 60, 9, 7, 1.4);
        this.emit('sparkle', 'fire', o.x, 1);
        this.bonus('fire', '폭죽 발사!', 'var(--gold)');
      } else if (o.type === 'snowman' && Math.abs(dx) < 0.95 && bottom < 2.9) {
        o.used = true; run.events.snowman++;
        P.vx *= 0.5; P.vy = Math.max(P.vy, 0) + 3;
        if (this.state === 'slide') { this.state = 'flight'; this.emit('slide', 'stop'); }
        this.emit('objectHit', o);
        this.emit('sfx', 'bonk'); this.emit('shake', 0.45); this.emit('pop', '퍽!', '#FFFFFF');
        this.emit('burst', o.x, 1.4, 0, 45, 6, 5, 1.3);
      } else if (o.type === 'rock' && Math.abs(dx) < 1.05 && bottom < 1.15) {
        o.used = true; run.events.rock++;
        P.vx *= 0.28; P.vy = Math.max(P.vy, 0) + 4.5;
        if (this.state === 'slide') { this.state = 'flight'; this.emit('slide', 'stop'); }
        this.emit('objectHit', o);
        this.emit('sfx', 'bonk'); this.emit('shake', 0.7); this.emit('pop', '쿵!', '#C9D3E1');
        this.emit('burst', P.x, 0.8, 0, 16, 4, 3, 0.8);
      }
    }
    for (const o of this.airs) {
      if (o.used) continue;
      const dx = P.x - o.x; if (dx < -3 || dx > 3) continue;
      const dy = P.y - o.y;
      if (o.type === 'birds' && Math.abs(dx) < 2.5 && Math.abs(dy) < 1.9) {
        o.used = true; o.t = 0;
        P.vx = Math.min(P.vx + 16, VMAX); P.vy = Math.max(P.vy, 0) + 5;
        this.emit('objectHit', o);
        this.emit('sfx', 'tweet'); this.emit('burst', P.x, P.y, 0, 10, 3, 1, 0.5);
        this.bonus('birds', '철새 부스트!', '#FFFFFF');
      } else if (o.type === 'balloon' && Math.abs(dx) < 1.9 && Math.abs(dy) < 2.1) {
        o.used = true;
        P.vy = Math.max(P.vy, 0) + 15; P.vx = Math.min(P.vx * 1.05, VMAX);
        this.emit('objectHit', o);
        this.emit('sfx', 'pop'); this.emit('sparkle', 'balloon', o.x, o.y);
        this.bonus('balloon', '풍선 팡!', '#FF8A6E');
      }
    }
  }

  /** 로직 한 서브스텝 (h초, 보통 1/120) */
  step(h) {
    const P = this.P, swing = this.swing;
    // 스윙 진행 & 타격 판정
    if (swing.active) {
      const prev = swing.a; swing.a = Math.min(SWING_END, swing.a + SWING_W * h);
      const s = this.state;
      if (prev < 0 && swing.a >= 0 && (s === 'fall' || s === 'waddle' || s === 'ready')) {
        const dy = P.y - PIVOT.y, dx = P.x - PIVOT.x;
        if (inSwingReach(dx, dy)) this.doHit(dy);
        else { this.emit('sfx', 'whiff'); this.emit('pop', '헛스윙!', '#FFFFFF'); }
      }
      if (swing.a >= SWING_END) swing.active = false;
    }
    if (this.freeze > 0) return;
    for (const o of this.airs) if (o.type === 'birds' && !o.used) o.x += o.v * h;
    switch (this.state) {
      case 'ready': this.stateT -= h; if (this.stateT <= 0) this.state = 'waddle'; break;
      case 'waddle':
        P.x += 3.3 * h;
        if (P.x >= DIVE_X) { P.x = DIVE_X; this.state = 'fall'; P.vy = 2.6; this.emit('sfx', 'squeak'); this.emit('hint', 'fall'); }
        break;
      case 'fall':
        P.vy -= GRAV_FALL * h; P.y += P.vy * h; P.x += (FALLX - P.x) * Math.min(1, h * 6);
        if (P.y <= R) {
          P.y = R;
          this.emit('sfx', 'splat'); this.emit('burst', P.x, 0.3, 0, 30, 5, 4, 1); this.emit('shake', 0.3); this.emit('squash');
          if (!swing.used) this.emit('pop', '놓쳤다!', '#FFFFFF');
          this.finish('miss');
        }
        break;
      case 'flight': {
        const run = this.run;
        P.vy -= GRAV * h; P.vx *= 1 - 0.035 * h; P.vy *= 1 - 0.01 * h;
        P.vx += run.wind * 6 * h;
        P.x += P.vx * h; P.y += P.vy * h;
        run.maxH = Math.max(run.maxH, P.y);
        P.spin -= (5 + P.vx * 0.12) * h;
        this.collide();
        if (this.state === 'flight' && P.y <= R) {
          P.y = R;
          const cv = crevasseAt(this.objs, P.x);
          if (cv) { this.fallIn(cv); break; }
          if (-P.vy > 7 && this.bounces < 3) {
            P.vy = -P.vy * 0.38; P.vx *= 0.8; this.bounces++;
            this.emit('sfx', 'land'); this.emit('shake', 0.25); this.emit('burst', P.x, 0.3, 0, 22, 5, 4, 1.1);
          } else {
            P.vy = 0; this.state = 'slide'; run.combo = 0;
            this.emit('sfx', 'land'); this.emit('burst', P.x, 0.3, 0, 26, 5, 3.5, 1.1);
            this.airHint(); this.emit('slide', 'start');
          }
        }
        break;
      }
      case 'slide': {
        const ice = onIce(this.objs, P.x);
        P.vx -= (ice ? 1.1 : 6.5) * h; P.x += Math.max(0, P.vx) * h; P.y = R;
        const cv = crevasseAt(this.objs, P.x);
        if (cv) { this.fallIn(cv); break; }
        this.collide();
        if (this.state === 'slide') {
          this.emit('trail', P.x);
          this.emit('slidePuff', P.x, P.vx, h);
          this.emit('slide', 'set', P.vx);
          if (P.vx <= 0.15) { P.vx = 0; this.finish('stop'); }
        }
        break;
      }
      case 'sink':
        this.sinkT += h; P.y = R - this.sinkT * this.sinkT * 6;
        if (this.sinkT > 0.9) { this.emit('penHidden'); this.finish('crevasse'); }
        break;
    }
  }

  /**
   * 실시간 프레임 진행. 히트스톱(freeze) 중엔 로직을 멈추고 스윙만 살짝 진행한다.
   * @returns 연출에 쓸 시간 배율 (히트스톱 중 0.3)
   */
  tick(dt) {
    if (this.freeze > 0) {
      this.freeze -= dt;
      this.swing.a = Math.min(SWING_END, this.swing.a + SWING_W * dt * 0.15);
      return 0.3;
    }
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP)); const h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(h);
    this.tickDone(dt);
    return 1;
  }

  tickDone(dt) {
    if (this.state === 'done') { this.doneT -= dt; if (this.doneT <= 0) this.showResult(); }
  }

  /** 디버그·테스트용: 렌더 없이 로직만 1/120초 단위로 진행. until()이 true면 중단 */
  advance(sec, until) {
    for (let t = 0; t < sec; t += SUBSTEP) {
      if (until && until()) return true;
      if (this.freeze > 0) { this.freeze -= SUBSTEP; continue; }
      this.step(SUBSTEP);
      this.tickDone(SUBSTEP);
    }
    return false;
  }

  /**
   * 스윙 전 대기 자세(프레임마다 뷰에서 호출). 방망이 각도는 타격 타이밍에 영향을 주므로
   * 원본과 같이 렌더 루프에서만 적용된다 — advance()로 돌리는 헤드리스 측정엔 반영되지 않는다.
   */
  easeSwing(dt, time) {
    const swing = this.swing, s = this.state;
    if (!swing.active && !swing.used) {
      const target = s === 'fall' ? SWING_WINDUP : s === 'waddle' ? lerp(SWING_REST, SWING_WINDUP, 0.4) : SWING_REST + Math.sin(time * 1.6) * 0.05;
      swing.a += (target - swing.a) * damp(6, dt);
    } else if (!swing.active && (s === 'slide' || s === 'done' || s === 'result')) {
      swing.a += (SWING_REST + 0.15 - swing.a) * damp(1.2, dt);
    }
  }
}
