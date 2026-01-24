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
    lastDeathReason: ''
};

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
    // Assets are generated in create() to avoid external dependency issues
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

        // Update Camera Offset
        this.cameras.main.setFollowOffset(-250, (gameHeight * 0.15));

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
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillCircle(20, 25, 20);
    graphics.fillCircle(40, 25, 20);
    graphics.fillCircle(60, 25, 20);
    graphics.fillCircle(30, 15, 20);
    graphics.fillCircle(50, 15, 20);
    graphics.generateTexture('cloud', 80, 50);
    graphics.clear();

    // Mountain
    graphics.fillStyle(0x444477, 1);
    graphics.beginPath();
    graphics.moveTo(0, 100);
    graphics.lineTo(50, 0);
    graphics.lineTo(100, 100);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(50, 0);
    graphics.lineTo(35, 30);
    graphics.lineTo(65, 30);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('mountain', 100, 100);
    graphics.clear();

    // Ground
    graphics.fillStyle(0x66cc66, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x44aa44, 1);
    graphics.beginPath();
    graphics.moveTo(0, 0); graphics.lineTo(4, 8); graphics.lineTo(8, 0);
    graphics.moveTo(10, 0); graphics.lineTo(14, 6); graphics.lineTo(18, 0);
    graphics.closePath();
    graphics.fillPath();
    graphics.fillStyle(0x553311, 1);
    graphics.fillCircle(16, 20, 2);
    graphics.fillCircle(24, 28, 3);
    graphics.generateTexture('ground', 32, 32);
    graphics.clear();

    // Spike
    graphics.fillStyle(0xff0000, 1);
    graphics.beginPath();
    graphics.moveTo(0, 32);
    graphics.lineTo(16, 0);
    graphics.lineTo(32, 32);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('spike', 32, 32);
    graphics.clear();

    // Monster
    graphics.fillStyle(0xcc0000, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(8, 10, 4);
    graphics.fillCircle(24, 10, 4);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(8, 10, 1);
    graphics.fillCircle(24, 10, 1);
    graphics.fillStyle(0xffffff, 1);
    graphics.beginPath();
    graphics.moveTo(4, 24); graphics.lineTo(8, 30); graphics.lineTo(12, 24);
    graphics.moveTo(12, 24); graphics.lineTo(16, 30); graphics.lineTo(20, 24);
    graphics.moveTo(20, 24); graphics.lineTo(24, 30); graphics.lineTo(28, 24);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('monster', 32, 32);
    graphics.clear();

    // Star
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.lineStyle(2, 0xB8860B, 1);
    graphics.strokeCircle(12, 12, 10);
    graphics.fillStyle(0xFFFACD, 0.5);
    graphics.fillCircle(9, 9, 3);
    graphics.fillStyle(0xFFFACD, 1);
    graphics.fillCircle(12, 12, 5);
    graphics.generateTexture('star', 24, 24);
    graphics.clear();

    // Gem
    graphics.fillStyle(0x00ffff, 1);
    graphics.beginPath();
    graphics.moveTo(12, 0);
    graphics.lineTo(24, 12);
    graphics.lineTo(12, 24);
    graphics.lineTo(0, 12);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('gem', 24, 24);
    graphics.clear();

    // Gear
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
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(16, 16, 4);
    graphics.generateTexture('gear', 32, 32);
    graphics.clear();

    // Sword
    graphics.clear();
    graphics.lineStyle(2, 0x00ffff, 1); // Cyan Blade
    graphics.beginPath();
    graphics.moveTo(8, 24);
    graphics.lineTo(24, 8);
    graphics.strokePath();
    graphics.lineStyle(2, 0x888888, 1); // Hilt
    graphics.beginPath();
    graphics.moveTo(6, 26);
    graphics.lineTo(10, 22);
    graphics.strokePath();
    graphics.generateTexture('sword', 32, 32);
    graphics.clear();

    // Laser
    graphics.fillStyle(0x00ff00, 1); // Green Laser
    graphics.fillRect(0, 0, 32, 8);
    graphics.generateTexture('laser', 32, 8);
    graphics.clear();

    // Slash Effect
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.beginPath();
    graphics.arc(16, 16, 16, -1, 1, false);
    graphics.strokePath();
    graphics.generateTexture('slash', 32, 32);
    graphics.clear();

    // Dude Sprite
    const drawRobotFrame = (offsetX, frameType) => {
        const cBody = 0xffffff;
        const cDark = 0x333333;
        const cEye = 0x00ffff;
        const cAntenna = 0xff0000;
        const cLimbs = 0x555555;
        const drawLimb = (x, y, w, h) => {
             graphics.fillStyle(cLimbs, 1);
             graphics.fillRoundedRect(offsetX + x, y, w, h, 2);
        };
        if (frameType === 1) drawLimb(8, 34, 5, 10);
        else drawLimb(10, 34, 5, 14);
        graphics.fillStyle(cBody, 1);
        graphics.fillRoundedRect(offsetX + 4, 16, 24, 20, 8);
        graphics.fillStyle(cBody, 1);
        graphics.fillRoundedRect(offsetX + 2, 0, 28, 24, 10);
        graphics.fillStyle(cDark, 1);
        graphics.fillRoundedRect(offsetX + 6, 6, 20, 12, 4);
        graphics.fillStyle(cEye, 1);
        graphics.fillCircle(offsetX + 12, 12, 3);
        graphics.fillCircle(offsetX + 20, 12, 3);
        graphics.lineStyle(2, cDark);
        graphics.lineBetween(offsetX + 16, 0, offsetX + 16, -5);
        graphics.fillStyle(cAntenna, 1);
        graphics.fillCircle(offsetX + 16, -5, 3);
        drawLimb(12, 20, 4, 12);
        if (frameType === 2) drawLimb(22, 34, 5, 10);
        else if (frameType === 3) {
             drawLimb(8, 32, 5, 10);
             drawLimb(20, 30, 5, 10);
        }
        else drawLimb(18, 34, 5, 14);
    };

    drawRobotFrame(0, 0);
    drawRobotFrame(32, 1);
    drawRobotFrame(64, 0);
    drawRobotFrame(96, 2);
    drawRobotFrame(128, 3);

    graphics.generateTexture('dude_run', 160, 48);
    graphics.clear();
    graphics.destroy();

    const dudeTexture = this.textures.get('dude_run');
    dudeTexture.add(0, 0, 0, 0, 32, 48);
    dudeTexture.add(1, 0, 32, 0, 32, 48);
    dudeTexture.add(2, 0, 64, 0, 32, 48);
    dudeTexture.add(3, 0, 96, 0, 32, 48);
    dudeTexture.add(4, 0, 128, 0, 32, 48);

    // Background
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Mountains
    mountains = this.add.group();
    for (let i = 0; i < 5; i++) {
        let x = Phaser.Math.Between(2000, 4000);
        let y = gameHeight - Phaser.Math.Between(50, 200);
        let mountain = mountains.create(x, y, 'mountain');
        mountain.setOrigin(0.5, 1);
        let scale = Phaser.Math.FloatBetween(2.0, 4.0);
        mountain.setScale(scale);
        mountain.setScrollFactor(0.1);
        mountain.setDepth(-10);
        mountain.setTint(0x8888aa);
    }

    // Clouds
    clouds = this.add.group();
    for (let i = 0; i < 300; i++) {
        let x = Phaser.Math.Between(0, gameWidth);
        let y = Phaser.Math.Between(0, gameHeight * 0.9);
        let cloud = clouds.create(x, y, 'cloud');
        let scale = Phaser.Math.FloatBetween(0.5, 1.5);
        cloud.setScale(scale);
        cloud.setScrollFactor(0.3 + (scale * 0.1));
        cloud.alpha = 0.8;
    }

    // Platforms & Stars
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    monsters = this.physics.add.group();
    lasers = this.physics.add.group(); // New
    gemGroup = this.physics.add.staticGroup();

    // Initial Setup
    lastPlatformY = gameHeight - 50;
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
                window.gameState.coins++;
                if (scoreText) scoreText.setText(window.gameState.coins);
                updateShopUI();
            },
            loop: true
        });
    }

    // Create initial ground
    createPlatform(this, 0, lastPlatformY, 1000);
    for(let k=0; k<4; k++) {
        stars.create(400 + k*60, lastPlatformY - 50, 'star');
    }
    nextPlatformX = 1000;

    // Player
    player = this.physics.add.sprite(100, lastPlatformY - 100, 'dude_run');
    player.setBounce(0.0);
    player.setCollideWorldBounds(false);

    // Animations
    if (!this.anims.exists('run')) {
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('dude_run', { start: 0, end: 3 }),
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
    const camOffsetY = (gameHeight * 0.15);
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
    this.clouds = clouds;
    this.player = player;
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

    scene.add.image(30, 100, 'gear')
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleSettings(scene));

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
        player.setFrame(4);
    }

    const camX = this.cameras.main.scrollX;
    clouds.children.iterate((cloud) => {
        if (cloud.x < camX - 400) {
            cloud.x = camX + gameWidth + Phaser.Math.Between(100, 800);
            cloud.y = Phaser.Math.Between(0, gameHeight * 0.9);
        }
    });

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
        if (laser && laser.x > camX + gameWidth + 100) {
            laser.destroy();
        }
    });

    mountains.children.iterate((mtn) => {
        if (mtn.x < camX - 1000) {
             mtn.x = camX + gameWidth + Phaser.Math.Between(200, 800);
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
    if (dist > 1000 && this.lastStoryMilestone < 1000) {
        showStoryMessage(this, "Command Center: Atmospheric density increasing. Thrusters at 90%.");
        this.lastStoryMilestone = 1000;
    } else if (dist > 2000 && this.lastStoryMilestone < 2000) {
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
        if (child.x < cleanupThreshold) child.destroy();
    }
    const kChildren = spikes.getChildren();
    for (let i = kChildren.length - 1; i >= 0; i--) {
        const child = kChildren[i];
        if (child.x < cleanupThreshold) child.destroy();
    }
    const mChildren = monsters.getChildren();
    for (let i = mChildren.length - 1; i >= 0; i--) {
        const child = mChildren[i];
        if (child.x < cleanupThreshold) child.destroy();
        else if (child.y > gameHeight + 100) child.destroy();
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
             monster.destroy();
        }
    });
}

function handleLaser(scene) {
    const laser = lasers.create(player.x + 20, player.y, 'laser');
    laser.setVelocityX(600);
    laser.body.allowGravity = false;
    showStoryMessage(scene, "Command Center: Laser discharged.");
}

function laserHitMonster(laser, monster) {
    laser.destroy();
    monster.destroy();
    showStoryMessage(laser.scene, "Command Center: Target neutralized.");
}

function respawn(scene) {
    window.gameState.robotVersion++;
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
             stars.create(startX + (k*50), highY - 50, 'star');
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
             stars.create(startX - 80 + (k*40), unreachY - 50, 'star');
        }
    }
    const numStars = Phaser.Math.Between(0, 3);
    const step = width / (numStars + 1);
    for(let i=1; i<=numStars; i++) {
        let starY = y - 150;
        stars.create(startX + (i*step), starY, 'star');
    }
    if (isArmorZone) {
        const spikeWidth = 32;
        const numSpikes = Math.floor(width / spikeWidth);
        for(let i=0; i<numSpikes; i++) {
             spikes.create(startX + (i*spikeWidth) + 16, y - 32, 'spike');
        }
    } else if (window.gameState.hasDoubleJump && nextPlatformX > TUTORIAL_LIMIT) {
        if (Phaser.Math.Between(0, 100) < 25) {
            const numSpikes = 1;
            for(let i=0; i<numSpikes; i++) {
                 let sx = startX + Phaser.Math.Between(50, width - 50);
                 spikes.create(sx, y - 32, 'spike');
            }
        }
    }
    if (nextPlatformX > 4000 && Phaser.Math.Between(0, 100) < 30) {
         let mx = startX + Phaser.Math.Between(50, width - 50);
         let monster = monsters.create(mx, y - 50, 'monster');
         monster.setBounce(1);
         monster.setCollideWorldBounds(false);
         monster.setVelocityX(Phaser.Math.Between(-40, 40));
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
