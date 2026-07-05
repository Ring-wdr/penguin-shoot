import { expect, test } from '@playwright/test';

test('launches, records distance, and resets', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const startX = box.x + box.width * 0.28;
  const startY = box.y + box.height * 0.58;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 95, startY + 42, { steps: 8 });
  await page.mouse.up();

  await expect.poll(async () => {
    const text = await page.locator('#distance').textContent();
    return Number.parseInt(text ?? '0', 10);
  }).toBeGreaterThan(1);

  await page.locator('#reset-button').click();
  await expect(page.locator('#distance')).toHaveText('0 m');
});

test('mobile viewport keeps HUD readable and prevents touch scrolling during aim', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile touch-scroll smoke coverage only runs in the mobile project.');

  await page.goto('/');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#reset-button')).toBeVisible();

  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  const beforeScroll = await page.evaluate(() => window.scrollY);
  await canvas.evaluate((element) => {
    const originalSetPointerCapture = element.setPointerCapture.bind(element);
    element.setPointerCapture = (pointerId: number) => {
      try {
        originalSetPointerCapture(pointerId);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'NotFoundError')) {
          throw error;
        }
      }
    };
  });

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 21,
    pointerType: 'touch',
    clientX: box.x + box.width * 0.42,
    clientY: box.y + box.height * 0.58,
    bubbles: true,
    cancelable: true,
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 21,
    pointerType: 'touch',
    clientX: box.x + box.width * 0.22,
    clientY: box.y + box.height * 0.64,
    bubbles: true,
    cancelable: true,
  });
  await canvas.dispatchEvent('pointercancel', {
    pointerId: 21,
    pointerType: 'touch',
    bubbles: true,
    cancelable: true,
  });

  const afterScroll = await page.evaluate(() => window.scrollY);
  expect(afterScroll).toBe(beforeScroll);
});
