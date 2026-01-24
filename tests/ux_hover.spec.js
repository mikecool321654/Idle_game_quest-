const { test, expect } = require('@playwright/test');

test('Upgrade Scene description works on hover', async ({ page }) => {
  await page.goto('/');

  // Wait for game load
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Open Upgrade Scene (Press B)
  await page.keyboard.press('B');
  await page.waitForTimeout(1000);

  // Check if description text object exists
  const descTextExists = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return !!scene.descriptionText;
  });

  // This expectation should fail initially
  expect(descTextExists).toBe(true);

  // Get 'Double Jump' node position
  const nodePos = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      const node = scene.nodes.find(n => n.id === 'double');
      return { x: scene.centerX + node.x, y: scene.centerY + node.y };
  });

  // Hover over the node
  await page.mouse.move(nodePos.x, nodePos.y);
  await page.waitForTimeout(200);

  // Check description text content
  const descTextContent = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return scene.descriptionText.text;
  });

  expect(descTextContent).toContain('Jump a second time');
});
