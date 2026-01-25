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
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let player;
let platforms;
let clouds;
let mountains;
let stars;
let spikes;
let monsters;
let lasers; // New Group
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
let gemGroup;
let settingsContainer;
let minimapContainer;
let minimapPlayer;
let minimapGem;

const game = new Phaser.Game(config);
window.game = game;

function preload() {
    // Load player spritesheet raw image
    this.load.image('player_raw', 'player_spritesheet.jpg');
    this.load.image('bg_layer', 'IMG_5882.png');
}

function create() {
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
        const camOffsetY = (gameHeight * -0.05);
        if (player) {
            this.cameras.main.startFollow(player, true, 0.08, 0.08, -250, camOffsetY);
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

    // Mountain (Distant Object)
    if (!this.textures.exists('mountain')) {
        graphics.fillStyle(0x444477, 1);
        graphics.beginPath();
        graphics.moveTo(0, 100);
        graphics.lineTo(50, 0);
        graphics.lineTo(100, 100);
        graphics.closePath();
        graphics.fillPath();
        // Snow Cap
        graphics.fillStyle(0xffffff, 1);
        graphics.beginPath();
        graphics.moveTo(50, 0);
        graphics.lineTo(35, 30);
        graphics.lineTo(65, 30);
        graphics.closePath();
        graphics.fillPath();
        graphics.generateTexture('mountain', 100, 100);
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
            // Remove white background
            if (r > 240 && g > 240 && b > 240) {
                data[i + 3] = 0;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.refresh();

        // Add frames (3 cols, 2 rows) - 1024x1024 total, ~341x512 per frame
        const fW = 341;
        const fH = 512;
        for (let i = 0; i < 6; i++) {
            const x = (i % 3) * fW;
            const y = Math.floor(i / 3) * fH;
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

    graphics.destroy();
    // -------------------------

    // Background
    const bgScale = gameHeight / 1536;
    this.background = this.add.tileSprite(0, 0, gameWidth / bgScale, 1536, 'bg_layer');
    this.background.setOrigin(0, 0);
    this.background.setScrollFactor(0);
    this.background.setDepth(-100);
    this.background.setScale(bgScale);

    // Platforms & Stars
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    monsters = this.physics.add.group();
    lasers = this.physics.add.group(); // New
    gemGroup = this.physics.add.staticGroup();

    // Initial Setup
    lastPlatformY = gameHeight * 0.49;
    nextPlatformX = 0;
    bigHoleGenerated = false;
    jumps = 0;
    this.lastStoryMilestone = 0;
    this.startTime = this.time.now;

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
                const multiplier = 1 + (dist / 2000);
                amount = Math.floor(amount * multiplier);

                window.gameState.coins += Math.max(1, amount);
                if (scoreText) scoreText.setText(window.gameState.coins);
                updateShopUI();
            },
            loop: true
        });
    }

    // Supply Drop (Periodic Reward)
    this.time.addEvent({
        delay: 120000, // 2 minutes
        callback: () => {
             const dist = window.gameState.maxDistance || 0;
             const bonus = 1 + (dist / 2000);
             const reward = Math.floor(50 * bonus);
             window.gameState.coins += reward;
             if (scoreText) scoreText.setText(window.gameState.coins);
             showStoryMessage(this, "Command Center: Supply Drop received. +" + reward + " coins.");
             updateShopUI();
        },
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
    player.setScale(0.1); // Scale down the large spritesheet
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
    this.physics.add.overlap(player, monsters, hitMonster, null, this); // Changed callback
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, gemGroup, collectGem, null, this);
    this.physics.add.overlap(lasers, monsters, laserHitMonster, null, this); // Laser collision

    // Camera
    const camOffsetY = (gameHeight * -0.05);
    this.cameras.main.startFollow(player, true, 0.08, 0.08, -250, camOffsetY);
    this.cameras.main.setDeadzone(100, 100);

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

    // Expose for debugging/testing
    this.monsters = monsters;
    this.player = player;

    // Auto-save every 10 seconds
    this.time.addEvent({
        delay: 10000,
        callback: () => window.saveGame(),
        loop: true
    });

    // Notify about offline earnings
    if (window.offlineEarnings && window.offlineEarnings > 0) {
         this.time.delayedCall(1000, () => {
             showStoryMessage(this, "Command Center: Offline mining complete. +" + window.offlineEarnings + " coins.");
             window.offlineEarnings = 0;
         });
    }
}

function createUI(scene) {
    scene.add.image(24, 32, 'star').setScrollFactor(0);
    scoreText = scene.add.text(45, 16, window.gameState.coins, { fontSize: '32px', fill: '#fff', fontFamily: 'Courier' }).setScrollFactor(0);

    robotText = scene.add.text(16, 60, 'Robot MK-' + window.gameState.robotVersion, { fontSize: '24px', fill: '#0ff', fontFamily: 'Courier' }).setScrollFactor(0);

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
    createMinimap(scene);

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

function update() {
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
        if (laser.active && laser.x > camX + gameWidth + 100) {
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
    window.gameState.maxDistance = Math.max(window.gameState.maxDistance || 0, Math.floor(player.x));

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
        const magnetRange = 300;
        stars.children.iterate((star) => {
            if (star.active && Phaser.Math.Distance.Between(player.x, player.y, star.x, star.y) < magnetRange) {
                const angle = Phaser.Math.Angle.Between(star.x, star.y, player.x, player.y);
                const speed = 10;
                star.x += Math.cos(angle) * speed;
                star.y += Math.sin(angle) * speed;
                star.refreshBody();
            }
        });
        gemGroup.children.iterate((gem) => {
             if (gem.active && Phaser.Math.Distance.Between(player.x, player.y, gem.x, gem.y) < magnetRange) {
                const angle = Phaser.Math.Angle.Between(gem.x, gem.y, player.x, player.y);
                const speed = 10;
                gem.x += Math.cos(angle) * speed;
                gem.y += Math.sin(angle) * speed;
                gem.refreshBody();
            }
        });
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
            let minDist = 400;
            monsters.children.iterate((monster) => {
                if (monster.active) {
                    const d = Phaser.Math.Distance.Between(player.x, player.y, monster.x, monster.y);
                    if (d < minDist && monster.x > player.x) {
                        minDist = d;
                        target = monster;
                    }
                }
            });

            if (target) {
                if (window.gameState.hasLaser) {
                    handleLaser(this);
                    this.lastAutoAttackTime = now;
                } else if (window.gameState.hasSword && minDist < 100) {
                    handleSword(this);
                    this.lastAutoAttackTime = now;
                }
            }
        }
    }

    cleanup(this);
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
    showStoryMessage(laser.scene, "Command Center: Target neutralized.");
}

function respawn(scene) {
    window.gameState.robotVersion++;
    window.saveGame();
    scene.scene.restart();
}

function createPlatform(scene, x, y, width, tint = 0xff00ff) {
    const platform = platforms.create(x + width / 2, y, 'ground');
    platform.displayWidth = width;
    platform.displayHeight = 32;
    platform.refreshBody();
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
        let unreachPlat = platforms.create(startX, unreachY, 'ground');
        unreachPlat.displayWidth = 200;
        unreachPlat.displayHeight = 32;
        unreachPlat.refreshBody();
        unreachPlat.setTint(0x555555);
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
             if (spike) spike.enableBody(true, startX + (i*spikeWidth) + 16, y - 32, true, true);
        }
    } else if (window.gameState.hasDoubleJump && nextPlatformX > TUTORIAL_LIMIT) {
        if (Phaser.Math.Between(0, 100) < 25) {
            const numSpikes = 1;
            for(let i=0; i<numSpikes; i++) {
                 let sx = startX + Phaser.Math.Between(50, width - 50);
                 let spike = spikes.get(sx, y - 32, 'spike');
                 if (spike) spike.enableBody(true, sx, y - 32, true, true);
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
    window.gameState.coins += 1;
    scoreText.setText(window.gameState.coins);
    updateShopUI();
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

function createSettingsUI(scene) {
    settingsContainer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100).setVisible(false);
    const bg = scene.add.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, 0x000000, 0.8);
    settingsContainer.add(bg);
    const title = scene.add.text(gameWidth/2, 100, 'SETTINGS', { fontSize: '40px', fill: '#fff', fontFamily: 'Courier' }).setOrigin(0.5);
    settingsContainer.add(title);
    const amelText = scene.add.text(gameWidth/2, 200, '', { fontSize: '24px', fill: '#fff', align: 'center', fontFamily: 'Courier' }).setOrigin(0.5);
    amelText.setName('amelText');
    settingsContainer.add(amelText);
    const resumeBtn = scene.add.text(gameWidth/2, 400, 'RESUME', { fontSize: '32px', fill: '#0f0', backgroundColor: '#333', fontFamily: 'Courier' })
        .setPadding(10)
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(101)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleSettings(scene));
    resumeBtn.setName('resumeBtn');
}

function createMinimap(scene) {
    minimapContainer = scene.add.container(gameWidth - 200 - 20, gameHeight - 100 - 20).setScrollFactor(0).setDepth(90);
    const bg = scene.add.rectangle(100, 50, 200, 100, 0x000000, 0.5);
    bg.setStrokeStyle(2, 0xffffff);
    minimapContainer.add(bg);
    minimapPlayer = scene.add.circle(0, 0, 4, 0x00ff00);
    minimapContainer.add(minimapPlayer);
    minimapGem = scene.add.circle(195, 10, 4, 0x00ffff);
    minimapContainer.add(minimapGem);
    scene.scale.on('resize', (gameSize) => {
        minimapContainer.setPosition(gameSize.width - 200 - 20, gameSize.height - 100 - 20);
    });
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
