import type { GamePhase } from '../simulation/game';

export type HudElements = {
  distanceElement: HTMLElement;
  bestDistanceElement: HTMLElement;
  resetButton: HTMLButtonElement;
};

export type HudState = {
  distance: number;
  bestDistance: number;
  phase: GamePhase;
};

export type Hud = {
  update: (state: HudState) => void;
  onReset: (handler: () => void) => void;
};

export type BestDistanceStore = {
  load: () => number;
  save: (distance: number) => void;
};

export function createHud(elements: HudElements): Hud {
  return {
    update: (state) => {
      elements.distanceElement.textContent = `${Math.round(state.distance)} m`;
      elements.bestDistanceElement.textContent = `Best ${Math.round(state.bestDistance)} m`;
      elements.resetButton.disabled = state.phase === 'aiming' && state.distance === 0;
    },
    onReset: (handler) => {
      elements.resetButton.addEventListener('click', handler);
    },
  };
}

export function createBestDistanceStore(key: string, storage: Storage = window.localStorage): BestDistanceStore {
  let memoryValue = 0;

  return {
    load: () => {
      try {
        const rawValue = storage.getItem(key);
        if (rawValue === null) {
          return memoryValue;
        }

        const parsed = Number.parseFloat(rawValue);
        memoryValue = Number.isFinite(parsed) ? parsed : 0;
        return memoryValue;
      } catch {
        return memoryValue;
      }
    },
    save: (distance) => {
      memoryValue = Math.max(memoryValue, distance);
      try {
        storage.setItem(key, String(memoryValue));
      } catch {
        return;
      }
    },
  };
}
