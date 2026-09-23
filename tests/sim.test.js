import { describe, it, expect } from 'vitest';
import { Sim } from '../src/core/sim.js';
import { mulberry32 } from '../src/core/rng.js';
import { PIVOT, MAX_ENERGY, R } from '../src/core/constants.js';

const swingAt = (g, y) => { g.advance(10, () => g.state === 'fall' && g.P.y < y); g.action(); };
const toResult = g => g.advance(300, () => g.state === 'result');

/** 장애물·보너스가 없는 빈 코스로 바꾼다 */
const emptyCourse = g => { g.objs = []; g.airs = []; };

describe('Sim 상태 머신', () => {
  it('ready → waddle → fall', () => {
    const g = new Sim({ rng: mulberry32(1) });
    expect(g.state).toBe('title');
    g.resetRun();
    expect(g.state).toBe('ready');
    g.advance(0.51);
    expect(g.state).toBe('waddle');
    g.advance(10, () => g.state === 'fall');
    expect(g.state).toBe('fall');
  });

  it('스윙하지 않으면 miss, 0m', () => {
    const g = new Sim({ rng: mulberry32(1) });
    g.resetRun(); toResult(g);
    expect(g.state).toBe('result');
    expect(g.run).toMatchObject({ kind: 'miss', dist: 0, hit: false });
  });

  it('너무 일찍 휘두르면 헛스윙 → miss', () => {
    const g = new Sim({ rng: mulberry32(1) });
    const sfx = [];
    g.fx = { sfx: n => sfx.push(n) };
    g.resetRun(); g.action(); toResult(g);
    expect(sfx).toContain('whiff');
    expect(g.run.kind).toBe('miss');
  });

  it('고리 높이에서 휘두르면 PERFECT로 날아간다', () => {
    const g = new Sim({ rng: mulberry32(1) });
    g.resetRun();
    swingAt(g, PIVOT.y + 0.1 + 1.55); // 스윙 선행시간 보정
    g.advance(0.3);
    expect(g.state).toBe('flight');
    expect(g.run.judge).toBe('perfect');
    expect(g.P.vx).toBeGreaterThan(0);
  });

  it('빈 코스에선 미끄러지다 멈춘다 (stop)', () => {
    const g = new Sim({ rng: mulberry32(3) });
    g.resetRun(); emptyCourse(g);
    swingAt(g, PIVOT.y + 1.65);
    toResult(g);
    expect(g.run.kind).toBe('stop');
    expect(g.run.dist).toBeCloseTo(g.P.x, 6);
    expect(g.run.dist).toBeGreaterThan(100);
  });

  it('크레바스에 빠지면 빠진 지점이 기록', () => {
    // 같은 시드·입력으로 먼저 멈추는 지점을 구하고, 그 직전(미끄러지는 구간)에 크레바스를 둔다
    const play = crev => {
      const g = new Sim({ rng: mulberry32(3) });
      g.resetRun(); emptyCourse(g);
      if (crev) g.objs = [crev];
      swingAt(g, PIVOT.y + 1.65);
      toResult(g);
      return g.run;
    };
    const stopAt = play(null).dist;
    const cx = stopAt - 8;
    const run = play({ type: 'crevasse', x: cx, len: 5, used: false, anim: 0 });
    expect(run.kind).toBe('crevasse');
    expect(run.dist).toBeGreaterThanOrEqual(cx + 0.8);
    expect(run.dist).toBeLessThanOrEqual(cx + 5 - 0.8);
  });

  it('날개짓은 에너지 3칸을 쓰고, 미끄럼 중엔 점프(vy 7.5)', () => {
    const g = new Sim({ rng: mulberry32(3) });
    g.resetRun(); emptyCourse(g);
    swingAt(g, PIVOT.y + 1.65);
    g.advance(10, () => g.state === 'flight' && g.freeze <= 0);
    g.action();
    expect(g.energy).toBe(MAX_ENERGY - 1);
    g.advance(60, () => g.state === 'slide');
    expect(g.state).toBe('slide');
    g.action();
    expect(g.state).toBe('flight');
    expect(g.P.vy).toBe(7.5);
    expect(g.energy).toBe(MAX_ENERGY - 2);
  });

  it('보너스는 에너지 +1, 연속이면 COMBO', () => {
    const g = new Sim({ rng: mulberry32(3) });
    g.resetRun(); emptyCourse(g);
    g.energy = 1;
    g.state = 'flight'; g.P.x = 100; g.P.y = 10; g.P.vx = 30; g.P.vy = 0;
    g.airs = [{ type: 'balloon', x: 100, y: 10, y0: 10, used: false, t: 0, v: 0 }, { type: 'birds', x: 100, y: 10, y0: 10, used: false, t: 0, v: 0 }];
    g.collide();
    expect(g.run.events).toMatchObject({ balloon: 1, birds: 1 });
    expect(g.run.combo).toBe(2);
    expect(g.energy).toBe(3);
  });

  it('물개: 가장자리에서 속력 유지하며 38~55°로 재발사', () => {
    const g = new Sim({ rng: mulberry32(9) });
    g.resetRun(); emptyCourse(g);
    g.state = 'flight'; g.P.x = 100; g.P.y = R + 1; g.P.vx = 30; g.P.vy = -10;
    g.objs = [{ type: 'seal', x: 101, len: 0, used: false, anim: 0 }];
    const before = Math.hypot(30, -10);
    g.collide();
    const ang = Math.atan2(g.P.vy, g.P.vx) * 180 / Math.PI, spd = Math.hypot(g.P.vx, g.P.vy);
    expect(ang).toBeGreaterThanOrEqual(38); expect(ang).toBeLessThanOrEqual(55);
    expect(spd / before).toBeGreaterThanOrEqual(0.96); expect(spd / before).toBeLessThanOrEqual(1.2);
  });
});

describe('결정성', () => {
  const play = seed => {
    const g = new Sim({ rng: mulberry32(seed) });
    const out = [];
    for (let i = 0; i < 20; i++) {
      g.resetRun();
      swingAt(g, PIVOT.y + 1.2 + (i % 5) * 0.2);
      g.advance(300, () => { if (g.state === 'flight' && g.P.vy < 0 && g.P.y < 6 && g.energy > 0) g.action(); return g.state === 'result'; });
      out.push([g.run.dist, g.run.kind, g.run.judge, g.run.wind]);
    }
    return out;
  };
  it('같은 시드 + 같은 입력 → 같은 결과', () => {
    expect(play(123)).toEqual(play(123));
    expect(play(123)).not.toEqual(play(124));
  });
});
