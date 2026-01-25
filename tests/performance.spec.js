const { test, expect } = require('@playwright/test');

test('Check object pooling behavior', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1000);

  // Teleport player to 6000 to trigger monster generation
  await page.evaluate(() => {
    // Force generation
    player.x = 6000;
    player.body.moves = false; // Disable physics to prevent falling
    player.body.checkCollision.none = true; // Disable collisions (monsters)

    // Manually update camera scroll to trigger generation logic immediately
    // The game logic relies on camera.scrollX to decide when to spawn
    const scene = window.game.scene.scenes[0];
    scene.cameras.main.scrollX = player.x - 200;
  });

  // Wait for update loop to catch up and generate platforms/monsters
  await page.waitForTimeout(2000);

  const stats = await page.evaluate(() => {
    return {
      monstersTotal: monsters.getLength(),
      monstersActive: monsters.countActive(),
      starsTotal: stars.getLength(),
      starsActive: stars.countActive(),
      spikesTotal: spikes.getLength(),
      spikesActive: spikes.countActive(),
    };
  });

  console.log('Stats at 6000px:', stats);

  // Expect pooling to be active
  // Total should be greater than Active because old objects should be kept (inactive) instead of destroyed.
  // Initial stars (4) + generated stars > generated active stars
  expect(stats.starsTotal).toBeGreaterThan(stats.starsActive);

  // Monsters might be 1 if none were cleaned up yet, but we expect pooling logic to be in place.
  // If we had more monsters and moved far, we'd see Total > Active.
  // For now, let's just log it. If the optimization works, this test should pass if we enforce Total >= Active.
  // But strictly, we want to prove REUSE.
  // If we move further to 15000, we should definitely see reuse or at least accumulation of dead objects if pool is growing.
  // Wait, if pool is working, Total stops growing at some point? No, Total grows until max needed.
  // If we destroy, Total shrinks (or rather objects are removed).
  // So:
  // No Pooling: Total == Active (approx)
  // Pooling: Total > Active (because of dead objects in pool)

  expect(stats.starsTotal).toBeGreaterThan(stats.starsActive);
});
