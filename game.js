
// Global Variables
let player;
let platforms;
let clouds;
let mountains;
let stars;
let spikes;
let monsters;
let lasers; // New Group
let loot; // New Group for dynamic drops
let cursors;
let keyZ, keyX; // New Keys
let nextPlatformX = 0;
let lastPlatformY = 0;
let gameWidth;
let gameHeight;

// Game State
window.gameState = window.gameState || {
    coins: 0,
    robotVersion: 1,
    hasDoubleJump: false,
    hasTripleJump: false,
    hasJetpack: false,
    hasArmor: false,
    hasShield: false, // New
    hasSword: false, // New
    hasLaser: false, // New
    hasCoinMaker: false,
    coinMakerLevel: 1, // New (1 = default, 2 = factory)
    hasGem: false,
    maxDistance: 0,
    hasAutoJump: false,
    hasMagnet: false,
    hasAutoAttack: false,
    spawnRateLevel: 0,
    lastDeathReason: ''
};

// --- Persistence Logic ---
function saveGame() {
    const data = {
        state: window.gameState,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem('idlegame_save', JSON.stringify(data));
    } catch (e) {
        console.error("Save failed", e);
    }
}
window.saveGame = saveGame;

function loadGame() {
    try {
        const str = localStorage.getItem('idlegame_save');
        if (str) {
            const data = JSON.parse(str);
            if (data.state) {
                // Merge state
                window.gameState = { ...window.gameState, ...data.state };
            }

            // Calculate Offline Earnings
            const lastTime = data.timestamp || Date.now();
            const now = Date.now();
            const diffSeconds = (now - lastTime) / 1000;

            if (diffSeconds > 1) {
                let rate = 0;
                if (window.gameState.hasCoinMaker) {
                    let base = 1;
                    if (window.gameState.coinMakerLevel && window.gameState.coinMakerLevel >= 2) {
                        base = 2;
                    }
                    const dist = window.gameState.maxDistance || 0;
                    // Exploration Bonus: +100% per 2000 distance
                    const multiplier = 1 + (dist / 2000);
                    rate = base * multiplier;
                }

                if (rate > 0) {
                    const earned = Math.floor(diffSeconds * rate);
                    window.gameState.coins += earned;

                    window.offlineDetails = {
                        earned: earned,
                        base: base,
                        multiplier: multiplier,
                        seconds: Math.floor(diffSeconds)
                    };

                    return earned;
                }
            }
        }
    } catch (e) {
        console.error("Load failed", e);
    }
    return 0;
}

window.offlineEarnings = loadGame();
// -------------------------

let bigHoleGenerated = false;
let jumps = 0;

// UI
let scoreText;
let robotText;
let shopText;
let storyText;
let zoneText;
let gemGroup;
let settingsContainer;
let minimapContainer;
let minimapPlayer;
let minimapGem;






// --- Helpers ---

function attemptIdleSpawn(scene) {
    // Only spawn if player is alive and we aren't overwhelmed
    if (!player.active || monsters.countActive() > 15) return;

    const camX = scene.cameras.main.scrollX;
    const gameW = scene.scale.width;

    // Find valid platforms
    const validPlatforms = [];
    platforms.children.iterate((plat) => {
        // Platform must be on screen
        if (plat.x > camX && plat.x < camX + gameW) {
             // Must be far enough from player
             if (Math.abs(plat.x - player.x) > 300) {
                 validPlatforms.push(plat);
             }
        }
    });

    // Decide what to spawn: Ground or Air?
    // If no platforms, MUST spawn Air.
    // Otherwise, 30% chance for Air.
    let spawnAir = false;
    if (validPlatforms.length === 0 || Phaser.Math.Between(0, 100) < 30) {
        spawnAir = true;
    }

    if (spawnAir) {
         // Spawn Flying Bat
         const spawnX = player.x + (Math.random() > 0.5 ? 400 : -400); // Behind or ahead
         const spawnY = player.y - Phaser.Math.Between(150, 300);

         let bat = monsters.get(spawnX, spawnY, 'bat');
         if (bat) {
             bat.setActive(true);
             bat.setVisible(true);
             bat.enableBody(true, spawnX, spawnY, true, true);
             bat.body.allowGravity = false;

             // Fly towards player
             const angle = Phaser.Math.Angle.Between(spawnX, spawnY, player.x, player.y);
             scene.physics.velocityFromRotation(angle, 150, bat.body.velocity);

             bat.setCollideWorldBounds(false);

             // Visual Cue
             const warning = scene.add.text(spawnX, spawnY - 50, '!', { fontSize: '32px', fill: '#f0f' }).setOrigin(0.5);
             scene.tweens.add({
                 targets: warning,
                 alpha: 0,
                 duration: 1000,
                 onComplete: () => warning.destroy()
             });
         }
    } else {
        const plat = Phaser.Utils.Array.GetRandom(validPlatforms);
        const spawnX = plat.x + Phaser.Math.Between(-plat.displayWidth/4, plat.displayWidth/4);

        let monster = monsters.get(spawnX, plat.y - 100, 'monster');
        if (monster) {
             monster.setActive(true);
             monster.setVisible(true);
             monster.enableBody(true, spawnX, plat.y - 100, true, true);
             monster.body.allowGravity = true; // Reset gravity in case it was a bat
             monster.setBounce(1);
             monster.setCollideWorldBounds(false);
             monster.setVelocityX(Phaser.Math.Between(-40, 40));

             // Visual Cue
             const warning = scene.add.text(spawnX, plat.y - 150, '!', { fontSize: '32px', fill: '#f00' }).setOrigin(0.5);
             scene.tweens.add({
                 targets: warning,
                 y: plat.y - 180,
                 alpha: 0,
                 duration: 1000,
                 onComplete: () => warning.destroy()
             });
        }
    }
}

function cleanup(scene) {
    const scrollX = scene.cameras.main.scrollX;
    const cleanupThreshold = scrollX - 200;
    const pChildren = platforms.getChildren();
    for (let i = pChildren.length - 1; i >= 0; i--) {
        const child = pChildren[i];
        if (child.x + child.displayWidth / 2 < cleanupThreshold) child.destroy();
    }
    const sChildren = stars.getChildren();
    for (let i = sChildren.length - 1; i >= 0; i--) {
        const child = sChildren[i];
        if (child.active && child.x < cleanupThreshold) child.disableBody(true, true);
    }
    const kChildren = spikes.getChildren();
    for (let i = kChildren.length - 1; i >= 0; i--) {
        const child = kChildren[i];
        if (child.active && child.x < cleanupThreshold) child.disableBody(true, true);
    }
    const mChildren = monsters.getChildren();
    for (let i = mChildren.length - 1; i >= 0; i--) {
        const child = mChildren[i];
        if (child.active) {
            if (child.x < cleanupThreshold) child.disableBody(true, true);
            else if (child.y > gameHeight + 100) child.disableBody(true, true);
        }
    }
    const lChildren = loot.getChildren();
    for (let i = lChildren.length - 1; i >= 0; i--) {
        const child = lChildren[i];
        if (child.active) {
            if (child.x < cleanupThreshold) child.disableBody(true, true);
            else if (child.y > gameHeight + 100) child.disableBody(true, true);
        }
    }
}

function handleJump() {
    if (player.body.touching.down) {
        player.setVelocityY(-500);
        jumps = 1;
    } else if (window.gameState.hasDoubleJump && jumps < 2) {
        player.setVelocityY(-500);
        jumps = 2;
    } else if (window.gameState.hasTripleJump && jumps < 3) {
        player.setVelocityY(-500);
        jumps = 3;
    }
}

function handleSword(scene) {
    // Visual
    const slash = scene.add.sprite(player.x + 40, player.y, 'slash');
    scene.tweens.add({
        targets: slash,
        alpha: 0,
        duration: 200,
        onComplete: () => slash.destroy()
    });

    showStoryMessage(scene, "Command Center: Target neutralized.");

    // Hitbox logic
    monsters.children.iterate((monster) => {
        if (!monster.active) return;
        const dx = monster.x - player.x;
        const dy = Math.abs(monster.y - player.y);
        if (dx > 0 && dx < 80 && dy < 50) {
             monster.disableBody(true, true);
             spawnLoot(scene, monster.x, monster.y);
             window.gameState.lastKillTime = Date.now();
        }
    });
}

function handleLaser(scene) {
    const laser = lasers.get(player.x + 20, player.y, 'laser');
    if (laser) {
        laser.setActive(true);
        laser.setVisible(true);
        laser.enableBody(true, player.x + 20, player.y, true, true);
        laser.setVelocityX(600);
        laser.body.allowGravity = false;
        showStoryMessage(scene, "Command Center: Laser discharged.");
    }
}

function laserHitMonster(laser, monster) {
    laser.disableBody(true, true);
    monster.disableBody(true, true);
    spawnLoot(laser.scene, monster.x, monster.y);
    window.gameState.lastKillTime = Date.now();
    showStoryMessage(laser.scene, "Command Center: Target neutralized.");
}

function respawn(scene) {
    window.gameState.robotVersion++;
    window.saveGame();
    scene.scene.restart();
}

function createPlatform(scene, x, y, width, tint = 0xff00ff) {
    const height = 32;
    const centerX = x + width / 2;

    // Use TileSprite for better visuals with textures
    const platform = scene.add.tileSprite(centerX, y, width, height, 'ground');
    platforms.add(platform);

    // Scale tile to fit height if texture exists and is valid
    if (scene.textures.exists('ground')) {
         const tex = scene.textures.get('ground').getSourceImage();
         if (tex && tex.height > 0) {
             const scale = 32 / tex.height;
             platform.setTileScale(scale, scale);
         }
    }

    // platform.refreshBody(); // Not needed/available for TileSprite if sized at creation
    if (tint !== null) {
        platform.setTint(tint);
    }
}

function spawnNextPlatform(scene) {
    let gap = Phaser.Math.Between(100, 200);
    let width = Phaser.Math.Between(200, 600);
    let y = lastPlatformY;
    const TUTORIAL_LIMIT = 3000;
    if (nextPlatformX < TUTORIAL_LIMIT) {
        gap = 0;
        width = Phaser.Math.Between(400, 800);
    }
    let isArmorZone = false;
    if (scene.startTime && (scene.time.now - scene.startTime > 30000)) {
        if (Phaser.Math.Between(0, 100) < 20) {
             isArmorZone = true;
             width = 600;
        }
    }
    if (!bigHoleGenerated && nextPlatformX > 3000) {
        gap = 450;
        bigHoleGenerated = true;
        width = 800;
    }
    let startX = nextPlatformX + gap;
    createPlatform(scene, startX, y, width);
    if (nextPlatformX > 2000 && Phaser.Math.Between(0, 100) < 30) {
        let highY = y - 350;
        createPlatform(scene, startX, highY, Phaser.Math.Between(200, 400), null);
        for(let k=0; k<3; k++) {
             let star = stars.get(startX + (k*50), highY - 50, 'star');
             if (star) star.enableBody(true, startX + (k*50), highY - 50, true, true);
        }
    }
    if (Phaser.Math.Between(0, 100) < 10) {
        let unreachY = y - Phaser.Math.Between(300, 400);
        // Use createPlatform for consistency (TileSprite).
        // Original logic used startX as center. createPlatform expects left edge.
        // width 200 -> radius 100. Left = startX - 100.
        createPlatform(scene, startX - 100, unreachY, 200, 0x555555);
        for(let k=0; k<5; k++) {
             let star = stars.get(startX - 80 + (k*40), unreachY - 50, 'star');
             if (star) star.enableBody(true, startX - 80 + (k*40), unreachY - 50, true, true);
        }
    }
    const numStars = Phaser.Math.Between(0, 3);
    const step = width / (numStars + 1);
    for(let i=1; i<=numStars; i++) {
        let starY = y - 150;
        let star = stars.get(startX + (i*step), starY, 'star');
        if (star) star.enableBody(true, startX + (i*step), starY, true, true);
    }
    if (isArmorZone) {
        const spikeWidth = 32;
        const numSpikes = Math.floor(width / spikeWidth);
        for(let i=0; i<numSpikes; i++) {
             let spike = spikes.get(startX + (i*spikeWidth) + 16, y - 32, 'spike');
             if (spike) {
                 spike.displayWidth = 32;
                 spike.displayHeight = 32;
                 spike.enableBody(true, startX + (i*spikeWidth) + 16, y - 32, true, true);
             }
        }
    } else if (window.gameState.hasDoubleJump && nextPlatformX > TUTORIAL_LIMIT) {
        if (Phaser.Math.Between(0, 100) < 25) {
            const numSpikes = 1;
            for(let i=0; i<numSpikes; i++) {
                 let sx = startX + Phaser.Math.Between(50, width - 50);
                 let spike = spikes.get(sx, y - 32, 'spike');
                 if (spike) {
                     spike.displayWidth = 32;
                     spike.displayHeight = 32;
                     spike.enableBody(true, sx, y - 32, true, true);
                 }
            }
        }
    }
    let spawnChance = 30;
    if (window.gameState.spawnRateLevel > 0) spawnChance += (window.gameState.spawnRateLevel * 20);

    if (nextPlatformX > 4000 && Phaser.Math.Between(0, 100) < spawnChance) {
         let mx = startX + Phaser.Math.Between(50, width - 50);
         let monster = monsters.get(mx, y - 50, 'monster');
         if (monster) {
             monster.setActive(true);
             monster.setVisible(true);
             monster.enableBody(true, mx, y - 50, true, true);
             monster.body.allowGravity = true; // Reset gravity
             monster.setBounce(1);
             monster.setCollideWorldBounds(false);
             monster.setVelocityX(Phaser.Math.Between(-40, 40));
         }
    }
    if (!window.gameState.hasGem && nextPlatformX > 15000 && gemGroup.getLength() === 0) {
         gemGroup.create(startX + width / 2, y - 60, 'gem');
    }
    nextPlatformX += gap + width;
    lastPlatformY = y;
}

function hitSpike(player, spike) {
    if (window.gameState.hasArmor) {
        return;
    }
    window.gameState.lastDeathReason = 'spike';
    respawn(player.scene);
}

function hitMonster(player, monster) {
    if (window.gameState.hasShield) {
        // Shield saves you once? Or always?
        // Description: "Provides additional layer of protection."
        // Armor handles Spikes. Shield handles Monsters.
        // Let's make it reflect/bounce for now.
        if (player.body.touching.down) {
             player.setVelocityY(-400);
        } else {
             player.setVelocityY(-300);
             player.setVelocityX(-300);
        }
        return;
    }
    // If no shield, die
    window.gameState.lastDeathReason = 'monster';
    respawn(player.scene);
}

function collectStar(player, star) {
    star.disableBody(true, true);
    gainCoins(player.scene, 1, star.x, star.y);
}

function collectLoot(player, item) {
    item.disableBody(true, true);
    gainCoins(player.scene, 5, item.x, item.y); // Monsters drop more valuble loot? Or just 1? Let's say 1-3.
}

function gainCoins(scene, amount, x, y) {
    window.gameState.coins += amount;
    scoreText.setText(window.gameState.coins);
    updateShopUI();
    showFloatingText(scene, x, y, "+" + amount, '#ffd700');
}

function spawnLoot(scene, x, y) {
    // Optimization: Use object pooling for loot
    const item = loot.get(x, y, 'star');
    if (item) {
        item.setActive(true);
        item.setVisible(true);
        item.enableBody(true, x, y, true, true);
        item.setBounce(0.5);
        item.setDrag(100);
        item.setVelocity(Phaser.Math.Between(-200, 200), -300);
    }
}

function spawnSupplyCrate(scene) {
    if (!player.active) return;
    const x = player.x;
    const y = player.y - 400; // Drop from above
    const crate = scene.crates.get(x, y, 'crate');
    if (crate) {
        crate.setActive(true);
        crate.setVisible(true);
        crate.enableBody(true, x, y, true, true);
        crate.setBounce(0.3);
        crate.setDrag(100);
        showStoryMessage(scene, "Command Center: Supply Drop incoming.");
    }
}

function collectCrate(player, crate) {
    crate.disableBody(true, true);
    const dist = window.gameState.maxDistance || 0;
    const bonus = 1 + Math.floor(dist / 2000);
    const reward = Math.floor(50 * bonus);

    gainCoins(player.scene, reward, player.x, player.y - 50);
    showStoryMessage(player.scene, "Command Center: Supplies secured.");
    showFloatingText(player.scene, player.x, player.y - 100, "SUPPLY DROP\n+" + reward, '#00ff00');
}

function showFloatingText(scene, x, y, message, color) {
    const text = scene.add.text(x, y, message, {
        fontSize: '24px',
        fontFamily: 'Courier',
        fontWeight: 'bold',
        fill: color,
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5);

    scene.tweens.add({
        targets: text,
        y: y - 50,
        alpha: 0,
        duration: 1000,
        ease: 'Power1',
        onComplete: () => text.destroy()
    });
}

function collectGem(player, gem) {
    gem.disableBody(true, true);
    window.gameState.hasGem = true;
    showStoryMessage(player.scene, "Command Center: Gem acquired! Excellent work.");
}

function showStoryMessage(scene, msg) {
    if (!storyText) return;
    storyText.setText(msg);
    storyText.setAlpha(1);
    scene.tweens.killTweensOf(storyText);
    scene.time.delayedCall(8000, () => {
        scene.tweens.add({
            targets: storyText,
            alpha: 0,
            duration: 1000
        });
    });
}

function handleShopAction(scene) {
    if (scene && scene.scene.get('UpgradeScene')) {
        scene.scene.launch('UpgradeScene');
        scene.physics.pause();
    }
}

function updateShopUI() {
    let text = 'UPGRADES [B]';
    let color = '#0f0';
    if (shopText) {
        shopText.setText(text);
        shopText.setColor(color);
    }
}

function createUI(scene) {
    scene.add.image(24, 32, 'star').setScrollFactor(0);
    scoreText = scene.add.text(45, 16, window.gameState.coins, { fontSize: '32px', fill: '#fff', fontFamily: 'Courier' }).setScrollFactor(0);

    robotText = scene.add.text(16, 60, 'Robot MK-' + window.gameState.robotVersion, { fontSize: '24px', fill: '#0ff', fontFamily: 'Courier' }).setScrollFactor(0);

    zoneText = scene.add.text(16, 90, 'ZONE 1\n(x1)', { fontSize: '20px', fill: '#ffff00', fontFamily: 'Courier' }).setScrollFactor(0);

    shopText = scene.add.text(gameWidth - 16, 16, '', { fontSize: '24px', fill: '#aaa', align: 'right', fontFamily: 'Courier' })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => handleShopAction(scene))
        .on('pointerover', () => shopText.setScale(1.1))
        .on('pointerout', () => shopText.setScale(1.0));

    scene.input.keyboard.on('keydown-B', () => handleShopAction(scene));

    const gear = scene.add.image(30, 100, 'gear')
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleSettings(scene))
        .on('pointerover', () => gear.setScale(1.1))
        .on('pointerout', () => gear.setScale(1.0));

    // Escape to Settings (Check if UpgradeScene is open/just closed)
    scene.input.keyboard.on('keydown-ESC', () => {
        if (scene.scene.isActive('UpgradeScene')) return;
        if (Date.now() - (window.lastUpgradeCloseTime || 0) < 200) return;
        toggleSettings(scene);
    });

    createSettingsUI(scene);

    let storyMsg = "Command Center: System Online. Objective: Explore Planet Xylos. Find the Gem.";
    if (window.gameState.robotVersion > 1) {
        // ... (Same lore messages logic)
        const loreMessages = [
            "Command Center: We are the Overwatch. We guide you to the Gem.",
            "Command Center: The Gem is the key to our survival.",
            "Command Center: Atmospheric sensors indicate high toxicity. Proceed with caution.",
            "Command Center: Reconstructing unit... Optimizing for local gravity.",
            "Command Center: Previous data packet received. Analyzing failure.",
            "Command Center: Remember, coins can be exchanged for upgrades.",
            "Command Center: Do not fear the void. You are replaceable.",
            "Command Center: Planet Xylos was once inhabited. Now, only ruins remain."
        ];

        if (window.gameState.lastDeathReason === 'fall') {
             const fallMessages = [
                 "Command Center: Gravity check... Status: Working.",
                 "Command Center: Did you forget your jetpack? Oh wait, you don't have one yet.",
                 "Command Center: That was a long way down.",
                 "Command Center: Aim for the platform next time.",
                 "Command Center: Splat.",
                 "Command Center: Error: Flight module not found.",
                 "Command Center: Nice dive! 10/10 for form, 0/10 for survival.",
                 "Command Center: Issuing gravity assist... Just kidding.",
                 "Command Center: Maybe try jumping *onto* the ground?"
             ];
             if (!window.gameState.hasDoubleJump) {
                 fallMessages.push("Command Center: Gravity is harsh. A double jump would help!");
             }
             storyMsg = Phaser.Utils.Array.GetRandom(fallMessages);
        } else if (window.gameState.lastDeathReason === 'spike' && !window.gameState.hasArmor) {
             storyMsg = "Command Center: Spikes detected. Armor plating recommended.";
        } else if (window.gameState.lastDeathReason === 'monster') {
             if (window.gameState.hasSword || window.gameState.hasLaser) {
                 storyMsg = "Command Center: You have weapons. Use them.";
             } else {
                 storyMsg = "Command Center: Hostile organism detected. Avoidance advised.";
             }
        } else {
             if (Phaser.Math.Between(0, 100) > 60) {
                 storyMsg = Phaser.Utils.Array.GetRandom(loreMessages);
             } else {
                 storyMsg = "Command Center: Unit lost. Consciousness transferred to MK-" + window.gameState.robotVersion + ". Coins retained.";
             }
        }
    }

    // New Control Hints
    if (window.gameState.hasSword && !window.gameState.hasLaser) {
        storyMsg += " [Press Z to Attack]";
    } else if (window.gameState.hasLaser) {
        storyMsg += " [Press Z: Sword | X: Laser]";
    }

    storyText = scene.add.text(gameWidth / 2, gameHeight - 40, storyMsg, {
        fontSize: '20px',
        fill: '#0f0',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 5 },
        fontFamily: 'Courier',
        wordWrap: { width: gameWidth * 0.9, useAdvancedWrap: true }
    })
    .setOrigin(0.5)
    .setScrollFactor(0);

    scene.time.delayedCall(8000, () => {
        scene.tweens.add({
            targets: storyText,
            alpha: 0,
            duration: 1000
        });
    });

    updateShopUI();
}

function createSettingsUI(scene) {
    settingsContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    const bg = scene.add.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, 0x000000, 0.8);
    settingsContainer.add(bg);
    const title = scene.add.text(gameWidth/2, 100, 'SETTINGS', { fontSize: '40px', fill: '#fff', fontFamily: 'Courier' }).setOrigin(0.5);
    settingsContainer.add(title);
    const amelText = scene.add.text(gameWidth/2, 200, '', { fontSize: '24px', fill: '#fff', align: 'center', fontFamily: 'Courier' }).setOrigin(0.5);
    amelText.setName('amelText');
    settingsContainer.add(amelText);
    const resumeBtn = scene.add.text(gameWidth/2, 400, 'RESUME [ESC]', { fontSize: '32px', fill: '#0f0', backgroundColor: '#333', fontFamily: 'Courier' })
        .setPadding(10)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleSettings(scene))
        .on('pointerover', () => {
            resumeBtn.setScale(1.1);
            resumeBtn.setColor('#ffffff');
        })
        .on('pointerout', () => {
            resumeBtn.setScale(1.0);
            resumeBtn.setColor('#0f0');
        });
    resumeBtn.setName('resumeBtn');

    // Minimap inside Settings
    minimapContainer = scene.add.container(gameWidth/2 - 100, 500);
    const bgMap = scene.add.rectangle(100, 50, 200, 100, 0x000000, 0.5);
    bgMap.setStrokeStyle(2, 0xffffff);
    minimapContainer.add(bgMap);
    minimapPlayer = scene.add.circle(0, 0, 4, 0x00ff00);
    minimapContainer.add(minimapPlayer);
    minimapGem = scene.add.circle(195, 10, 4, 0x00ffff);
    minimapContainer.add(minimapGem);

    settingsContainer.add(minimapContainer);
}

function toggleSettings(scene) {
    const resumeBtn = scene.children.getByName('resumeBtn');
    if (scene.physics.world.isPaused) {
        scene.physics.resume();
        settingsContainer.setVisible(false);
        if (resumeBtn) resumeBtn.setVisible(false);
    } else {
        scene.physics.pause();
        let content = "AMELIORATIONS BOUGHT:\n\n";
        content += "Double Jump: " + (window.gameState.hasDoubleJump ? "YES" : "NO") + "\n";
        content += "Armor: " + (window.gameState.hasArmor ? "YES" : "NO") + "\n";
        content += "Sword: " + (window.gameState.hasSword ? "YES" : "NO") + "\n"; // New
        const textObj = settingsContainer.getByName('amelText');
        if (textObj) textObj.setText(content);
        settingsContainer.setVisible(true);
        if (resumeBtn) resumeBtn.setVisible(true);
    }
}

function createCroppedTexture(scene, sourceKey, newKey) {
    if (!scene.textures.exists(sourceKey)) return;
    const source = scene.textures.get(sourceKey).getSourceImage();
    const canvas = scene.textures.createCanvas(newKey + '_temp', source.width, source.height);
    const ctx = canvas.context;
    ctx.drawImage(source, 0, 0);
    const imageData = ctx.getImageData(0, 0, source.width, source.height);
    const data = imageData.data;

    let minX = source.width, minY = source.height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
            const alpha = data[(y * source.width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }

    if (!found) {
        // Fallback to source if empty
        scene.textures.addRenderTexture(newKey, scene.textures.get(sourceKey));
        scene.textures.remove(newKey + '_temp');
        return;
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Create new texture
    if (scene.textures.exists(newKey)) scene.textures.remove(newKey);
    const finalCanvas = scene.textures.createCanvas(newKey, width, height);
    finalCanvas.context.drawImage(source, minX, minY, width, height, 0, 0, width, height);
    finalCanvas.refresh();

    scene.textures.remove(newKey + '_temp');
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load player spritesheet raw image
        this.load.image('player_raw', 'player_spritesheet.png');
        this.load.image('bg_layer', 'background.png');
        this.load.image('floor_raw', 'platform_texture.png');
        this.load.image('peak_raw', 'peak.png');
    }

    create() {
        gameWidth = this.scale.width;
        gameHeight = this.scale.height;

        // Register UpgradeScene if not already
        if (!this.scene.get('UpgradeScene')) {
            if (typeof UpgradeScene !== 'undefined') {
                this.scene.add('UpgradeScene', UpgradeScene, false);
            }
        }

        this.scale.on('resize', (gameSize) => {
            gameWidth = gameSize.width;
            gameHeight = gameSize.height;

            if (this.background) {
                 const newScale = gameHeight / 1536;
                 this.background.setScale(newScale);
                 this.background.setSize(gameWidth / newScale, 1536);
            }

            // Update Camera Offset
            // Re-establish follow with new offset
            const camOffsetY = (gameHeight * 0.15);
            const camOffsetX = gameWidth * 0.35;
            if (player) {
                this.cameras.main.startFollow(player, true, 0.08, 0.08, -camOffsetX, camOffsetY);
            }

            if (scoreText) scoreText.setPosition(45, 16);
            if (robotText) robotText.setPosition(16, 60);
            if (shopText) shopText.setPosition(gameWidth - 16, 16);
            if (storyText) {
                 if (gameHeight > gameWidth) {
                     storyText.setPosition(gameWidth / 2, 130);
                 } else {
                     storyText.setPosition(gameWidth / 2, gameHeight - 40);
                 }
                 storyText.setStyle({ wordWrap: { width: gameWidth * 0.9, useAdvancedWrap: true } });
            }
        });

        // --- Generate Textures ---
        const graphics = this.make.graphics();

        // Process new assets
        createCroppedTexture(this, 'floor_raw', 'ground');
        createCroppedTexture(this, 'peak_raw', 'spike');

        // Cloud
        if (!this.textures.exists('cloud')) {
            graphics.fillStyle(0xffffff, 0.8);
            graphics.fillCircle(20, 25, 20);
            graphics.fillCircle(40, 25, 20);
            graphics.fillCircle(60, 25, 20);
            graphics.fillCircle(30, 15, 20);
            graphics.fillCircle(50, 15, 20);
            graphics.generateTexture('cloud', 80, 50);
            graphics.clear();
        }

        // Ground
        if (!this.textures.exists('ground')) {
            graphics.fillStyle(0x66cc66, 1); // Grassy Green
            graphics.fillRect(0, 0, 32, 32);
            // Grass blades
            graphics.fillStyle(0x44aa44, 1);
            graphics.beginPath();
            graphics.moveTo(0, 0); graphics.lineTo(4, 8); graphics.lineTo(8, 0);
            graphics.moveTo(10, 0); graphics.lineTo(14, 6); graphics.lineTo(18, 0);
            graphics.closePath();
            graphics.fillPath();
            // Dirt details
            graphics.fillStyle(0x553311, 1);
            graphics.fillCircle(16, 20, 2);
            graphics.fillCircle(24, 28, 3);
            graphics.generateTexture('ground', 32, 32);
            graphics.clear();
        }

        // Spike
        if (!this.textures.exists('spike')) {
            graphics.fillStyle(0xff0000, 1);
            graphics.beginPath();
            graphics.moveTo(0, 32);
            graphics.lineTo(16, 0);
            graphics.lineTo(32, 32);
            graphics.closePath();
            graphics.fillPath();
            graphics.generateTexture('spike', 32, 32);
            graphics.clear();
        }

        // Monster
        if (!this.textures.exists('monster')) {
            graphics.fillStyle(0xcc0000, 1); // Dark Red
            graphics.fillRect(0, 0, 32, 32);
            // Eyes
            graphics.fillStyle(0xffff00, 1); // Yellow eyes
            graphics.fillCircle(8, 10, 4);
            graphics.fillCircle(24, 10, 4);
            graphics.fillStyle(0x000000, 1); // Pupils
            graphics.fillCircle(8, 10, 1);
            graphics.fillCircle(24, 10, 1);
            // Teeth
            graphics.fillStyle(0xffffff, 1);
            graphics.beginPath();
            graphics.moveTo(4, 24); graphics.lineTo(8, 30); graphics.lineTo(12, 24);
            graphics.moveTo(12, 24); graphics.lineTo(16, 30); graphics.lineTo(20, 24);
            graphics.moveTo(20, 24); graphics.lineTo(24, 30); graphics.lineTo(28, 24);
            graphics.closePath();
            graphics.fillPath();
            graphics.generateTexture('monster', 32, 32);
            graphics.clear();
        }

        // Star (Coin)
        if (!this.textures.exists('star')) {
            graphics.fillStyle(0xFFD700, 1); // Gold
            graphics.fillCircle(12, 12, 10);
            graphics.lineStyle(2, 0xB8860B, 1); // Darker Gold Rim
            graphics.strokeCircle(12, 12, 10);
            graphics.fillStyle(0xFFFACD, 0.5); // Inner Shine
            graphics.fillCircle(9, 9, 3);
            // Extra Detail
            graphics.fillStyle(0xFFFACD, 1);
            graphics.fillCircle(12, 12, 5);
            graphics.generateTexture('star', 24, 24);
            graphics.clear();
        }

        // Gem (Objective)
        if (!this.textures.exists('gem')) {
            graphics.fillStyle(0x00ffff, 1); // Cyan
            graphics.beginPath();
            graphics.moveTo(12, 0);
            graphics.lineTo(24, 12);
            graphics.lineTo(12, 24);
            graphics.lineTo(0, 12);
            graphics.closePath();
            graphics.fillPath();
            graphics.generateTexture('gem', 24, 24);
            graphics.clear();
        }

        // Gear (Settings Icon)
        if (!this.textures.exists('gear')) {
            graphics.fillStyle(0x888888, 1);
            graphics.fillCircle(16, 16, 10);
            graphics.lineStyle(4, 0x888888);
            for (let i = 0; i < 8; i++) {
                const angle = i * (Math.PI / 4);
                const x = 16 + Math.cos(angle) * 14;
                const y = 16 + Math.sin(angle) * 14;
                graphics.moveTo(16, 16);
                graphics.lineTo(x, y);
            }
            graphics.strokePath();
            graphics.fillStyle(0x000000, 1); // Hole
            graphics.fillCircle(16, 16, 4);
            graphics.generateTexture('gear', 32, 32);
            graphics.clear();
        }

        // Dude (Robot) Sprite Sheet
        if (!this.textures.exists('dude_run') && this.textures.exists('player_raw')) {
            const raw = this.textures.get('player_raw').getSourceImage();
            const canvas = this.textures.createCanvas('dude_run', raw.width, raw.height);
            const ctx = canvas.context;
            ctx.drawImage(raw, 0, 0);

            const imageData = ctx.getImageData(0, 0, raw.width, raw.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // Remove blue background (approx 16, 66, 122) OR white background
                if ((Math.abs(r - 16) < 60 && Math.abs(g - 66) < 60 && Math.abs(b - 122) < 60) || (r > 200 && g > 200 && b > 200)) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            canvas.refresh();

            // Add frames (Assume 6 cols, 5 rows)
            const fW = Math.floor(raw.width / 6);
            const fH = Math.floor(raw.height / 5);
            for (let i = 0; i < 6; i++) {
                const x = (i % 6) * fW;
                const y = Math.floor(i / 6) * fH;
                canvas.add(i, 0, x, y, fW, fH);
            }
        }

        // Drone
        if (!this.textures.exists('drone')) {
            graphics.fillStyle(0x888888, 1);
            graphics.fillCircle(10, 10, 10);
            graphics.fillStyle(0x00ffff, 1); // Cyan eye
            graphics.fillCircle(10, 10, 4);
            graphics.generateTexture('drone', 20, 20);
            graphics.clear();
        }

        // Crate (Supply Drop)
        if (!this.textures.exists('crate')) {
            graphics.fillStyle(0x8B4513, 1); // SaddleBrown
            graphics.fillRect(0, 0, 32, 32);
            graphics.lineStyle(2, 0xD2691E, 1); // Lighter brown border
            graphics.strokeRect(0, 0, 32, 32);
            graphics.beginPath();
            graphics.moveTo(0, 0); graphics.lineTo(32, 32);
            graphics.moveTo(32, 0); graphics.lineTo(0, 32);
            graphics.strokePath();
            graphics.generateTexture('crate', 32, 32);
            graphics.clear();
        }

        // Bat (Flying Enemy)
        if (!this.textures.exists('bat')) {
            graphics.fillStyle(0x4B0082, 1); // Indigo
            graphics.beginPath();
            graphics.moveTo(16, 24); // Body Center Bottom
            graphics.lineTo(0, 0); // Left Wing Tip
            graphics.lineTo(16, 16); // Neck
            graphics.lineTo(32, 0); // Right Wing Tip
            graphics.lineTo(16, 24); // Back to Body
            graphics.closePath();
            graphics.fillPath();
            // Eyes
            graphics.fillStyle(0xff0000, 1);
            graphics.fillCircle(14, 18, 2);
            graphics.fillCircle(18, 18, 2);
            graphics.generateTexture('bat', 32, 32);
            graphics.clear();
        }

        graphics.destroy();
        // -------------------------

        // Background
        const bgScale = gameHeight / 1536;
        this.background = this.add.tileSprite(0, 0, gameWidth / bgScale, 1536, 'bg_layer');
        this.background.setOrigin(0, 0);
        this.background.setScrollFactor(0);
        this.background.setDepth(-100);
        this.background.setScale(bgScale);

        // Clouds
        clouds = this.add.group();
        for(let i=0; i<15; i++) {
            let x = Phaser.Math.Between(0, gameWidth);
            let y = Phaser.Math.Between(0, gameHeight * 0.6);
            let cloud = clouds.create(x, y, 'cloud');
            cloud.setAlpha(0.8);
            cloud.setScrollFactor(0.1 + Math.random() * 0.1);
            cloud.setScale(0.5 + Math.random() * 0.5);
        }

        // Platforms & Stars
        platforms = this.physics.add.staticGroup();
        stars = this.physics.add.staticGroup();
        spikes = this.physics.add.staticGroup();
        monsters = this.physics.add.group();
        lasers = this.physics.add.group(); // New
        loot = this.physics.add.group(); // New Loot Group
        this.crates = this.physics.add.group(); // Supply Drops
        gemGroup = this.physics.add.staticGroup();

        // Initial Setup
        lastPlatformY = gameHeight * 0.49;
        nextPlatformX = 0;
        bigHoleGenerated = false;
        jumps = 0;
        this.lastStoryMilestone = 0;
        this.startTime = this.time.now;
        this.lastCleanupTime = 0;

        // Coin Maker Upgrade
        if (window.gameState.hasCoinMaker) {
            let delay = 1000;
            if (window.gameState.coinMakerLevel && window.gameState.coinMakerLevel >= 2) {
                delay = 500; // Faster generation
            }

            this.time.addEvent({
                delay: delay,
                callback: () => {
                    // Idle Income with Exploration Bonus
                    let amount = 1;
                    const dist = window.gameState.maxDistance || 0;
                    const multiplier = 1 + Math.floor(dist / 2000);
                    amount = Math.floor(amount * multiplier);

                    // Synergy: Blood Money (Auto-Attack/Kills boost idle income)
                    // If killed something in last 5 seconds, double the income
                    if (window.gameState.lastKillTime && Date.now() - window.gameState.lastKillTime < 5000) {
                        amount *= 2;
                        if (this.drone && this.drone.visible) {
                             this.drone.setTint(0xff0000); // Angry drone
                             this.time.delayedCall(500, () => this.drone.clearTint());
                        }
                    }

                    amount = Math.max(1, amount);

                    // Visual: Drone Laser
                    if (this.drone && this.drone.visible) {
                        showFloatingText(this, this.drone.x, this.drone.y - 20, "+" + amount, '#00ffff');

                        // Shoot laser at ground/player
                        const g = this.add.graphics();
                        g.lineStyle(2, 0x00ffff, 0.5);
                        g.lineBetween(this.drone.x, this.drone.y, this.drone.x, this.drone.y + 100);
                        this.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => { g.destroy(); }});
                    }

                    window.gameState.coins += amount;
                    if (scoreText) scoreText.setText(window.gameState.coins);
                    updateShopUI();
                },
                loop: true
            });
        }

        // Supply Drop (Periodic Reward)
        this.time.addEvent({
            delay: 120000, // 2 minutes
            callback: () => spawnSupplyCrate(this),
            loop: true
        });

        // Create initial ground
        createPlatform(this, 0, lastPlatformY, 1000);

        for(let k=0; k<4; k++) {
            let star = stars.get(400 + k*60, lastPlatformY - 50, 'star');
            if (star) star.enableBody(true, 400 + k*60, lastPlatformY - 50, true, true);
        }
        nextPlatformX = 1000;

        // Player
        player = this.physics.add.sprite(100, lastPlatformY - 100, 'dude_run');
        player.setScale(0.4); // Scale down the large spritesheet
        player.setBounce(0.0);
        player.setCollideWorldBounds(false);

        // Drone
        this.drone = this.add.sprite(player.x, player.y - 50, 'drone');
        this.drone.setVisible(false);

        // Animations
        if (!this.anims.exists('run')) {
            this.anims.create({
                key: 'run',
                frames: this.anims.generateFrameNumbers('dude_run', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            });
        }
        player.anims.play('run', true);

        // Physics
        this.physics.add.collider(player, platforms);
        this.physics.add.collider(player, spikes, hitSpike, null, this);
        this.physics.add.collider(monsters, platforms);
        this.physics.add.collider(loot, platforms); // Loot bounces on ground
        this.physics.add.collider(this.crates, platforms); // Crates land on ground
        this.physics.add.overlap(player, monsters, hitMonster, null, this); // Changed callback
        this.physics.add.overlap(player, stars, collectStar, null, this);
        this.physics.add.overlap(player, loot, collectLoot, null, this); // Collect Loot
        this.physics.add.overlap(player, this.crates, collectCrate, null, this); // Collect Crate
        this.physics.add.overlap(player, gemGroup, collectGem, null, this);
        this.physics.add.overlap(lasers, monsters, laserHitMonster, null, this); // Laser collision

        // Camera
        const camOffsetY = (gameHeight * 0.15);
        const camOffsetX = gameWidth * 0.35;
        this.cameras.main.startFollow(player, true, 0.08, 0.08, -camOffsetX, camOffsetY);
        // this.cameras.main.setDeadzone(100, 100);

        // Input
        cursors = this.input.keyboard.createCursorKeys();
        keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > 100) {
                 handleJump();
            }
        });

        // Key listeners for actions
        keyZ.on('down', () => {
            if (window.gameState.hasSword) handleSword(this);
        });
        keyX.on('down', () => {
            if (window.gameState.hasLaser) handleLaser(this);
        });

        // UI Setup
        createUI(this);

        // Update Zone Text immediately
        if (zoneText) {
             const dist = window.gameState.maxDistance || 0;
             const zone = 1 + Math.floor(dist / 2000);
             zoneText.setText("ZONE " + zone + "\n(x" + zone + ")");
        }

        // Expose for debugging/testing
        this.monsters = monsters;
        this.player = player;
        this.clouds = clouds;

        this.lastIdleSpawnTime = 0;

        // Auto-save every 10 seconds
        this.time.addEvent({
            delay: 10000,
            callback: () => window.saveGame(),
            loop: true
        });

        // Notify about offline earnings
        if (window.offlineEarnings && window.offlineEarnings > 0) {
             this.time.delayedCall(1000, () => {
                 let msg = 'OFFLINE EARNINGS:\n+' + window.offlineEarnings;
                 let fontSize = '80px';

                 if (window.offlineDetails) {
                     const d = window.offlineDetails;
                     msg = `OFFLINE REPORT\nTime Away: ${d.seconds}s\nBase Rate: ${d.base}/s\nZone Bonus: x${d.multiplier.toFixed(1)}\n\nTOTAL: +${d.earned}`;
                     fontSize = '40px';
                 }

                 const earningsText = this.add.text(gameWidth / 2, gameHeight / 2, msg, {
                     fontSize: fontSize,
                     fontFamily: 'Courier', // Changed to Courier to match game style
                     fontWeight: 'bold',
                     fill: '#ffff00',
                     align: 'center',
                     stroke: '#000000',
                     strokeThickness: 6,
                     backgroundColor: '#000000aa',
                     padding: { x: 20, y: 20 }
                 }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

                 this.tweens.add({
                     targets: earningsText,
                     scale: { from: 0.8, to: 1.0 }, // Subtle pop
                     duration: 500,
                     yoyo: false,
                     hold: 4000, // Longer hold for reading
                     onComplete: () => {
                         this.tweens.add({
                             targets: earningsText,
                             alpha: 0,
                             duration: 1000,
                             onComplete: () => earningsText.destroy()
                         });
                     }
                 });
                 window.offlineEarnings = 0;
             });
        }
    }

    update() {
        player.setVelocityX(250);

        if (player.body.touching.down) {
            player.anims.play('run', true);
            jumps = 0;
        } else {
            player.anims.stop();
            player.setFrame(2);
        }

        const camX = this.cameras.main.scrollX;
        if (this.background) {
            this.background.tilePositionX = camX / this.background.scaleX;
        }

        monsters.children.iterate((monster) => {
            // Optimization: Skip processing for inactive entities
            if (!monster.active) return;
            if (monster.body.touching.down) {
                if (Math.random() < 0.02) {
                    monster.setVelocityX(Phaser.Math.Between(-50, 50));
                }
                if (monster.body.velocity.x === 0) {
                     monster.setVelocityX(Phaser.Math.Between(-30, 30));
                }
            }
        });

        // Clean up Lasers
        lasers.children.iterate((laser) => {
            if (!laser.active) return;
            if (laser.x > camX + gameWidth + 100) {
                laser.disableBody(true, true);
            }
        });


        if (Phaser.Input.Keyboard.JustDown(cursors.space) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
            handleJump();
        }

        if (window.gameState.hasJetpack && (cursors.space.isDown || cursors.up.isDown) && !player.body.touching.down) {
            player.setVelocityY(-300);
        }

        const scrollX = this.cameras.main.scrollX;
        const rightEdge = scrollX + gameWidth;

        if (nextPlatformX < rightEdge + 800) {
            spawnNextPlatform(this);
        }

        if (player.y > lastPlatformY + 300) {
            window.gameState.lastDeathReason = 'fall';
            respawn(this);
        }

        const dist = Math.floor(player.x);
        if (dist > 2000 && this.lastStoryMilestone < 2000) {
            showStoryMessage(this, "Command Center: Signal detected. It's faint... but it's there.");
            this.lastStoryMilestone = 2000;
        } else if (dist > 3000 && this.lastStoryMilestone < 3000) {
            showStoryMessage(this, "Command Center: Leaving safe zone. Terrain instability detected.");
            this.lastStoryMilestone = 3000;
        } else if (dist > 4500 && this.lastStoryMilestone < 4500) {
            showStoryMessage(this, "Command Center: Energy signatures consistent with Gem proximity.");
            this.lastStoryMilestone = 4500;
        }

        if (minimapContainer && minimapPlayer) {
            const GOAL_X = 15000;
            const MAP_WIDTH = 200;
            const MAP_HEIGHT = 100;
            const scaleX = MAP_WIDTH / GOAL_X;
            const scaleY = MAP_HEIGHT / gameHeight;
            let px = Phaser.Math.Clamp(player.x * scaleX, 0, MAP_WIDTH);
            let py = Phaser.Math.Clamp(player.y * scaleY, 0, MAP_HEIGHT);
            minimapPlayer.setPosition(px, py);
            minimapGem.setPosition(MAP_WIDTH - 5, 10);
        }

        // --- IDLE MECHANICS ---

        // Exploration Tracking
        const currentDist = Math.floor(player.x);
        if (currentDist > (window.gameState.maxDistance || 0)) {
            window.gameState.maxDistance = currentDist;
            // Update Zone Text
            if (zoneText) {
                 const zone = 1 + Math.floor(currentDist / 2000);
                 zoneText.setText("ZONE " + zone + "\n(x" + zone + ")");
            }
        }

        // Drone Visual
        if (window.gameState.hasCoinMaker) {
             if (this.drone && !this.drone.visible) this.drone.setVisible(true);
             if (this.drone) {
                 this.drone.x = Phaser.Math.Interpolation.Linear([this.drone.x, player.x - 30], 0.1);
                 this.drone.y = Phaser.Math.Interpolation.Linear([this.drone.y, player.y - 50], 0.1);
             }
        }

        // Magnet
        if (window.gameState.hasMagnet) {
            const magnetRangeSq = 300 * 300;
            stars.children.iterate((star) => {
                if (star.active && Phaser.Math.Distance.Squared(player.x, player.y, star.x, star.y) < magnetRangeSq) {
                    const angle = Phaser.Math.Angle.Between(star.x, star.y, player.x, player.y);
                    const speed = 10;
                    star.x += Math.cos(angle) * speed;
                    star.y += Math.sin(angle) * speed;
                    star.refreshBody();
                }
            });
            gemGroup.children.iterate((gem) => {
                 if (gem.active && Phaser.Math.Distance.Squared(player.x, player.y, gem.x, gem.y) < magnetRangeSq) {
                    const angle = Phaser.Math.Angle.Between(gem.x, gem.y, player.x, player.y);
                    const speed = 10;
                    gem.x += Math.cos(angle) * speed;
                    gem.y += Math.sin(angle) * speed;
                    gem.refreshBody();
                }
            });
            loot.children.iterate((item) => {
                 if (item.active && Phaser.Math.Distance.Squared(player.x, player.y, item.x, item.y) < magnetRangeSq) {
                    const angle = Phaser.Math.Angle.Between(item.x, item.y, player.x, player.y);
                    const speed = 12; // Loot is lighter?
                    item.setVelocityX(Math.cos(angle) * 400); // Dynamic body uses velocity
                    item.setVelocityY(Math.sin(angle) * 400);
                }
            });

            // Synergy: Magnetic Lure
            // If we have Magnet AND Monster Lure (spawnRateLevel > 0), pull monsters gently
            if (window.gameState.spawnRateLevel > 0) {
                 const lureRangeSq = 400 * 400;
                 monsters.children.iterate((monster) => {
                     if (monster.active && Phaser.Math.Distance.Squared(player.x, player.y, monster.x, monster.y) < lureRangeSq) {
                          // Pull gently towards player (so auto-attack can hit them)
                          const angle = Phaser.Math.Angle.Between(monster.x, monster.y, player.x, player.y);
                          if (monster.body.allowGravity) {
                              monster.setVelocityX(monster.body.velocity.x + Math.cos(angle) * 10);
                          } else {
                              // For flying bats
                              monster.body.velocity.x += Math.cos(angle) * 5;
                              monster.body.velocity.y += Math.sin(angle) * 5;
                          }
                     }
                 });
            }
        }

        // Auto-Jump
        if (window.gameState.hasAutoJump && player.body.touching.down) {
            const checkX = player.x + 100;
            const checkY = player.y + 48;
            let groundFound = false;
            platforms.children.iterate((plat) => {
                if (Math.abs(plat.x - checkX) < (plat.displayWidth / 2 + 10) && Math.abs(plat.y - checkY) < 50) {
                    groundFound = true;
                }
            });
            if (!groundFound) {
                handleJump();
            }
        }

        // Auto-Attack
        if (window.gameState.hasAutoAttack) {
            const now = this.time.now;
            if (!this.lastAutoAttackTime || now - this.lastAutoAttackTime > 1000) {
                let target = null;
                let minDistSq = 400 * 400;
                monsters.children.iterate((monster) => {
                    if (monster.active) {
                        const dSq = Phaser.Math.Distance.Squared(player.x, player.y, monster.x, monster.y);
                        if (dSq < minDistSq && monster.x > player.x) {
                            minDistSq = dSq;
                            target = monster;
                        }
                    }
                });

                if (target) {
                    if (window.gameState.hasLaser) {
                        handleLaser(this);
                        this.lastAutoAttackTime = now;
                    } else if (window.gameState.hasSword && minDistSq < 100 * 100) {
                        handleSword(this);
                        this.lastAutoAttackTime = now;
                    }
                }
            }
        }

        // Optimization: Throttle cleanup to run every 500ms instead of every frame
        // This reduces the overhead of iterating through all entities to check bounds
        if (this.time.now - this.lastCleanupTime > 500) {
            cleanup(this);
            this.lastCleanupTime = this.time.now;
        }

        // Idle Spawning (Horde Mode)
        if (this.time.now - this.lastIdleSpawnTime > 5000) { // Every 5 seconds try to spawn
            attemptIdleSpawn(this);
            this.lastIdleSpawnTime = this.time.now;
        }
    }
}


const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    render: {
        roundPixels: true
    },
    scene: [StartScene, GameScene, UpgradeScene]
};

const game = new Phaser.Game(config);
window.game = game;