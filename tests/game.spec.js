const { test, expect } = require('@playwright/test');

test('Game loads and player stays on platform (no early cleanup)', async ({ page }) => {
  await page.goto('/');

  // Wait for canvas
  await expect(page.locator('canvas')).toBeVisible();

  // Wait 3.2 seconds.
  await page.waitForTimeout(3200);

  const playerState = await page.evaluate(() => {
    try {
        const p = player;
        return {
            y: p.y,
            vy: p.body.velocity.y,
            groundY: lastPlatformY,
            robotTextContent: robotText.text
        };
    } catch (e) {
        return { error: e.toString() };
    }
  });

  console.log('Player State at 3.2s:', playerState);

  // Player should be grounded. Velocity Y should be 0 (or very close).
  expect(playerState.vy).toBeLessThan(10);
  expect(playerState.vy).toBeGreaterThan(-10);

  // Verify robot version text matches MK-1
  expect(playerState.robotTextContent).toBe('Robot MK-1');
});
