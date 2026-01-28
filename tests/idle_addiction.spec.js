const { test, expect } = require('@playwright/test');

test.describe('Idle & Addiction Features', () => {

  test('Scavenger Upgrade activates boost on collection', async ({ page }) => {
    await page.goto('/');

    // Inject Scavenger Upgrade BEFORE start
    await page.evaluate(() => {
        window.gameState = window.gameState || {};
        window.gameState.hasScavenger = true;
        window.gameState.hasCoinMaker = true;
    });

    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForFunction(() => typeof player !== 'undefined' && player);

    // Initial State: No Boost
    const initialTime = await page.evaluate(() => window.gameState.scavengerEndTime);
    expect(initialTime).toBeUndefined();

    // Simulate collecting a star via direct function call
    await page.evaluate(() => {
        // Create a mock star object since we just need it to pass to the function
        const star = {
            disableBody: () => {},
            x: 0,
            y: 0,
            destroy: () => {}
        };
        // Ensure collectStar is accessible. It is global in game.js logic (defined as function)
        collectStar(player, star);
    });

    // Verify Boost Active
    const boostedTime = await page.evaluate(() => window.gameState.scavengerEndTime);
    expect(boostedTime).toBeDefined();
    const now = Date.now();
    // Allow small margin for execution time
    expect(boostedTime).toBeGreaterThan(now);
    expect(boostedTime).toBeLessThan(now + 3000);
  });

  test('Minimap enemies layer is initialized', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForFunction(() => typeof player !== 'undefined' && player);

    const minimapCheck = await page.evaluate(() => {
        const scene = player.scene;
        return !!scene.minimapEnemies;
    });

    expect(minimapCheck).toBeTruthy();
  });

});
