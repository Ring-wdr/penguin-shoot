import { describe, it, expect } from 'vitest';
import { judgeHit, inSwingReach, rollWind } from '../src/core/judge.js';
import { mulberry32 } from '../src/core/rng.js';

describe('judgeHit', () => {
  it('오차 경계값으로 등급을 나눈다 (e = |dy − 0.1|)', () => {
    expect(judgeHit(0.1).judge).toBe('perfect');
    expect(judgeHit(0.1 + 0.37).judge).toBe('perfect');
    expect(judgeHit(0.1 + 0.39).judge).toBe('great');
    expect(judgeHit(0.1 - 0.79).judge).toBe('great');
    expect(judgeHit(0.1 + 0.81).judge).toBe('good');
    expect(judgeHit(0.1 + 1.24).judge).toBe('good');
    expect(judgeHit(0.1 + 1.3).judge).toBe('weak');
  });

  it('정중앙 PERFECT는 (30 + 31) × 1.08 m/s, 38°', () => {
    const h = judgeHit(0.1);
    expect(h.speed).toBeCloseTo(61 * 1.08, 10);
    expect(h.angle).toBe(38);
  });

  it('발사각은 38° + (dy−0.1)×12°를 12~62°로 자른다', () => {
    expect(judgeHit(1.1).angle).toBeCloseTo(50);
    expect(judgeHit(-5).angle).toBe(12);
    expect(judgeHit(5).angle).toBe(62);
  });

  it('속도는 30 + 31·q^1.3', () => {
    const h = judgeHit(0.1 + 0.875); // e = 0.875 → q = 0.5, GOOD
    expect(h.judge).toBe('good');
    expect(h.speed).toBeCloseTo(30 + 31 * Math.pow(0.5, 1.3), 10);
  });
});

describe('inSwingReach', () => {
  it('|dy| < 1.75, 고리 x에서 1m 이내', () => {
    expect(inSwingReach(3.05, 0)).toBe(true);
    expect(inSwingReach(3.05, 1.74)).toBe(true);
    expect(inSwingReach(3.05, 1.76)).toBe(false);
    expect(inSwingReach(1.9, 0)).toBe(false);
  });
});

describe('rollWind', () => {
  it('약 15%는 무풍, 나머지는 ±0.15 안의 1% 단위', () => {
    const rng = mulberry32(42);
    let calm = 0;
    for (let i = 0; i < 20000; i++) {
      const w = rollWind(rng);
      expect(Math.abs(w)).toBeLessThanOrEqual(0.15);
      expect(Math.round(w * 100)).toBeCloseTo(w * 100, 8);
      if (w === 0) calm++;
    }
    expect(calm / 20000).toBeGreaterThan(0.14);
    expect(calm / 20000).toBeLessThan(0.18); // 무풍 15% + 반올림 0 약간
  });
});
