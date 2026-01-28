const { test, expect } = require('@playwright/test');

test('Settings gear tooltip appears on hover', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.forceStartGame);
  await page.evaluate(() => window.forceStartGame());
  await page.waitForFunction(() => typeof player !== 'undefined' && player);

  // Wait for game load
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Check if tooltip is initially hidden or non-existent
  let tooltipVisible = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const tooltip = scene.children.getByName('settingsTooltip');
    return tooltip && tooltip.visible;
  });
  expect(tooltipVisible).toBeFalsy();

  // Hover over the gear icon (30, 100)
  await page.mouse.move(30, 100);
  await page.waitForTimeout(200);

  // Check if tooltip is visible
  tooltipVisible = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const tooltip = scene.children.getByName('settingsTooltip');
    return tooltip && tooltip.visible;
  });
  expect(tooltipVisible).toBeTruthy();

  // Check text content
  const tooltipText = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const tooltip = scene.children.getByName('settingsTooltip');
    return tooltip ? tooltip.text : '';
  });
  expect(tooltipText).toBe('SETTINGS [ESC]');

  // Move away
  await page.mouse.move(300, 300);
  await page.waitForTimeout(200);

  // Check if tooltip is hidden
  tooltipVisible = await page.evaluate(() => {
    const scene = window.game.scene.getScene('GameScene');
    const tooltip = scene.children.getByName('settingsTooltip');
    return tooltip && tooltip.visible;
  });
  expect(tooltipVisible).toBeFalsy();
});
