import './style.css';

const requiredShellSelectors = [
  '#app',
  '#game-canvas',
  '#hud',
  '#distance',
  '#best-distance',
  '#reset-button',
  '#message',
] as const;

const missingShellSelectors = requiredShellSelectors.filter((selector) => !document.querySelector(selector));

if (missingShellSelectors.length > 0) {
  throw new Error(`Penguin Shoot scaffold is missing required shell elements: ${missingShellSelectors.join(', ')}`);
}

console.info('Penguin Shoot scaffold ready.');
