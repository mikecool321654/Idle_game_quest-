const { test, expect } = require('@playwright/test');

test('Magnet upgrade attracts items', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.forceStartGame);
  await page.evaluate(() => window.forceStartGame());
  await page.waitForFunction(() => typeof player !== 'undefined' && player);

  // Grant Magnet
  await page.evaluate(() => {
    window.gameState.hasMagnet = true;
  });

  // Test Static Body (Star)
  const starMoved = await page.evaluate(async () => {
      // Clear existing stars to avoid confusion
      stars.clear(true, true);

      const x = player.x + 150; // Within 300 range
      const y = player.y;
      const star = stars.create(x, y, 'star');
      star.enableBody(true, x, y, true, true);
      const initialX = star.x;

      // Wait for update loop
      return new Promise(resolve => {
          setTimeout(() => {
              // It should have moved towards player (left)
              // Since player is moving right, and star is to the right,
              // star gets pulled left (towards player).
              resolve({
                  moved: star.x !== initialX,
                  delta: star.x - initialX,
                  newX: star.x,
                  oldX: initialX
              });
          }, 300);
      });
  });

  console.log('Star movement:', starMoved);
  expect(starMoved.moved).toBe(true);

  // Test Dynamic Body (Loot)
  const lootMoved = await page.evaluate(async () => {
      loot.clear(true, true);
      const x = player.x + 150;
      const y = player.y;
      const item = loot.create(x, y, 'star');
      item.setActive(true).setVisible(true);
      // Ensure it has a body
      if (!item.body) scene.physics.world.enable(item);

      const initialX = item.x;

      return new Promise(resolve => {
          setTimeout(() => {
              resolve({
                  moved: Math.abs(item.x - initialX) > 1,
                  delta: item.x - initialX
              });
          }, 300);
      });
  });

  console.log('Loot movement:', lootMoved);
  expect(lootMoved.moved).toBe(true);
});
