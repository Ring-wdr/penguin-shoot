import { describe, expect, it, vi } from 'vitest';
import type { AttemptResult } from '../session/multiplayer';
import { createRelayOverlays } from './overlays';

describe('relay overlays', () => {
  it('submits a normalized attempt count from the setup overlay', () => {
    document.body.innerHTML = `
      <section id="setup-overlay">
        <input id="attempt-count" value="12" />
        <button id="start-session-button"></button>
      </section>
      <section id="results-overlay" hidden>
        <table>
          <tbody id="results-body"></tbody>
        </table>
        <button id="play-again-button"></button>
      </section>
    `;
    const onStart = vi.fn();
    const overlays = createRelayOverlays({
      setupOverlay: document.querySelector('#setup-overlay') as HTMLElement,
      attemptCountInput: document.querySelector('#attempt-count') as HTMLInputElement,
      startButton: document.querySelector('#start-session-button') as HTMLButtonElement,
      resultsOverlay: document.querySelector('#results-overlay') as HTMLElement,
      resultsBody: document.querySelector('#results-body') as HTMLElement,
      playAgainButton: document.querySelector('#play-again-button') as HTMLButtonElement,
    });

    overlays.onStart(onStart);
    document.querySelector<HTMLButtonElement>('#start-session-button')?.click();

    expect(onStart).toHaveBeenCalledWith(10);
    expect((document.querySelector('#attempt-count') as HTMLInputElement).value).toBe('10');
  });

  it('renders sorted result rows and handles play again', () => {
    document.body.innerHTML = `
      <section id="setup-overlay">
        <input id="attempt-count" value="2" />
        <button id="start-session-button"></button>
      </section>
      <section id="results-overlay" hidden>
        <table>
          <tbody id="results-body"></tbody>
        </table>
        <button id="play-again-button"></button>
      </section>
    `;
    const overlays = createRelayOverlays({
      setupOverlay: document.querySelector('#setup-overlay') as HTMLElement,
      attemptCountInput: document.querySelector('#attempt-count') as HTMLInputElement,
      startButton: document.querySelector('#start-session-button') as HTMLButtonElement,
      resultsOverlay: document.querySelector('#results-overlay') as HTMLElement,
      resultsBody: document.querySelector('#results-body') as HTMLElement,
      playAgainButton: document.querySelector('#play-again-button') as HTMLButtonElement,
    });
    const onPlayAgain = vi.fn();
    const rows: AttemptResult[] = [
      { attemptNumber: 2, startDistance: 100, addedDistance: 60, score: 160 },
      { attemptNumber: 1, startDistance: 0, addedDistance: 100, score: 100 },
    ];

    overlays.showResults(rows);
    overlays.onPlayAgain(onPlayAgain);
    document.querySelector<HTMLButtonElement>('#play-again-button')?.click();

    expect(document.querySelector('#results-overlay')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#results-body')?.textContent).toContain('Attempt 2');
    expect(document.querySelector('#results-body')?.textContent).toContain('160 m');
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
