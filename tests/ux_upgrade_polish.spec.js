const { test, expect } = require('@playwright/test');

test('Upgrade Scene preserves camera position after purchase', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.forceStartGame);
  await page.evaluate(() => window.forceStartGame());

  // Wait for game load
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);

  // Give coins manually to ensure we can buy 'Double Jump' (Cost 20)
  await page.evaluate(() => {
      window.gameState.coins = 500;
  });

  // Open Upgrade Scene (Press B)
  await page.keyboard.press('B');
  await page.waitForTimeout(1000);

  // Get initial camera scroll
  const initialScroll = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };
  });
  expect(initialScroll.x).toBe(0);
  expect(initialScroll.y).toBe(0);

  // Pan the camera
  // Drag from center to left
  const viewport = await page.viewportSize();
  const startX = viewport.width / 2;
  const startY = viewport.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 100, startY, { steps: 5 }); // Drag left 100px
  await page.mouse.up();

  // Wait for update
  await page.waitForTimeout(500);

  // Check scroll changed
  const pannedScroll = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };
  });
  // Dragging left (negative delta) means scrollX -= negative -> scrollX increases
  expect(pannedScroll.x).toBeGreaterThan(50);

  // Find 'Double Jump' node position relative to screen (accounting for scroll)
  // Node x: 0, y: -200 (relative to center)
  // Screen X = (CenterX + NodeX) - ScrollX
  const clickPos = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      const node = scene.nodes.find(n => n.id === 'double');
      const screenX = (scene.centerX + node.x) - scene.cameras.main.scrollX;
      const screenY = (scene.centerY + node.y) - scene.cameras.main.scrollY;
      return { x: screenX, y: screenY };
  });

  // Click 'Double Jump'
  await page.mouse.click(clickPos.x, clickPos.y);

  // Wait for scene restart
  await page.waitForTimeout(1000);

  // Verify upgrade bought
  const hasDouble = await page.evaluate(() => {
      return window.gameState.hasDoubleJump;
  });
  expect(hasDouble).toBe(true);

  // Verify Camera Scroll is preserved
  const finalScroll = await page.evaluate(() => {
      const scene = window.game.scene.getScene('UpgradeScene');
      return { x: scene.cameras.main.scrollX, y: scene.cameras.main.scrollY };
  });

  // Should be close to pannedScroll
  expect(Math.abs(finalScroll.x - pannedScroll.x)).toBeLessThan(1);
  expect(Math.abs(finalScroll.y - pannedScroll.y)).toBeLessThan(1);
});

test('Upgrade Scene shows feedback for insufficient funds', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForTimeout(1000);

    // Set low coins
    await page.evaluate(() => {
        window.gameState.coins = 0;
    });

    // Open Upgrade Scene
    await page.keyboard.press('B');
    await page.waitForTimeout(1000);

    // Find 'Double Jump' node (Cost 20)
    // It should be 'poor' state (orange/red)
    const clickPos = await page.evaluate(() => {
        const scene = window.game.scene.getScene('UpgradeScene');
        const node = scene.nodes.find(n => n.id === 'double');
        return {
            x: scene.centerX + node.x,
            y: scene.centerY + node.y
        };
    });

    // Click it
    await page.mouse.click(clickPos.x, clickPos.y);
    await page.waitForTimeout(100);

    // Verify Description Text Changed to Red Warning
    const descriptionColor = await page.evaluate(() => {
        const scene = window.game.scene.getScene('UpgradeScene');
        return scene.descriptionText.style.color;
    });

    expect(descriptionColor).toBe('#ff0000');

    const descriptionText = await page.evaluate(() => {
        const scene = window.game.scene.getScene('UpgradeScene');
        return scene.descriptionText.text;
    });

    expect(descriptionText).toContain('INSUFFICIENT FUNDS');
});
