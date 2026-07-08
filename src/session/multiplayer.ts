export type RelayStatus = 'idle' | 'playing' | 'complete';

export type AttemptResult = {
  attemptNumber: number;
  startDistance: number;
  addedDistance: number;
  score: number;
};

export type CurrentAttempt = {
  attemptNumber: number;
  startDistance: number;
};

export type RelaySession = {
  totalAttempts: number;
  currentAttemptNumber: number;
  currentStartDistance: number;
  status: RelayStatus;
  results: AttemptResult[];
};

const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS = 10;

export function normalizeAttemptCount(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return MIN_ATTEMPTS;
  }

  return Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Math.floor(parsed)));
}

export function createRelaySession(totalAttempts: string | number): RelaySession {
  return {
    totalAttempts: normalizeAttemptCount(totalAttempts),
    currentAttemptNumber: 1,
    currentStartDistance: 0,
    status: 'playing',
    results: [],
  };
}

export function getCurrentAttempt(session: RelaySession): CurrentAttempt | null {
  if (session.status !== 'playing') {
    return null;
  }

  return {
    attemptNumber: session.currentAttemptNumber,
    startDistance: session.currentStartDistance,
  };
}

export function recordAttempt(session: RelaySession, score: number): AttemptResult | null {
  if (session.status !== 'playing' || session.results.length >= session.currentAttemptNumber) {
    return null;
  }

  const safeScore = Number.isFinite(score) ? Math.max(score, session.currentStartDistance) : session.currentStartDistance;
  const result: AttemptResult = {
    attemptNumber: session.currentAttemptNumber,
    startDistance: session.currentStartDistance,
    addedDistance: safeScore - session.currentStartDistance,
    score: safeScore,
  };

  session.results.push(result);

  if (session.currentAttemptNumber >= session.totalAttempts) {
    session.status = 'complete';
  } else {
    session.currentAttemptNumber += 1;
    session.currentStartDistance = result.score;
  }

  return result;
}

export function getNextStartDistance(session: RelaySession): number {
  return session.currentStartDistance;
}

export function getSortedResults(session: RelaySession): AttemptResult[] {
  return [...session.results].sort((left, right) => right.score - left.score || left.attemptNumber - right.attemptNumber);
}
