const { test, expect } = require('@playwright/test');

test('Escape key should toggle settings and close upgrade menu', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');

  // Wait for game to load
  await page.waitForTimeout(1000);

  // 1. Test Toggle Settings in Game
  // Initial state: Settings hidden
  let settingsVisible = await page.evaluate(() => {
    return window.game.scene.keys.default.children.getByName('resumeBtn')?.visible;
  });
  expect(settingsVisible).toBeFalsy();

  // Press Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Check if Settings visible
  settingsVisible = await page.evaluate(() => {
    return window.game.scene.keys.default.children.getByName('resumeBtn').visible;
  });
  expect(settingsVisible).toBeTruthy();

  // Press Escape again to close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  settingsVisible = await page.evaluate(() => {
    return window.game.scene.keys.default.children.getByName('resumeBtn').visible;
  });
  expect(settingsVisible).toBeFalsy();


  // 2. Test Close Upgrade Menu
  // Open Upgrade Menu (Press B)
  await page.keyboard.press('b');
  await page.waitForTimeout(1000);

  // Verify Upgrade Scene is active
  let upgradeActive = await page.evaluate(() => {
    return window.game.scene.isActive('UpgradeScene');
  });
  expect(upgradeActive).toBeTruthy();

  // Press Escape to close Upgrade Menu
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);

  // Verify Upgrade Scene is closed
  upgradeActive = await page.evaluate(() => {
    return window.game.scene.isActive('UpgradeScene');
  });
  expect(upgradeActive).toBeFalsy();

  // 3. Verify Settings Menu did NOT open (Race condition check)
  settingsVisible = await page.evaluate(() => {
    return window.game.scene.keys.default.children.getByName('resumeBtn')?.visible;
  });
  expect(settingsVisible).toBeFalsy();
});
