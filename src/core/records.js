/** 기록 저장 형식: { best, recent[5]: { d, j, c } } */
export const emptyStore = () => ({ best: 0, recent: [] });

export function parseStore(raw) {
  try {
    const s = JSON.parse(raw || 'null');
    if (s && typeof s.best === 'number') return { best: s.best, recent: Array.isArray(s.recent) ? s.recent.slice(0, 5) : [] };
  } catch (e) { /* 손상된 값은 무시 */ }
  return emptyStore();
}

/** 판 결과를 기록에 반영하고 신기록 여부를 돌려준다 */
export function recordRun(store, run) {
  const d = run.dist;
  const isNew = d > store.best + 0.001 && d > 0;
  if (isNew) store.best = d;
  store.recent.unshift({ d: Math.round(d * 10) / 10, j: run.judge || 'miss', c: run.kind === 'crevasse' ? 1 : 0 });
  store.recent = store.recent.slice(0, 5);
  return isNew;
}
