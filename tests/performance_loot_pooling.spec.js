const { test, expect } = require('@playwright/test');

test('Loot objects should be pooled', async ({ page }) => {
  // Navigate to the game
  await page.goto('/');

  // Wait for the game to be ready
  await page.waitForFunction(() => window.forceStartGame);

  // Start the game
  await page.evaluate(() => window.forceStartGame());

  // Wait for player object to be initialized
  await page.waitForFunction(() => typeof player !== 'undefined' && player && player.active);

  // Wait for game loop to stabilize
  await page.waitForTimeout(1000);

  // Initial Check - should be 0 or small
  const initialStats = await page.evaluate(() => {
    return {
        total: loot.getLength(),
        active: loot.countActive(true),
        inactive: loot.countActive(false)
    };
  });
  console.log('Initial Loot Stats:', initialStats);

  // Spawn 10 loot items at a safe position (e.g., above player)
  await page.evaluate(() => {
    const scene = game.scene.getScene('GameScene');
    // Ensure player exists
    if (!player) return;

    for (let i = 0; i < 10; i++) {
        // We use the global spawnLoot function if available, or create manually if not exposed (it is global in game.js)
        spawnLoot(scene, player.x, player.y - 200);
    }
  });

  // Verify they exist and are active
  const statsAfterSpawn = await page.evaluate(() => {
    return {
        total: loot.getLength(),
        active: loot.countActive(true),
        inactive: loot.countActive(false)
    };
  });
  console.log('Stats after spawn:', statsAfterSpawn);
  expect(statsAfterSpawn.active).toBeGreaterThanOrEqual(10);

  // Move camera forward significantly to trigger cleanup.
  // The cleanup function checks: if (child.x < cleanupThreshold) where cleanupThreshold = scrollX - 200.
  // If we move scrollX forward by 1000, the old loot at player.x should be < scrollX - 200 (assuming player.x < newScrollX - 200).

  await page.evaluate(() => {
    const scene = game.scene.getScene('GameScene');

    // Stop camera follow so we can control scrollX
    scene.cameras.main.stopFollow();

    // Move scrollX far ahead
    // Current player.x is around 100.
    // Set scrollX to 2000.
    scene.cameras.main.scrollX = 2000;
  });

  // Wait for cleanup (throttled 500ms)
  await page.waitForTimeout(2000);

  // Check stats again
  const finalStats = await page.evaluate(() => {
    return {
        total: loot.getLength(),
        active: loot.countActive(true),
        inactive: loot.countActive(false)
    };
  });
  console.log('Final Stats:', finalStats);

  // Assertion:
  // We assert that inactive count is at least 10.
  // This will fail initially because destroy() removes them completely.
  expect(finalStats.inactive).toBeGreaterThanOrEqual(10);
});
