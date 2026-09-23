// 사용법: npm run montecarlo -- [판 수=400] [시드=1]
import { simulate, summarize } from '../tests/montecarlo.js';

const runs = +(process.argv[2] || 400), seed = +(process.argv[3] || 1);
const s = summarize(simulate({ runs, seed }));
const m = v => `${Math.round(v).toLocaleString()}m`, p = v => `${(v * 100).toFixed(1)}%`;
console.log(`${s.runs}판 (seed ${seed})`);
console.log(`중앙값 ${m(s.median)} · 하위 10% ${m(s.p10)} · 상위 10% ${m(s.p90)} · 최고 ${m(s.max)}`);
console.log(`1,000m 이상 ${p(s.ge1000)} · 2,000m 이상 ${p(s.ge2000)} · 크레바스 종료 ${p(s.crevasse)}`);
