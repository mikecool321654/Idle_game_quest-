
const { test, expect } = require('@playwright/test');

test('Exit button should close the upgrade menu', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');

  // Wait for StartScene to be ready and expose forceStartGame
  await page.waitForFunction(() => window.forceStartGame);

  // Start the game
  await page.evaluate(() => window.forceStartGame());

  // Wait for GameScene to be active
  await page.waitForFunction(() => window.game.scene.isActive('GameScene'));

  // Wait a bit for game to stabilize
  await page.waitForTimeout(1000);

  // Open Upgrade Menu (Press B)
  await page.keyboard.press('b');
  await page.waitForTimeout(1000);

  // Verify Upgrade Scene is active
  let upgradeActive = await page.evaluate(() => {
    return window.game.scene.isActive('UpgradeScene');
  });
  expect(upgradeActive).toBeTruthy();

  // Find and click the exit button
  await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      // Find the text object with text 'X'
      const closeBtn = scene.children.list.find(child => child.text === 'X');
      if (closeBtn) {
          // Simulate pointer down
          closeBtn.emit('pointerdown');
      } else {
          throw new Error("Close button not found");
      }
  });

  await page.waitForTimeout(1000);

  // Verify Upgrade Scene is closed (not active)
  upgradeActive = await page.evaluate(() => {
    return window.game.scene.isActive('UpgradeScene');
  });

  // This expectation should fail if the bug exists
  expect(upgradeActive).toBeFalsy();

  // Verify GameScene physics resumed
  const isPhysicsPaused = await page.evaluate(() => {
      return window.game.scene.getScene('GameScene').physics.world.isPaused;
  });
  expect(isPhysicsPaused).toBeFalsy();
});
