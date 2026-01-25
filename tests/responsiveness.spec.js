const { test, expect } = require('@playwright/test');

test.describe('Responsiveness and Visibility', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Phaser to initialize
    await page.waitForFunction(() => window.game && window.game.isBooted);
  });

  test('Portrait Mode: Elements should be visible', async ({ page }) => {
    // Set to iPhone SE Portrait
    await page.setViewportSize({ width: 375, height: 667 });

    // Allow resize event to fire and layout to settle
    await page.waitForTimeout(1000);

    const visibility = await page.evaluate(() => {
      const scene = window.game.scene.scenes[0];
      const camera = scene.cameras.main;
      const player = scene.children.list.find(c => c.texture && c.texture.key === 'dude_run'); // Finding player by texture

      // Check UI Text visibility
      // Accessing global variables exposed on window or by inspecting scene children
      // Since scoreText etc are let variables in game.js, they are not directly on window.
      // We need to find them in scene.children or trust they are within bounds.

      const texts = scene.children.list.filter(c => c.type === 'Text');
      // Score text is now just a number (or starts with a number if mixed). It is located at top left.
      const scoreText = texts.find(t => !isNaN(parseInt(t.text)) && t.x < 100 && t.y < 50);
      const shopText = texts.find(t => t.text.includes('UPGRADES') || t.text.includes('Double Jump'));

      const inBounds = (obj) => {
        return obj.x >= 0 && obj.x <= scene.scale.width && obj.y >= 0 && obj.y <= scene.scale.height;
      };

      return {
        playerVisible: camera.worldView.contains(player.x, player.y),
        scoreVisible: scoreText ? inBounds(scoreText) : false,
        shopVisible: shopText ? inBounds(shopText) : false,
        gameWidth: scene.scale.width
      };
    });

    expect(visibility.playerVisible).toBe(true);
    expect(visibility.scoreVisible).toBe(true);
    expect(visibility.shopVisible).toBe(true);
  });

  test('Landscape Mode: Platform should be visible', async ({ page }) => {
    // Set to iPhone SE Landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Allow resize event to fire and physics to settle (player might fall if platform is off-screen)
    await page.waitForTimeout(3000);

    const check = await page.evaluate(() => {
      const scene = window.game.scene.scenes[0];
      const camera = scene.cameras.main;
      const player = scene.children.list.find(c => c.texture && c.texture.key === 'dude_run');

      // Find a platform (ground texture) that is close to the player
      // We access the static group 'platforms' via scene (need to find it) or just iterate children
      // platforms is a local variable too. We rely on scene children.
      // Static bodies are in scene.physics.world.staticBodies or we look for Image/TileSprite with 'ground' texture.
      // Actually platforms are created as 'ground' images in a StaticGroup. They should be in scene.children?
      // StaticGroup children are in the scene display list? Yes.

      const platforms = scene.children.list.filter(c => c.texture && c.texture.key === 'ground');

      // Find one platform that should be under the player or visible
      const visiblePlatform = platforms.find(p => camera.worldView.contains(p.x, p.y));

      return {
        playerVisible: camera.worldView.contains(player.x, player.y),
        platformVisible: !!visiblePlatform,
        cameraY: camera.scrollY,
        playerY: player.y
      };
    });

    console.log('Landscape Check:', check);

    expect(check.playerVisible).toBe(true);
    expect(check.platformVisible).toBe(true);
  });
});
