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
let stars;
let spikes;
let cursors;
let nextPlatformX = 0;
let lastPlatformY = 0;
let gameWidth;
let gameHeight;

// Game State
let coins = 0;
let robotVersion = 1;
let hasDoubleJump = false;
let hasArmor = false;
let bigHoleGenerated = false;
let jumps = 0;
let lastDeathReason = '';

// UI
let scoreText;
let robotText;
let shopText;
let storyText;

const game = new Phaser.Game(config);
window.game = game;

function preload() {
    // Assets are generated in create() to avoid external dependency issues
}

function create() {
    gameWidth = this.scale.width;
    gameHeight = this.scale.height;

    this.scale.on('resize', (gameSize) => {
        gameWidth = gameSize.width;
        gameHeight = gameSize.height;

        if (this.bg) {
            this.bg.setPosition(gameWidth / 2, gameHeight / 2);
            let scale = Math.max(gameWidth / 800, gameHeight / 600);
            this.bg.setScale(scale);
        }

        if (shopText) shopText.setPosition(gameWidth - 16, 16);
        if (storyText) storyText.setPosition(gameWidth / 2, gameHeight - 40);
    });

    // --- Generate Textures ---
    const graphics = this.make.graphics();

    // Background (Cyberpunk City)
    graphics.fillStyle(0x050510, 1);
    graphics.fillRect(0, 0, 800, 600);
    // Stars
    graphics.fillStyle(0xffffff, 0.5);
    for(let i=0; i<50; i++) {
        graphics.fillCircle(Math.random() * 800, Math.random() * 600, Math.random() * 2);
    }
    // Far Buildings
    graphics.fillStyle(0x1a1a2e, 1);
    for(let i=0; i<15; i++) {
        let h = Phaser.Math.Between(100, 300);
        let w = Phaser.Math.Between(30, 80);
        let x = Phaser.Math.Between(0, 800);
        graphics.fillRect(x, 600 - h, w, h);
    }
    // Near Buildings
    graphics.fillStyle(0x0f0f1a, 1);
    for(let i=0; i<10; i++) {
        let h = Phaser.Math.Between(50, 200);
        let w = Phaser.Math.Between(40, 100);
        let x = Phaser.Math.Between(0, 800);
        graphics.fillRect(x, 600 - h, w, h);
        // Neon Lights
        graphics.fillStyle(0x00ffcc, 0.8);
        for(let j=0; j<3; j++) {
            graphics.fillRect(x + Phaser.Math.Between(5, w-10), 600 - Phaser.Math.Between(10, h-10), 4, 4);
        }
        graphics.fillStyle(0x0f0f1a, 1);
    }
    graphics.generateTexture('background', 800, 600);
    graphics.clear();

    // Ground
    graphics.fillStyle(0x00ff00, 1); // Green ground
    graphics.fillRect(0, 0, 32, 32);
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
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.generateTexture('star', 24, 24);
    graphics.clear();

    // Dude (Robot) Sprite Sheet
    // 32x48
    const drawRobotFrame = (offsetX, frameType) => {
        // Body (Metallic)
        graphics.fillStyle(0x8888aa, 1);
        graphics.fillRect(offsetX + 8, 16, 16, 18); // Torso

        // Head
        graphics.fillStyle(0xaaaaaa, 1);
        graphics.fillRoundedRect(offsetX + 8, 4, 16, 12, 2);

        // Visor (Eye) - Side view
        graphics.fillStyle(0x00ff00, 1);
        graphics.fillRect(offsetX + 18, 8, 6, 4);

        // Antenna
        graphics.lineStyle(1, 0xdddddd);
        graphics.lineBetween(offsetX + 16, 4, offsetX + 16, 0);
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(offsetX + 16, 0, 1);

        // Arms & Legs
        graphics.fillStyle(0x666688, 1);

        // Arms
        graphics.fillRect(offsetX + 10, 18, 4, 12); // Back arm
        graphics.fillRect(offsetX + 20, 18, 4, 12); // Front arm (side view, maybe only one visible or overlapping)

        // Legs
        if (frameType === 0) { // Stand
             graphics.fillRect(offsetX + 10, 34, 5, 14);
             graphics.fillRect(offsetX + 18, 34, 5, 14);
        } else if (frameType === 1) { // Run 1
             graphics.fillRect(offsetX + 8, 34, 5, 10); // Back leg up
             graphics.fillRect(offsetX + 20, 34, 5, 14); // Front leg down
        } else if (frameType === 2) { // Run 2
             graphics.fillRect(offsetX + 10, 34, 5, 14); // Back leg down
             graphics.fillRect(offsetX + 22, 34, 5, 10); // Front leg up
        }
    };

    drawRobotFrame(0, 0);   // Stand
    drawRobotFrame(32, 1);  // Left Up
    drawRobotFrame(64, 0);  // Stand
    drawRobotFrame(96, 2);  // Right Up

    graphics.generateTexture('dude_run', 128, 48);
    graphics.clear();

    graphics.destroy();

    // Add frames to the generated texture to act as a spritesheet
    const dudeTexture = this.textures.get('dude_run');
    // add(name, sourceIndex, x, y, width, height)
    dudeTexture.add(0, 0, 0, 0, 32, 48);
    dudeTexture.add(1, 0, 32, 0, 32, 48);
    dudeTexture.add(2, 0, 64, 0, 32, 48);
    dudeTexture.add(3, 0, 96, 0, 32, 48);
    // -------------------------

    // Background
    // Replaced 'sky' with 'background' which is 800x600. We scale it to cover.
    let bg = this.add.image(gameWidth / 2, gameHeight / 2, 'background').setScrollFactor(0);
    // Scale logic will be handled in resize, but initial:
    let scaleX = gameWidth / 800;
    let scaleY = gameHeight / 600;
    let scale = Math.max(scaleX, scaleY);
    bg.setScale(scale).setScrollFactor(0);
    this.bg = bg; // Store reference for resize

    // Platforms & Stars
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();
    spikes = this.physics.add.staticGroup();

    // Initial Setup
    lastPlatformY = gameHeight - 50;
    nextPlatformX = 0;
    bigHoleGenerated = false;
    jumps = 0;

    // Create initial ground
    createPlatform(this, 0, lastPlatformY, 1000);
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

    // Camera
    // Offset -250 puts the player to the left? Let's try inverting.
    // If +250 put it on the right, -250 should put it on the left.
    this.cameras.main.startFollow(player, true, 0.08, 0.08, -250, 0);
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
    scoreText = scene.add.text(16, 16, 'Coins: ' + coins, { fontSize: '32px', fill: '#fff', fontFamily: 'Courier' }).setScrollFactor(0);
    robotText = scene.add.text(16, 50, 'Robot MK-' + robotVersion, { fontSize: '24px', fill: '#0ff', fontFamily: 'Courier' }).setScrollFactor(0);

    shopText = scene.add.text(gameWidth - 16, 16, '', { fontSize: '24px', fill: '#aaa', align: 'right', fontFamily: 'Courier' })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => handleShopAction())
        .on('pointerover', () => shopText.setScale(1.1))
        .on('pointerout', () => shopText.setScale(1.0));

    scene.input.keyboard.on('keydown-B', () => handleShopAction());

    // Story Text
    let storyMsg = "System Online. Objective: Collect Coins.";
    if (robotVersion > 1) {
        if (lastDeathReason === 'fall' && !hasDoubleJump) {
             storyMsg = "Gravity is harsh. A double jump would help!";
        } else {
            const messages = [
                "Signal Lost. Consciousness uploaded to MK-" + robotVersion + ".",
                "Previous unit scrapped. Optimizing algorithms...",
                "Did you try not falling?",
                "Error 404: Floor not found.",
                "Rebooting... Please don't die this time."
            ];
            storyMsg = messages[Math.floor(Math.random() * messages.length)];
        }
    }

    storyText = scene.add.text(gameWidth / 2, gameHeight - 40, storyMsg, {
        fontSize: '20px',
        fill: '#0f0',
        backgroundColor: '#00000088',
        padding: { x: 10, y: 5 },
        fontFamily: 'Courier'
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

    // Reset jumps when grounded
    if (player.body.touching.down) {
        jumps = 0;
    }

    // Jump Input (Keyboard)
    if (Phaser.Input.Keyboard.JustDown(cursors.space) || Phaser.Input.Keyboard.JustDown(cursors.up)) {
        handleJump();
    }

    // Level Generation
    const scrollX = this.cameras.main.scrollX;
    const rightEdge = scrollX + gameWidth;

    if (nextPlatformX < rightEdge + 800) {
        spawnNextPlatform(this);
    }

    // Death Logic
    if (player.y > lastPlatformY + 300) { // Increased threshold slightly and relative to platform level
        lastDeathReason = 'fall';
        respawn(this);
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
    } else if (hasDoubleJump && jumps < 2) {
        player.setVelocityY(-500);
        jumps = 2;
    }
}

function respawn(scene) {
    robotVersion++;
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

    // Big Hole Logic
    if (!bigHoleGenerated && nextPlatformX > 3000) {
        gap = 450;
        bigHoleGenerated = true;
        width = 800;
    }

    let startX = nextPlatformX + gap;
    createPlatform(scene, startX, y, width);

    // Spawn Stars
    const numStars = Phaser.Math.Between(0, 3);
    const step = width / (numStars + 1);
    for(let i=1; i<=numStars; i++) {
        stars.create(startX + (i*step), y - 40, 'star');
    }

    // Spawn Spikes (After Double Jump)
    if (hasDoubleJump) {
        const numSpikes = Phaser.Math.Between(1, 3); // Hard!
        for(let i=0; i<numSpikes; i++) {
             // Random position on platform, avoiding edges slightly
             let sx = startX + Phaser.Math.Between(50, width - 50);
             spikes.create(sx, y - 32, 'spike');
        }
    }

    // Update state
    nextPlatformX += gap + width;
    lastPlatformY = y;
}

function hitSpike(player, spike) {
    if (hasArmor) {
        hasArmor = false;
        spike.destroy();
        player.scene.cameras.main.shake(200, 0.01);
        updateShopUI();
        return;
    }
    lastDeathReason = 'spike';
    respawn(player.scene);
}

function collectStar(player, star) {
    star.disableBody(true, true);
    coins += 1;
    scoreText.setText('Coins: ' + coins);
    updateShopUI();
}

function handleShopAction() {
    if (!hasDoubleJump) {
        if (coins >= 50) {
            coins -= 50;
            hasDoubleJump = true;
            scoreText.setText('Coins: ' + coins);
            updateShopUI();
        }
    } else if (!hasArmor) {
        if (coins >= 100) {
            coins -= 100;
            hasArmor = true;
            scoreText.setText('Coins: ' + coins);
            updateShopUI();
        }
    }
}

function updateShopUI() {
    let text = '';
    let color = '#aaa';

    if (!hasDoubleJump) {
        text = 'Buy Double Jump\n(50 Coins) [B]';
        color = (coins >= 50) ? '#ff0' : '#aaa';
    } else if (!hasArmor) {
        text = 'Buy Armor\n(100 Coins) [B]';
        color = (coins >= 100) ? '#ff0' : '#aaa';
    } else {
        text = 'Armor\nEQUIPPED';
        color = '#0f0';
    }

    if (shopText) {
        shopText.setText(text);
        shopText.setColor(color);
    }
}
