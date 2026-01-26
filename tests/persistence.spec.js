const { test, expect } = require('@playwright/test');

test.describe('Persistence and Offline Progress', () => {

  test('should save game state to localStorage', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForFunction(() => typeof player !== 'undefined' && player);
    await page.waitForTimeout(1000); // Wait for init

    // Simulate gaining coins
    await page.evaluate(() => {
        window.gameState.coins = 100;
        window.saveGame();
    });

    // Check localStorage
    const savedData = await page.evaluate(() => {
        return localStorage.getItem('idlegame_save');
    });

    expect(savedData).toBeTruthy();
    const parsed = JSON.parse(savedData);
    expect(parsed.state.coins).toBe(100);
  });

  test('should load game state from localStorage', async ({ page }) => {
    // Navigate first to set up storage
    await page.goto('/');
    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForFunction(() => typeof player !== 'undefined' && player);

    // Set storage
    await page.evaluate(() => {
        const data = {
            state: { coins: 500, hasDoubleJump: true },
            timestamp: Date.now()
        };
        localStorage.setItem('idlegame_save', JSON.stringify(data));
    });

    // Reload
    await page.reload();
    await page.waitForTimeout(1000);

    // Check state
    const gameState = await page.evaluate(() => window.gameState);
    expect(gameState.coins).toBe(500);
    expect(gameState.hasDoubleJump).toBe(true);
  });

  test('should calculate offline earnings', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.forceStartGame);
    await page.evaluate(() => window.forceStartGame());
    await page.waitForFunction(() => typeof player !== 'undefined' && player);

    // Set storage with old timestamp (1 hour ago) and Coin Maker
    const ONE_HOUR_MS = 3600 * 1000;

    // Pass timestamp as argument to avoid closure context issues if any,
    // though Date.now() is available in browser.
    await page.evaluate(({ pastTime }) => {
        const data = {
            state: { coins: 0, hasCoinMaker: true, coinMakerLevel: 1 },
            timestamp: pastTime
        };
        localStorage.setItem('idlegame_save', JSON.stringify(data));
    }, { pastTime: Date.now() - ONE_HOUR_MS });

    // Reload
    await page.reload();
    await page.waitForTimeout(1000); // Wait for loadGame to run

    // Check coins: 3600 seconds * 1 coin/sec = 3600 coins
    const coins = await page.evaluate(() => window.gameState.coins);

    // Allow small margin of error for execution time
    expect(coins).toBeGreaterThanOrEqual(3600);
    // Just ensure it's not excessively high, allowing some buffer for test runtime
    expect(coins).toBeLessThan(3700);
  });

});
