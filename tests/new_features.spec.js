const { test, expect } = require('@playwright/test');

test('Upgrade Tree has 4 categories and new items', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000); // Wait for game load

    // Open Upgrade Scene (Simulate 'B' key)
    await page.keyboard.press('B');
    await page.waitForTimeout(1000);

    // Inspect internal state of the scene.
    const nodes = await page.evaluate(() => {
        const scene = window.game.scene.getScene('UpgradeScene');
        if (!scene) return [];
        return scene.nodes.map(n => n.name);
    });

    console.log('Found nodes:', nodes);

    expect(nodes).toContain('Sword');
    expect(nodes).toContain('Laser');
    expect(nodes).toContain('Shield');
    expect(nodes).toContain('Coin Factory');
});

test('Sword mechanic works', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Cheat: Give sword
    await page.evaluate(() => {
        window.gameState.hasSword = true;
    });

    // Spawn a monster right in front of player
    // Note: player is local var in game.js, but not exposed to window directly?
    // Actually player is 'let player', so it's not on window.
    // BUT 'create' assigns it. We need access to scene instance.
    // game.js assigns 'const game = ...; window.game = game;'
    // So we can access scene via game.scene.keys['default'] or similar.
    // The default scene key is 'default' because 'key' was not specified in config object in game.js?
    // In game.js config: `scene: { preload: preload, create: create, update: update }`
    // This creates a scene with key 'default' usually.

    await page.evaluate(() => {
        const scene = window.game.scene.scenes[0]; // Active scene
        // We need to find the player and monsters group.
        // They are variables in the closure of create/update.
        // They are NOT properties of the scene object (this.player) unless explicitly assigned.
        // Checking game.js: `player = this.physics.add.sprite...`
        // It uses `let player;` at top level scope of game.js.
        // This means they are NOT accessible via scene instance unless we modify game.js to attach them.

        // However, we can find them via children list.
        const player = scene.children.list.find(c => c.texture && c.texture.key === 'dude_run');
        const monster = scene.monsters.create(player.x + 40, player.y, 'monster');
        monster.setActive(true).setVisible(true);
        window._testMonster = monster; // Keep ref
    });

    // Press Z
    await page.keyboard.press('Z');
    await page.waitForTimeout(500);

    // Check if monster is gone
    const isDestroyed = await page.evaluate(() => {
        return !window._testMonster.active;
    });

    expect(isDestroyed).toBe(true);
});

test('Clouds are present', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    const cloudCount = await page.evaluate(() => {
        const scene = window.game.scene.scenes[0];
        // clouds is a global var in game.js scope, but scene.clouds is NOT automatically set.
        // BUT in game.js: `clouds = this.add.group();`
        // Wait, `clouds` is a top level variable.
        // Playwright evaluate runs in browser context.
        // Variables defined with `let` at top level of a module/script are NOT on window.
        // If game.js is loaded as <script src="game.js">, then `let` at top level IS global if not in a module.
        // package.json says "type": "commonjs", but index.html likely loads it as script.
        // Let's check index.html.

        // Assuming we can't access `clouds` directly, we can search the scene display list.
        const clouds = scene.children.list.filter(c => c.texture && c.texture.key === 'cloud');
        return clouds.length;
    });

    expect(cloudCount).toBeGreaterThan(0);
});
