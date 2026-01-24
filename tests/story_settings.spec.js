const { test, expect } = require('@playwright/test');

test('Settings menu opens and pauses game, story text is correct', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000');

  // Wait for canvas
  await page.waitForSelector('canvas');

  // Allow game to init
  await page.waitForTimeout(1000);

  // Check story text
  const storyText = await page.evaluate(() => {
     const scene = window.game.scene.scenes[0];
     const textObj = scene.children.list.find(c => c.type === 'Text' && c.text && c.text.includes('Command Center'));
     return textObj ? textObj.text : '';
  });
  expect(storyText).toContain('Command Center: System Online');
  expect(storyText).toContain('Find the Gem');

  // Click Settings Button (Screen coordinates 40, 90)
  await page.mouse.click(40, 90);

  await page.waitForTimeout(500);

  // Verify Paused
  const isPaused = await page.evaluate(() => {
      return window.game.scene.scenes[0].physics.world.isPaused;
  });
  expect(isPaused).toBe(true);

  // Debug button pos
  const btnPos = await page.evaluate(() => {
      const scene = window.game.scene.scenes[0];
      const btn = scene.children.list.find(c => c.name === 'resumeBtn');
      return { x: btn.x, y: btn.y };
  });
  console.log('Button pos:', btnPos);

  // Move mouse and click
  await page.mouse.move(btnPos.x, btnPos.y);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.up();

  await page.waitForTimeout(1000);

  // Verify Resumed
  const isPausedAfter = await page.evaluate(() => {
      return window.game.scene.scenes[0].physics.world.isPaused;
  });
  expect(isPausedAfter).toBe(false);
});
