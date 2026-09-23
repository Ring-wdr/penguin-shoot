import { describe, it, expect } from 'vitest';
import { parseStore, recordRun, emptyStore } from '../src/core/records.js';

describe('parseStore', () => {
  it('손상되거나 없는 값은 빈 기록', () => {
    expect(parseStore(null)).toEqual(emptyStore());
    expect(parseStore('{oops')).toEqual(emptyStore());
    expect(parseStore('{"best":"x"}')).toEqual(emptyStore());
  });
  it('최근 기록은 5개까지', () => {
    const s = parseStore(JSON.stringify({ best: 10, recent: [1, 2, 3, 4, 5, 6, 7] }));
    expect(s.best).toBe(10);
    expect(s.recent).toHaveLength(5);
  });
});

describe('recordRun', () => {
  it('신기록이면 best 갱신, 최근 기록은 소수 1자리로 앞에 쌓인다', () => {
    const s = emptyStore();
    expect(recordRun(s, { dist: 123.456, judge: 'great', kind: 'stop' })).toBe(true);
    expect(s.best).toBe(123.456);
    expect(s.recent[0]).toEqual({ d: 123.5, j: 'great', c: 0 });
    expect(recordRun(s, { dist: 50, judge: 'good', kind: 'crevasse' })).toBe(false);
    expect(s.recent[0]).toEqual({ d: 50, j: 'good', c: 1 });
    expect(s.best).toBe(123.456);
  });
  it('헛스윙(0m)은 신기록이 아니고 judge는 miss', () => {
    const s = emptyStore();
    expect(recordRun(s, { dist: 0, judge: null, kind: 'miss' })).toBe(false);
    expect(s.recent[0].j).toBe('miss');
  });
  it('최근 기록은 5개 유지', () => {
    const s = emptyStore();
    for (let i = 0; i < 8; i++) recordRun(s, { dist: i, judge: 'good', kind: 'stop' });
    expect(s.recent).toHaveLength(5);
    expect(s.recent[0].d).toBe(7);
  });
});
