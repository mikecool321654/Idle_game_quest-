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
    scene.cameras.main.stopFollow();
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
  // OR monsters pooling is active (1 > 0). We check if EITHER shows pooling to avoid flakiness when reuse is perfect.
  const poolingDetected = (stats.starsTotal > stats.starsActive) || (stats.monstersTotal > stats.monstersActive);

  // If reuse is perfect, Total might equal Active. In that case, check if Total is significantly lower than expected for the distance.
  // At 6000px, without reuse, we'd expect > 50 stars. If Total is low (e.g. < 30), reuse is happening.
  const efficientReuse = stats.starsTotal < 40;

  expect(poolingDetected || efficientReuse).toBe(true);
});
