const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true, // Run headless for speed
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Load the game
  const gamePath = 'http://localhost:8000/index.html';
  console.log(`Navigating to ${gamePath}`);

  // Capture console logs from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto(gamePath);

  // Wait for game to load
  await page.waitForTimeout(2000);

  // Toggle Settings to see Resume button
  console.log('Toggling Settings...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Verify Resume Button Text
  const resumeBtnText = await page.evaluate(() => {
    // Access the scene. game.scene.scenes finds the active scenes
    const scene = window.game.scene.scenes.find(s => s.sys.settings.active);
    if (!scene) return "No Scene Active";
    // Find text object by name or content
    // We named it 'resumeBtn' in the code!
    const btn = scene.children.getByName('resumeBtn');
    return btn ? btn.text : "Button Not Found";
  });

  console.log(`Resume Button Text: "${resumeBtnText}"`);

  if (resumeBtnText === 'RESUME [ESC]') {
    console.log('SUCCESS: Resume button text updated.');
  } else {
    console.error('FAILURE: Resume button text incorrect.');
    process.exit(1);
  }

  // Hover Test (Hard to verify visual hover state programmatically without screenshot comparison,
  // but we can check if listeners are attached if we could inspect objects,
  // or just trust the visual screenshot).
  // We will take a screenshot.

  // Hover over the button
  // We need to know where it is. It's at gameWidth/2, 400.
  // Let's get its position from the object.
  const btnPos = await page.evaluate(() => {
     const scene = window.game.scene.scenes.find(s => s.sys.settings.active);
     const btn = scene.children.getByName('resumeBtn');
     return { x: btn.x, y: btn.y };
  });

  await page.mouse.move(btnPos.x, btnPos.y);
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'verification/resume_hover.png' });
  console.log('Screenshot saved to verification/resume_hover.png');

  // Verify Upgrade Scene Close Button
  console.log('Opening Upgrade Shop...');
  // Close settings first
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Open Shop (B key)
  await page.keyboard.press('B');
  await page.waitForTimeout(1000); // Wait for scene launch

  // Hover over Close Button (Top right: gameWidth - 40, 40)
  const dims = await page.evaluate(() => {
      return { w: window.game.scale.width, h: window.game.scale.height };
  });

  await page.mouse.move(dims.w - 40, 40);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'verification/shop_close_hover.png' });
  console.log('Screenshot saved to verification/shop_close_hover.png');

  await browser.close();
})();
