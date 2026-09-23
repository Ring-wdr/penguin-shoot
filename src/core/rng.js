/** 시드 고정 PRNG(mulberry32). Math.random과 같은 [0, 1) 범위를 돌려준다. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rng에 묶인 범위 난수 */
export const ranger = rng => (a, b) => a + rng() * (b - a);

/** [key, weight] 목록에서 가중치 추첨 */
export function pick(rng, weights) {
  let t = rng() * weights.reduce((s, w) => s + w[1], 0);
  for (const [k, w] of weights) { t -= w; if (t <= 0) return k; }
  return weights[0][0];
}
