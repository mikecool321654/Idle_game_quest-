const { test, expect } = require('@playwright/test');

test('Gear icon shows tooltip on hover', async ({ page }) => {
  await page.goto('/');
  // Start game
  await page.waitForFunction(() => window.forceStartGame);
  await page.evaluate(() => window.forceStartGame());
  await page.waitForFunction(() => typeof player !== 'undefined' && player);

  // Wait for UI to be created
  await page.waitForSelector('canvas');
  // Wait a bit for everything to settle
  await page.waitForTimeout(1000);

  // Get gear icon position. It is at x=30, y=100.
  // But we should try to locate it via game internals to be robust.
  const gearPos = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      // We can find the gear image. It doesn't have a name, but it has the texture 'gear'.
      const gear = scene.children.list.find(c => c.texture && c.texture.key === 'gear');
      return { x: gear.x, y: gear.y };
  });

  expect(gearPos).toBeTruthy();
  expect(gearPos.x).toBe(30);
  expect(gearPos.y).toBe(100);

  // Hover over the gear icon
  await page.mouse.move(gearPos.x, gearPos.y);
  await page.waitForTimeout(200);

  // Check if tooltip is visible
  const tooltipVisible = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      // Find text object with content 'SETTINGS [ESC]'
      const tooltip = scene.children.list.find(c => c.type === 'Text' && c.text === 'SETTINGS [ESC]');
      return tooltip && tooltip.visible;
  });

  expect(tooltipVisible).toBe(true);

  // Move away
  await page.mouse.move(300, 300);
  await page.waitForTimeout(200);

  // Check if tooltip is hidden
  const tooltipHidden = await page.evaluate(() => {
      const scene = window.game.scene.getScene('GameScene');
      const tooltip = scene.children.list.find(c => c.type === 'Text' && c.text === 'SETTINGS [ESC]');
      return tooltip && !tooltip.visible;
  });

  expect(tooltipHidden).toBe(true);
});
