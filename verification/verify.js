const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:3000');

  // Wait for game to boot
  await page.waitForFunction(() => window.game && window.game.isBooted);

  // Wait a bit for UI to appear (Minimap)
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verification/screenshot.png' });
  await browser.close();
})();
