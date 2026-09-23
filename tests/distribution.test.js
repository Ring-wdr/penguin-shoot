import { describe, it, expect } from 'vitest';
import { simulate, summarize } from './montecarlo.js';

/*
 * 목표 분포 회귀 테스트 (사용자 승인: "대박은 5판에 1번").
 * 원본(index.html 단일 파일) 4,000판 측정: 중앙값 477m · 하위 10% 208m · 상위 10% 1,306m
 *   · 1,000m 이상 18.2% · 2,000m 이상 3.1% · 크레바스 11.1%
 * 시드 고정이라 결과는 매번 같다. 물리·가중치를 바꿔 이 범위를 벗어나면 기획 확인이 필요하다.
 */
describe('비거리 분포', () => {
  const s = summarize(simulate({ runs: 1200, seed: 2026 }));

  it('중앙값 · 하위/상위 10%', () => {
    expect(s.median).toBeGreaterThan(400); expect(s.median).toBeLessThan(560);
    expect(s.p10).toBeGreaterThan(170); expect(s.p10).toBeLessThan(250);
    expect(s.p90).toBeGreaterThan(1100); expect(s.p90).toBeLessThan(1550);
  });

  it('대박(1,000m 이상)은 대략 5판에 1번', () => {
    expect(s.ge1000).toBeGreaterThan(0.14); expect(s.ge1000).toBeLessThan(0.23);
    expect(s.ge2000).toBeGreaterThan(0.01); expect(s.ge2000).toBeLessThan(0.06);
  });

  it('크레바스 종료 비율', () => {
    expect(s.crevasse).toBeGreaterThan(0.07); expect(s.crevasse).toBeLessThan(0.15);
  });
});
