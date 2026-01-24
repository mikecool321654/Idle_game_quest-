const { test, expect } = require('@playwright/test');

test('Upgrade Scene opens and logic works', async ({ page }) => {
  await page.goto('/');

  // Wait for game load
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Give coins manually to test purchasing
  await page.evaluate(() => {
      window.gameState.coins = 500;
      // We need to trigger UI update in game scene if we change coins manually?
      // Not for opening the scene, but for text.
      // But UpgradeScene reads from gameState when it opens.
  });

  // Open Upgrade Scene (Press B)
  // Note: keydown-B listener in game.js calls handleShopAction
  await page.keyboard.press('B');

  await page.waitForTimeout(1000);

  // Verify Upgrade Scene is active
  const sceneActive = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return scene && scene.sys.settings.active;
  });
  expect(sceneActive).toBe(true);

  // Check coins text in upgrade scene
  const coinsText = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return scene.coinsText.text;
  });
  expect(coinsText).toBe('Coins: 500');

  // Click on 'Double Jump' node
  const nodePos = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      const node = scene.nodes.find(n => n.id === 'double');
      // UpgradeScene stores centerX/Y.
      return { x: scene.centerX + node.x, y: scene.centerY + node.y };
  });

  // Click it
  await page.mouse.click(nodePos.x, nodePos.y);
  await page.waitForTimeout(500);

  // Verify Double Jump bought
  const hasDouble = await page.evaluate(() => {
      return window.gameState.hasDoubleJump;
  });
  expect(hasDouble).toBe(true);

  // Verify coins deducted (Cost 20)
  const coinsAfter = await page.evaluate(() => {
      return window.gameState.coins;
  });
  expect(coinsAfter).toBe(480);
});
