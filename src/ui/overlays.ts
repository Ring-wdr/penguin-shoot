import type { AttemptResult } from '../session/multiplayer';
import { normalizeAttemptCount } from '../session/multiplayer';

export type RelayOverlayElements = {
  setupOverlay: HTMLElement;
  attemptCountInput: HTMLInputElement;
  startButton: HTMLButtonElement;
  resultsOverlay: HTMLElement;
  resultsBody: HTMLElement;
  playAgainButton: HTMLButtonElement;
};

export type RelayOverlays = {
  showSetup: () => void;
  hideSetup: () => void;
  showResults: (results: AttemptResult[]) => void;
  hideResults: () => void;
  onStart: (handler: (attemptCount: number) => void) => void;
  onPlayAgain: (handler: () => void) => void;
};

export function createRelayOverlays(elements: RelayOverlayElements): RelayOverlays {
  return {
    showSetup: () => {
      elements.setupOverlay.hidden = false;
      elements.resultsOverlay.hidden = true;
      elements.attemptCountInput.focus();
      elements.attemptCountInput.select();
    },
    hideSetup: () => {
      elements.setupOverlay.hidden = true;
    },
    showResults: (results) => {
      elements.resultsBody.replaceChildren(...results.map(createResultRow));
      elements.resultsOverlay.hidden = false;
    },
    hideResults: () => {
      elements.resultsOverlay.hidden = true;
      elements.resultsBody.replaceChildren();
    },
    onStart: (handler) => {
      elements.startButton.addEventListener('click', () => {
        const attemptCount = normalizeAttemptCount(elements.attemptCountInput.value);
        elements.attemptCountInput.value = String(attemptCount);
        handler(attemptCount);
      });
    },
    onPlayAgain: (handler) => {
      elements.playAgainButton.addEventListener('click', handler);
    },
  };
}

function createResultRow(result: AttemptResult, index: number): HTMLTableRowElement {
  const row = document.createElement('tr');
  const values = [
    `${index + 1}`,
    `Attempt ${result.attemptNumber}`,
    `${Math.round(result.startDistance)} m`,
    `+${Math.round(result.addedDistance)} m`,
    `${Math.round(result.score)} m`,
  ];

  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }

  return row;
}
