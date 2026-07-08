import type { GamePhase } from '../simulation/game';

export type HudElements = {
  distanceElement: HTMLElement;
  bestDistanceElement: HTMLElement;
  attemptProgressElement?: HTMLElement;
  resetButton: HTMLButtonElement;
};

export type HudState = {
  distance: number;
  bestDistance: number;
  phase: GamePhase;
  attemptNumber?: number;
  totalAttempts?: number;
};

export type Hud = {
  update: (state: HudState) => void;
  onReset: (handler: () => void) => void;
};

export type BestDistanceStore = {
  load: () => number;
  save: (distance: number) => void;
};

function getDefaultStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function parseStoredDistance(rawValue: string): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function createHud(elements: HudElements): Hud {
  return {
    update: (state) => {
      elements.distanceElement.textContent = `${Math.round(state.distance)} m`;
      elements.bestDistanceElement.textContent = `Best ${Math.round(state.bestDistance)} m`;
      if (elements.attemptProgressElement) {
        elements.attemptProgressElement.textContent =
          state.attemptNumber && state.totalAttempts ? `Attempt ${state.attemptNumber} / ${state.totalAttempts}` : '';
      }
      elements.resetButton.disabled = state.phase === 'aiming' && state.distance === 0;
    },
    onReset: (handler) => {
      elements.resetButton.addEventListener('click', handler);
    },
  };
}

export function createBestDistanceStore(key: string, storage?: Storage): BestDistanceStore {
  let memoryValue = 0;

  return {
    load: () => {
      try {
        const rawValue = (storage ?? getDefaultStorage())?.getItem(key);
        if (rawValue === null) {
          return memoryValue;
        }

        memoryValue = rawValue === undefined ? memoryValue : parseStoredDistance(rawValue);
        return memoryValue;
      } catch {
        return memoryValue;
      }
    },
    save: (distance) => {
      if (!Number.isFinite(distance) || distance <= memoryValue) {
        return;
      }

      memoryValue = distance;
      try {
        (storage ?? getDefaultStorage())?.setItem(key, String(memoryValue));
      } catch {
        return;
      }
    },
  };
}
