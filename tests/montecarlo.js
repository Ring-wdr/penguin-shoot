import { Sim } from '../src/core/sim.js';
import { mulberry32 } from '../src/core/rng.js';

/*
 * 몬테카를로 분포 측정 (CLAUDE.md "목표 분포" 기준).
 * 사람 타이밍 오차 σ=0.6m, 스윙 선행시간 보정 1.55m, 비행 중 가끔 날개짓.
 */
export function simulate({ runs = 400, seed = 1 } = {}) {
  const rng = mulberry32(seed);          // 코스·바람·물개·폭죽
  const player = mulberry32(seed ^ 0x9E3779B9); // 플레이어 입력 난수
  const gauss = () => { let u = 0; while (!u) u = player(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * player()); };
  const g = new Sim({ rng });
  const out = [];
  for (let i = 0; i < runs; i++) {
    g.resetRun();
    const off = gauss() * 0.6;
    g.advance(10, () => g.state === 'fall' && g.P.y < 8.65 + off + 1.55);
    g.action();
    for (let t = 0; t < 200 && g.state !== 'result'; t += 1 / 60) {
      if (g.state === 'flight' && g.energy > 0 && g.P.vy < 0 && g.P.y < 9 && player() < 0.02) g.action();
      g.advance(1 / 60);
    }
    out.push({ dist: g.run.dist, kind: g.run.kind, judge: g.run.judge });
  }
  return out;
}

export function summarize(results) {
  const d = results.map(r => r.dist).sort((a, b) => a - b);
  const q = f => d[Math.floor(f * (d.length - 1))];
  const share = f => results.filter(f).length / results.length;
  return {
    runs: d.length,
    median: q(0.5), p10: q(0.1), p90: q(0.9), max: d[d.length - 1],
    ge1000: share(r => r.dist >= 1000), ge2000: share(r => r.dist >= 2000),
    crevasse: share(r => r.kind === 'crevasse'),
  };
}
