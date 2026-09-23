import { describe, it, expect } from 'vitest';
import { genCourse, crevasseAt, onIce } from '../src/core/course.js';
import { COURSE, HAZARD_FROM } from '../src/core/constants.js';
import { mulberry32 } from '../src/core/rng.js';

describe('genCourse', () => {
  it('같은 시드면 같은 코스', () => {
    expect(genCourse(mulberry32(5))).toEqual(genCourse(mulberry32(5)));
    expect(genCourse(mulberry32(5))).not.toEqual(genCourse(mulberry32(6)));
  });

  it('지상 간격 24~58m, 공중 간격 18~44m, 코스 길이 안', () => {
    for (let s = 1; s <= 30; s++) {
      const { objs, airs } = genCourse(mulberry32(s));
      expect(objs[0].x).toBeGreaterThanOrEqual(40);
      expect(objs[0].x).toBeLessThan(65);
      for (let i = 1; i < objs.length; i++) {
        const gap = objs[i].x - (objs[i - 1].x + objs[i - 1].len);
        expect(gap).toBeGreaterThanOrEqual(24);
        expect(gap).toBeLessThan(58);
      }
      for (let i = 1; i < airs.length; i++) {
        const gap = airs[i].x - airs[i - 1].x;
        expect(gap).toBeGreaterThanOrEqual(18);
        expect(gap).toBeLessThan(44);
      }
      for (const o of [...objs, ...airs]) expect(o.x).toBeLessThan(COURSE);
    }
  });

  it('바위·크레바스는 150m 이후에만, 크레바스 폭 3.5~6m, 빙판 12~22m', () => {
    for (let s = 1; s <= 30; s++) {
      for (const o of genCourse(mulberry32(s)).objs) {
        if (o.type === 'rock' || o.type === 'crevasse') expect(o.x).toBeGreaterThanOrEqual(HAZARD_FROM);
        if (o.type === 'crevasse') { expect(o.len).toBeGreaterThanOrEqual(3.5); expect(o.len).toBeLessThan(6); }
        if (o.type === 'ice') { expect(o.len).toBeGreaterThanOrEqual(12); expect(o.len).toBeLessThan(22); }
      }
    }
  });

  it('공중 오브젝트: 철새 약 55%, 높이 6~54m', () => {
    let birds = 0, n = 0;
    for (let s = 1; s <= 30; s++) {
      for (const a of genCourse(mulberry32(s)).airs) {
        n++; if (a.type === 'birds') { birds++; expect(a.v).toBeGreaterThanOrEqual(3); expect(a.v).toBeLessThan(6); }
        expect(a.y).toBeGreaterThanOrEqual(6); expect(a.y).toBeLessThan(54);
      }
    }
    expect(birds / n).toBeGreaterThan(0.5);
    expect(birds / n).toBeLessThan(0.6);
  });
});

describe('crevasseAt / onIce', () => {
  const objs = [{ type: 'crevasse', x: 100, len: 5 }, { type: 'ice', x: 200, len: 15 }];
  it('크레바스는 가장자리 0.3m를 빼고 판정', () => {
    expect(crevasseAt(objs, 100.2)).toBeNull();
    expect(crevasseAt(objs, 102)).toBe(objs[0]);
    expect(crevasseAt(objs, 104.8)).toBeNull();
  });
  it('빙판 구간', () => {
    expect(onIce(objs, 199)).toBe(false);
    expect(onIce(objs, 210)).toBe(true);
  });
});
