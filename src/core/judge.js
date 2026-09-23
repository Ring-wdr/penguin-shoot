import { clamp } from './math.js';

/**
 * 스윙 타격 판정. dy = 펭귄 y − PIVOT.y (방망이가 각도 0을 지나는 순간)
 * @returns {{ judge: 'perfect'|'great'|'good'|'weak', angle: number, speed: number, q: number }}
 */
export function judgeHit(dy) {
  const e = Math.abs(dy - 0.1);
  const q = clamp(1 - e / 1.75, 0, 1);
  const judge = e < 0.38 ? 'perfect' : e < 0.8 ? 'great' : e < 1.25 ? 'good' : 'weak';
  const angle = clamp(38 + (dy - 0.1) * 12, 12, 62);
  let speed = 30 + 31 * Math.pow(q, 1.3);
  if (judge === 'perfect') speed *= 1.08;
  return { judge, angle, speed, q };
}

/** 스윙이 펭귄에 닿는지 (피벗 기준 상대 위치) */
export const inSwingReach = (dx, dy) => Math.abs(dy) < 1.75 && Math.abs(dx - 3.05) < 1.0;

/** 판마다 바람: 15% 무풍, 그 외 −15%~+15% (1% 단위) */
export function rollWind(rng) {
  const wr = rng();
  return wr < 0.15 ? 0 : Math.round((-0.15 + rng() * 0.3) * 100) / 100;
}
