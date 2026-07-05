import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBestDistanceStore, createHud } from './hud';

describe('best distance store', () => {
  beforeEach(() => {
    localStorage.clear();
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
});

describe('hud', () => {
  it('updates distance and best labels', () => {
    document.body.innerHTML = `
      <span id="distance"></span>
      <span id="best-distance"></span>
      <button id="reset-button"></button>
    `;

    const hud = createHud({
      distanceElement: document.querySelector('#distance') as HTMLElement,
      bestDistanceElement: document.querySelector('#best-distance') as HTMLElement,
      resetButton: document.querySelector('#reset-button') as HTMLButtonElement,
    });

    hud.update({ distance: 12.3, bestDistance: 44.8, phase: 'flying' });

    expect(document.querySelector('#distance')?.textContent).toBe('12 m');
    expect(document.querySelector('#best-distance')?.textContent).toBe('Best 45 m');
    expect((document.querySelector('#reset-button') as HTMLButtonElement).disabled).toBe(false);
  });
});
