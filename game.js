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
let cursors;
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
    hasCoinMaker: false,
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

const game = new Phaser.Game(config);
window.game = game;

function preload() {
    // Assets are generated in create() to avoid external dependency issues
}

function create() {
    gameWidth = this.scale.width;
    gameHeight = this.scale.height;

    // Register UpgradeScene if not already (assuming it is loaded)
    if (!this.scene.get('UpgradeScene')) {
        // UpgradeScene should be available globally if loaded via script
        if (typeof UpgradeScene !== 'undefined') {
            this.scene.add('UpgradeScene', UpgradeScene, false);
        }
    }

    this.scale.on('resize', (gameSize) => {
        gameWidth = gameSize.width;
        gameHeight = gameSize.height;

        // Update Camera Offset
        this.cameras.main.setFollowOffset(-250, -(gameHeight * 0.4));

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

    // Mountain (Distant Object)
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

    // Ground
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

    // Star (Coin)
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

    // Gem (Objective)
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

    // Gear (Settings Icon)
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

    // Dude (Robot) Sprite Sheet
    // 32x48
    const drawRobotFrame = (offsetX, frameType) => {
        const cBody = 0xffffff;
        const cDark = 0x333333;
        const cEye = 0x00ffff; // Cyan eye
        const cAntenna = 0xff0000;
        const cLimbs = 0x555555;

        // Limbs function
        const drawLimb = (x, y, w, h) => {
             graphics.fillStyle(cLimbs, 1);
             graphics.fillRoundedRect(offsetX + x, y, w, h, 2);
        };

        // Legs (Behind)
        if (frameType === 1) drawLimb(8, 34, 5, 10); // Back leg up
        else drawLimb(10, 34, 5, 14); // Back leg down

        // Body
        graphics.fillStyle(cBody, 1);
        graphics.fillRoundedRect(offsetX + 4, 16, 24, 20, 8); // Round body

        // Head
        graphics.fillStyle(cBody, 1);
        graphics.fillRoundedRect(offsetX + 2, 0, 28, 24, 10); // Round head

        // Face / Visor
        graphics.fillStyle(cDark, 1);
        graphics.fillRoundedRect(offsetX + 6, 6, 20, 12, 4);

        // Eyes
        graphics.fillStyle(cEye, 1);
        graphics.fillCircle(offsetX + 12, 12, 3);
        graphics.fillCircle(offsetX + 20, 12, 3);

        // Antenna
        graphics.lineStyle(2, cDark);
        graphics.lineBetween(offsetX + 16, 0, offsetX + 16, -5);
        graphics.fillStyle(cAntenna, 1);
        graphics.fillCircle(offsetX + 16, -5, 3);

        // Arms (Side/Front)
        // Simple arm logic
        drawLimb(12, 20, 4, 12);

        // Legs (Front)
        if (frameType === 2) drawLimb(22, 34, 5, 10); // Front leg up
        else if (frameType === 3) { // Jump
             drawLimb(8, 32, 5, 10);
             drawLimb(20, 30, 5, 10);
        }
        else drawLimb(18, 34, 5, 14); // Front leg down
    };

    drawRobotFrame(0, 0);   // Stand
    drawRobotFrame(32, 1);  // Left Up
    drawRobotFrame(64, 0);  // Stand
    drawRobotFrame(96, 2);  // Right Up
    drawRobotFrame(128, 3); // Jump

    graphics.generateTexture('dude_run', 160, 48);
    graphics.clear();

    graphics.destroy();

    // Add frames to the generated texture to act as a spritesheet
    const dudeTexture = this.textures.get('dude_run');
    // add(name, sourceIndex, x, y, width, height)
    dudeTexture.add(0, 0, 0, 0, 32, 48);
    dudeTexture.add(1, 0, 32, 0, 32, 48);
    dudeTexture.add(2, 0, 64, 0, 32, 48);
    dudeTexture.add(3, 0, 96, 0, 32, 48);
    dudeTexture.add(4, 0, 128, 0, 32, 48);
    // -------------------------

    // Background
    this.cameras.main.setBackgroundColor('#87CEEB');

    // Mountains (Distant Objects)
    mountains = this.add.group();
    for (let i = 0; i < 5; i++) {
        let x = Phaser.Math.Between(2000, 4000);
        let y = gameHeight - Phaser.Math.Between(50, 200);
        let mountain = mountains.create(x, y, 'mountain');
        mountain.setOrigin(0.5, 1);
        let scale = Phaser.Math.FloatBetween(2.0, 4.0);
        mountain.setScale(scale);
        mountain.setScrollFactor(0.1); // Move very slowly
        mountain.setDepth(-10); // Behind everything
        mountain.setTint(0x8888aa);
    }

    // Clouds
    clouds = this.add.group();
    for (let i = 0; i < 100; i++) { // Increased clouds
        let x = Phaser.Math.Between(0, gameWidth);
        let y = Phaser.Math.Between(0, gameHeight * 0.9);
        let cloud = clouds.create(x, y, 'cloud');
        let scale = Phaser.Math.FloatBetween(0.5, 1.5);
        cloud.setScale(scale);
        cloud.setScrollFactor(0.3 + (scale * 0.1)); // Larger clouds move faster (closer)
        cloud.alpha = 0.8;
    }

    // Platforms & Stars
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();
    gemGroup = this.physics.add.staticGroup();

    // Initial Setup
    lastPlatformY = gameHeight - 50;
    nextPlatformX = 0;
    bigHoleGenerated = false;
    jumps = 0;
    this.lastStoryMilestone = 0;
    this.startTime = this.time.now; // Track start time for "Armor Zone"

    // Coin Maker Upgrade
    if (window.gameState.hasCoinMaker) {
        this.time.addEvent({
            delay: 1000,
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
    // Starting Coins
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
    this.physics.add.overlap(player, stars, collectStar, null, this);
    this.physics.add.overlap(player, gemGroup, collectGem, null, this);

    // Camera
    // Offset -250 puts the player to the left.
    // Negative Y offset moves camera up, which pushes player down on screen.
    const camOffsetY = -(gameHeight * 0.4);
    this.cameras.main.startFollow(player, true, 0.08, 0.08, -250, camOffsetY);
    this.cameras.main.setDeadzone(100, 100);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', (pointer) => {
        if (pointer.y > 100) {
             handleJump();
        }
    });

    // UI Setup
    createUI(this);
}

function createUI(scene) {
    // Coin Icon and Score
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

    // Settings Button (Gear Icon)
    scene.add.image(30, 100, 'gear')
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => toggleSettings(scene));

    createSettingsUI(scene);

    // Story Text
    let storyMsg = "Command Center: System Online. Objective: Explore Planet Xylos. Find the Gem.";
    if (window.gameState.robotVersion > 1) {
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
                 fallMessages.push("Command Center: If only you could jump again in mid-air...");
             }
             storyMsg = Phaser.Utils.Array.GetRandom(fallMessages);
        } else if (window.gameState.lastDeathReason === 'spike' && !window.gameState.hasArmor) {
             storyMsg = "Command Center: Spikes detected. Armor plating recommended.";
        } else {
             if (Phaser.Math.Between(0, 100) > 60) {
                 storyMsg = Phaser.Utils.Array.GetRandom(loreMessages);
             } else {
                 storyMsg = "Command Center: Unit lost. Consciousness transferred to MK-" + window.gameState.robotVersion + ". Coins retained.";
             }
        }
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

    // Fade out story text after a few seconds
    scene.time.delayedCall(4000, () => {
        scene.tweens.add({
            targets: storyText,
            alpha: 0,
            duration: 1000
        });
    });

    updateShopUI();
}

function update() {
    // Auto run
    player.setVelocityX(250);

    // Animation
    if (player.body.touching.down) {
        player.anims.play('run', true);
        jumps = 0; // Reset jumps when grounded
    } else {
        player.anims.stop();
        player.setFrame(4); // Jump frame
    }

    // Clouds Recycling
    const camX = this.cameras.main.scrollX;
    clouds.children.iterate((cloud) => {
        if (cloud.x < camX - 400) {
            cloud.x = camX + gameWidth + Phaser.Math.Between(100, 800);
            cloud.y = Phaser.Math.Between(0, gameHeight * 0.9);
        }
    });

    // Mountains Recycling
    mountains.children.iterate((mtn) => {
        // Since scrollFactor is 0.1, we need to calculate world position relative to camera carefully
        // Or just let them be, but eventually they will go off screen if the world moves endlessly?
        // With scrollFactor < 1, they move slower than camera.
        // Eventually the camera will pass them.
        // We can just respawn them ahead.
        if (mtn.x < camX - 1000) { // arbitrary threshold
             mtn.x = camX + gameWidth + Phaser.Math.Between(200, 800);
        }
    });

    // Jump Input (Keyboard)
    if (Phaser.Input.Keyboard.JustDown(cursors.space) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        handleJump();
    }

    // Jetpack Logic
    if (window.gameState.hasJetpack && (cursors.space.isDown || cursors.up.isDown) && !player.body.touching.down) {
        player.setVelocityY(-300);
    }

    // Level Generation
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + gameWidth;

    if (nextPlatformX < rightEdge + 800) {
        spawnNextPlatform(this);
    }

    // Death Logic
    if (player.y > lastPlatformY + 300) { // Increased threshold slightly and relative to platform level
        window.gameState.lastDeathReason = 'fall';
        respawn(this);
    }

    // Story Milestones
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

    cleanup(this);
}

function cleanup(scene) {
    const scrollX = scene.cameras.main.scrollX;
    const cleanupThreshold = scrollX - 200;

    // Cleanup Platforms
    const pChildren = platforms.getChildren();
    for (let i = pChildren.length - 1; i >= 0; i--) {
        const child = pChildren[i];
        if (child.x + child.displayWidth / 2 < cleanupThreshold) {
            child.destroy();
        }
    }

    // Cleanup Stars
    const sChildren = stars.getChildren();
    for (let i = sChildren.length - 1; i >= 0; i--) {
        const child = sChildren[i];
        if (child.x < cleanupThreshold) {
            child.destroy();
        }
    }

    // Cleanup Spikes
    const kChildren = spikes.getChildren();
    for (let i = kChildren.length - 1; i >= 0; i--) {
        const child = kChildren[i];
        if (child.x < cleanupThreshold) {
            child.destroy();
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

function respawn(scene) {
    window.gameState.robotVersion++;
    scene.scene.restart();
}

function createPlatform(scene, x, y, width) {
    const platform = platforms.create(x + width / 2, y, 'ground');
    platform.displayWidth = width;
    platform.displayHeight = 32;
    platform.refreshBody();
    platform.setTint(0xff00ff); // Neon Purple
}

function spawnNextPlatform(scene) {
    let gap = Phaser.Math.Between(100, 200);
    let width = Phaser.Math.Between(200, 600);
    let y = lastPlatformY;
    const TUTORIAL_LIMIT = 3000;

    // Tutorial Phase: Continuous ground
    if (nextPlatformX < TUTORIAL_LIMIT) {
        gap = 0;
        width = Phaser.Math.Between(400, 800);
    }

    // Armor Zone Logic: After 30 seconds, force a dangerous zone
    // We'll create a platform completely covered in spikes occasionally if time > 30s
    let isArmorZone = false;
    if (scene.startTime && (scene.time.now - scene.startTime > 30000)) {
        // 20% chance to spawn an Armor Zone segment
        if (Phaser.Math.Between(0, 100) < 20) {
             isArmorZone = true;
             width = 600; // Fixed width for the zone
        }
    }

    // Big Hole Logic
    if (!bigHoleGenerated && nextPlatformX > 3000) {
        gap = 450;
        bigHoleGenerated = true;
        width = 800;
    }

    let startX = nextPlatformX + gap;
    createPlatform(scene, startX, y, width);

    // Unreachable Platform (Decorative/Taunt)
    if (Phaser.Math.Between(0, 100) < 10) { // 10% chance
        let unreachY = y - Phaser.Math.Between(300, 400);
        let unreachPlat = platforms.create(startX, unreachY, 'ground');
        unreachPlat.displayWidth = 200;
        unreachPlat.displayHeight = 32;
        unreachPlat.refreshBody();
        unreachPlat.setTint(0x555555); // Greyed out
        // Add a lot of coins on the top platform
        for(let k=0; k<5; k++) {
             stars.create(startX - 80 + (k*40), unreachY - 50, 'star');
        }
    }

    // Spawn Stars
    const numStars = Phaser.Math.Between(0, 3);
    const step = width / (numStars + 1);
    for(let i=1; i<=numStars; i++) {
        // "The coins should be a bit higher so we should get them more easily with a jump"
        let starY = y - 150;
        stars.create(startX + (i*step), starY, 'star');
    }

    // Spawn Spikes
    if (isArmorZone) {
        // Dense spikes covering the platform
        const spikeWidth = 32;
        const numSpikes = Math.floor(width / spikeWidth);
        for(let i=0; i<numSpikes; i++) {
             spikes.create(startX + (i*spikeWidth) + 16, y - 32, 'spike');
        }
    } else if (window.gameState.hasDoubleJump && nextPlatformX > TUTORIAL_LIMIT) {
        // Normal spike generation
        if (Phaser.Math.Between(0, 100) < 25) { // 25% chance per platform
            const numSpikes = 1;
            for(let i=0; i<numSpikes; i++) {
                 // Random position on platform, avoiding edges slightly
                 let sx = startX + Phaser.Math.Between(50, width - 50);
                 spikes.create(sx, y - 32, 'spike');
            }
        }
    }

    // Spawn Gem (Objective)
    if (!window.gameState.hasGem && nextPlatformX > 5000 && gemGroup.getLength() === 0) {
         gemGroup.create(startX + width / 2, y - 60, 'gem');
    }

    // Update state
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

    // Reset fade out
    scene.tweens.killTweensOf(storyText);
    scene.time.delayedCall(4000, () => {
        scene.tweens.add({
            targets: storyText,
            alpha: 0,
            duration: 1000
        });
    });
}

function handleShopAction(scene) {
    // Open Upgrade Scene if available
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

    // Background
    const bg = scene.add.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, 0x000000, 0.8);
    settingsContainer.add(bg);

    // Title
    const title = scene.add.text(gameWidth/2, 100, 'SETTINGS', { fontSize: '40px', fill: '#fff', fontFamily: 'Courier' }).setOrigin(0.5);
    settingsContainer.add(title);

    // Ameliorations Text
    const amelText = scene.add.text(gameWidth/2, 200, '', { fontSize: '24px', fill: '#fff', align: 'center', fontFamily: 'Courier' }).setOrigin(0.5);
    amelText.setName('amelText');
    settingsContainer.add(amelText);

    // Resume Button
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

function toggleSettings(scene) {
    const resumeBtn = scene.children.getByName('resumeBtn');

    if (scene.physics.world.isPaused) {
        // If UpgradeScene is running, we might need to handle that.
        // But this settings menu is separate.
        scene.physics.resume();
        settingsContainer.setVisible(false);
        if (resumeBtn) resumeBtn.setVisible(false);
    } else {
        scene.physics.pause();

        // Update text
        let content = "AMELIORATIONS BOUGHT:\n\n";
        content += "Double Jump: " + (window.gameState.hasDoubleJump ? "YES" : "NO") + "\n";
        content += "Armor: " + (window.gameState.hasArmor ? "YES" : "NO") + "\n";

        const textObj = settingsContainer.getByName('amelText');
        if (textObj) textObj.setText(content);

        settingsContainer.setVisible(true);
        if (resumeBtn) resumeBtn.setVisible(true);
    }
}
