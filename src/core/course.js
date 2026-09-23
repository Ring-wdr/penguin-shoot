import { COURSE, GROUND_WEIGHTS, HAZARD_FROM } from './constants.js';
import { pick, ranger } from './rng.js';

/**
 * 코스 오브젝트 배치(순수 데이터). 메시는 뷰가 붙인다.
 * 지상 간격 24~58m, 공중 18~44m.
 */
export function genCourse(rng) {
  const rand = ranger(rng);
  const objs = [], airs = [];
  let x = rand(40, 65);
  while (x < COURSE) {
    let type = pick(rng, GROUND_WEIGHTS);
    if ((type === 'rock' || type === 'crevasse') && x < HAZARD_FROM) type = 'seal';
    const len = type === 'ice' ? rand(12, 22) : type === 'crevasse' ? rand(3.5, 6) : 0;
    objs.push({ type, x, len, used: false, anim: 0 });
    x += len + rand(24, 58);
  }
  x = rand(30, 55);
  while (x < COURSE) {
    const type = rng() < 0.55 ? 'birds' : 'balloon';
    const y = 6 + Math.pow(rng(), 1.3) * 48;
    airs.push({ type, x, y, y0: y, used: false, t: 0, v: type === 'birds' ? rand(3, 6) : 0 });
    x += rand(18, 44);
  }
  return { objs, airs };
}

export function crevasseAt(objs, x) {
  for (const o of objs) if (o.type === 'crevasse' && x > o.x + 0.3 && x < o.x + o.len - 0.3) return o;
  return null;
}
export function onIce(objs, x) {
  for (const o of objs) if (o.type === 'ice' && x > o.x && x < o.x + o.len) return true;
  return false;
}

/** 풍선이 위아래로 떠다니는 높이 (판정 y) */
export const balloonY = (o, time) => o.y0 + Math.sin(time * 1.3 + o.x) * 0.35;
