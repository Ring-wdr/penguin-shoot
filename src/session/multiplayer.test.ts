import { describe, expect, it } from 'vitest';
import {
  createRelaySession,
  getCurrentAttempt,
  getNextStartDistance,
  getSortedResults,
  normalizeAttemptCount,
  recordAttempt,
} from './multiplayer';

describe('multiplayer relay session', () => {
  it('normalizes attempt counts to whole numbers from 1 to 10', () => {
    expect(normalizeAttemptCount('')).toBe(1);
    expect(normalizeAttemptCount('0')).toBe(1);
    expect(normalizeAttemptCount('3.8')).toBe(3);
    expect(normalizeAttemptCount('11')).toBe(10);
    expect(normalizeAttemptCount('abc')).toBe(1);
  });

  it('starts with attempt 1 at zero distance', () => {
    const session = createRelaySession(3);

    expect(session.totalAttempts).toBe(3);
    expect(getCurrentAttempt(session)).toEqual({ attemptNumber: 1, startDistance: 0 });
    expect(session.results).toEqual([]);
    expect(session.status).toBe('playing');
  });

  it('records attempts with start distance, added distance, and final score', () => {
    const session = createRelaySession(2);

    const first = recordAttempt(session, 100);
    expect(first).toEqual({
      attemptNumber: 1,
      startDistance: 0,
      addedDistance: 100,
      score: 100,
    });
    expect(session.status).toBe('playing');
    expect(getCurrentAttempt(session)).toEqual({ attemptNumber: 2, startDistance: 100 });
    expect(getNextStartDistance(session)).toBe(100);

    const second = recordAttempt(session, 160);
    expect(second).toEqual({
      attemptNumber: 2,
      startDistance: 100,
      addedDistance: 60,
      score: 160,
    });
    expect(session.status).toBe('complete');
  });

  it('does not record duplicate settled frames for the same attempt', () => {
    const session = createRelaySession(1);

    const first = recordAttempt(session, 42);
    const duplicate = recordAttempt(session, 45);

    expect(first?.score).toBe(42);
    expect(duplicate).toBeNull();
    expect(session.results).toHaveLength(1);
  });

  it('sorts results by score descending without mutating stored order', () => {
    const session = createRelaySession(3);
    recordAttempt(session, 120);
    recordAttempt(session, 180);
    recordAttempt(session, 210);

    expect(session.results.map((result) => result.score)).toEqual([120, 180, 210]);
    expect(getSortedResults(session).map((result) => result.score)).toEqual([210, 180, 120]);
  });
});
