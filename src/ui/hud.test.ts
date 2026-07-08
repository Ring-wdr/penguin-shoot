import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBestDistanceStore, createHud } from './hud';

describe('best distance store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads zero when storage is empty', () => {
    const store = createBestDistanceStore('test-best');

    expect(store.load()).toBe(0);
  });

  it('saves and loads best distance', () => {
    const store = createBestDistanceStore('test-best');

    store.save(14.25);

    expect(store.load()).toBe(14.25);
  });

  it('falls back to memory when storage throws', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    } as unknown as Storage;
    const store = createBestDistanceStore('test-best', storage);

    store.save(9);

    expect(store.load()).toBe(9);
  });

  it('falls back to memory when localStorage access throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('blocked');
    });

    const store = createBestDistanceStore('test-best');

    store.save(7);

    expect(store.load()).toBe(7);
  });

  it('loads zero for corrupted storage values', () => {
    localStorage.setItem('test-best-alpha', '12abc');
    localStorage.setItem('test-best-negative', '-4');

    expect(createBestDistanceStore('test-best-alpha').load()).toBe(0);
    expect(createBestDistanceStore('test-best-negative').load()).toBe(0);
  });

  it('only writes when distance improves the current best', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    } as unknown as Storage;
    const store = createBestDistanceStore('test-best', storage);

    store.save(10);
    store.save(9);
    store.save(10);
    store.save(11);

    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem).toHaveBeenNthCalledWith(1, 'test-best', '10');
    expect(storage.setItem).toHaveBeenNthCalledWith(2, 'test-best', '11');
  });
});

describe('hud', () => {
  it('updates distance and best labels', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <span id="attempt-progress"></span>
      <button id="reset-button"></button>
    `;

    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      attemptProgressElement: document.querySelector('#attempt-progress') as HTMLElement,
      resetButton: document.querySelector('#reset-button') as HTMLButtonElement,
    });

    hud.update({ distance: 12.3, bestDistance: 44.8, phase: 'flying' });

    expect(document.querySelector('#distance')?.textContent).toBe('12 m');
    expect(document.querySelector('#best-distance')?.textContent).toBe('Best 45 m');
    expect((document.querySelector('#reset-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables reset only while aiming at zero distance', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <span id="attempt-progress"></span>
      <button id="reset-button"></button>
    `;
    const resetButton = document.querySelector('#reset-button') as HTMLButtonElement;
    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      attemptProgressElement: document.querySelector('#attempt-progress') as HTMLElement,
      resetButton,
    });

    hud.update({ distance: 0, bestDistance: 0, phase: 'aiming' });
    expect(resetButton.disabled).toBe(true);

    hud.update({ distance: 1, bestDistance: 0, phase: 'aiming' });
    expect(resetButton.disabled).toBe(false);

    hud.update({ distance: 0, bestDistance: 0, phase: 'flying' });
    expect(resetButton.disabled).toBe(false);
  });

  it('calls reset handler when reset button is clicked', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <span id="attempt-progress"></span>
      <button id="reset-button"></button>
    `;
    const resetButton = document.querySelector('#reset-button') as HTMLButtonElement;
    const handler = vi.fn();
    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      attemptProgressElement: document.querySelector('#attempt-progress') as HTMLElement,
      resetButton,
    });

    hud.onReset(handler);
    resetButton.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('updates attempt progress when provided', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <span id="attempt-progress"></span>
      <button id="reset-button"></button>
    `;

    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      attemptProgressElement: document.querySelector('#attempt-progress') as HTMLElement,
      resetButton: document.querySelector('#reset-button') as HTMLButtonElement,
    });

    hud.update({ distance: 12.3, bestDistance: 44.8, phase: 'flying', attemptNumber: 2, totalAttempts: 4 });

    expect(document.querySelector('#attempt-progress')?.textContent).toBe('Attempt 2 / 4');
  });
});
