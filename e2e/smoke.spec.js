import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.errors = errors;
});

test('타이틀 → 시작 → 스윙 → 결과 → 다시 던지기', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#title')).toBeVisible();
  await expect(page.locator('#game canvas')).toBeVisible();
  await page.waitForFunction(() => window.__game && window.__game.state === 'title');

  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page.locator('#title')).toBeHidden();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hint')).toContainText('노란 고리');

  // 실제 렌더 루프(requestAnimationFrame)로 상태가 진행되는지 확인
  await page.waitForFunction(() => window.__game.state !== 'ready', null, { timeout: 30_000 });

  // 로직은 advance로 빨리 감는다: 고리 높이에서 스윙 → 끝까지
  const run = await page.evaluate(() => {
    const g = window.__game;
    g.advance(10, () => g.state === 'fall' && g.P.y < 8.65 + 1.55);
    g.action();
    g.advance(300, () => g.state === 'result');
    return { state: g.state, dist: g.run.dist, judge: g.run.judge };
  });
  expect(run.state).toBe('result');
  expect(run.judge).toBe('perfect');
  expect(run.dist).toBeGreaterThan(50);

  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#r-dist')).toHaveText(run.dist.toFixed(1));
  await expect(page.locator('#r-judge')).toHaveText('PERFECT 타격');
  await expect(page.locator('#r-new')).toBeVisible();
  await expect(page.locator('#r-list li')).toHaveCount(1);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('penguin-smash-3d')));
  expect(saved.best).toBeCloseTo(run.dist, 5);

  await page.getByRole('button', { name: '다시 던지기' }).click();
  await expect(page.locator('#result')).toBeHidden();
  expect(await page.evaluate(() => window.__game.state)).toBe('ready');
  await expect(page.locator('#best')).toHaveText(run.dist.toFixed(1));

  expect(page.errors).toEqual([]);
});

test('헛스윙하면 0m, 신기록 아님', async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => window.__game);
  await page.keyboard.press('Space'); // 타이틀에서 스페이스 = 시작
  await expect(page.locator('#hud')).toBeVisible();
  await page.evaluate(() => { const g = window.__game; g.action(); g.advance(60, () => g.state === 'result'); });
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#r-dist')).toHaveText('0.0');
  await expect(page.locator('#r-judge')).toHaveText('헛스윙');
  await expect(page.locator('#r-new')).toBeHidden();
  expect(page.errors).toEqual([]);
});

test('세로 화면(390px)에서 가로 스크롤 없음', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.locator('#title .panel')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.locator('#title .panel').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});
