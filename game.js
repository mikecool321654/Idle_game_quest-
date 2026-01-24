const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
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
let cursors;
let nextPlatformX = 0;
let lastPlatformY = 0;
let gameWidth;
let gameHeight;

// Game State
let coins = 0;
let robotVersion = 1;
let hasDoubleJump = false;
let bigHoleGenerated = false;
let jumps = 0;

// UI
let scoreText;
let robotText;
let shopText;
let storyText;

const game = new Phaser.Game(config);

function preload() {
    // Assets are generated in create() to avoid external dependency issues
}

function create() {
    gameWidth = this.scale.width;
    gameHeight = this.scale.height;

    // --- Generate Textures ---
    const graphics = this.make.graphics();

    // Sky
    graphics.fillStyle(0x222222, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('sky', 32, 32);
    graphics.clear();

    // Ground
    graphics.fillStyle(0x00ff00, 1); // Green ground
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('ground', 32, 32);
    graphics.clear();

    // Star (Coin)
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(12, 12, 10);
    graphics.generateTexture('star', 24, 24);
    graphics.clear();

    // Dude
    graphics.fillStyle(0x00ffff, 1);
    graphics.fillRect(0, 0, 32, 48);
    graphics.generateTexture('dude', 32, 48);
    graphics.clear();

    graphics.destroy();
    // -------------------------

    // Background
    this.add.image(gameWidth / 2, gameHeight / 2, 'sky').setScrollFactor(0).setScale(gameWidth/32 + 10).setTint(0x888888);

    // Platforms & Stars
    platforms = this.physics.add.staticGroup();
    stars = this.physics.add.staticGroup();

    // Initial Setup
    lastPlatformY = gameHeight - 50;
    nextPlatformX = 0;
    bigHoleGenerated = false;
    jumps = 0;

    // Create initial ground
    createPlatform(this, 0, lastPlatformY, 1000);
    nextPlatformX = 1000;

    // Player
    player = this.physics.add.sprite(100, lastPlatformY - 100, 'dude');
    player.setBounce(0.0);
    player.setCollideWorldBounds(false);
    // player.setTint(0x00ffff); // Already cyan

    // Animations (Removed as we are using static textures)
    /*
    if (!this.anims.exists('left')) {
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        // ...
    }
    player.anims.play('right', true);
    */

    // Physics
    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, stars, collectStar, null, this);

    // Camera
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
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

    let shopString = hasDoubleJump ? 'Double Jump\nACQUIRED' : 'Buy Double Jump\n(50 Coins) [B]';
    let shopColor = hasDoubleJump ? '#0f0' : '#aaa';

    shopText = scene.add.text(gameWidth - 250, 16, shopString, { fontSize: '24px', fill: shopColor, align: 'right', fontFamily: 'Courier' })
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => buyDoubleJump())
        .on('pointerover', () => shopText.setScale(1.1))
        .on('pointerout', () => shopText.setScale(1.0));

    scene.input.keyboard.on('keydown-B', () => buyDoubleJump());

    // Story Text
    let storyMsg = "System Online. Objective: Collect Coins.";
    if (robotVersion > 1) {
        storyMsg = "Signal Lost. Consciousness uploaded to MK-" + robotVersion + ".";
    }

    storyText = scene.add.text(gameWidth / 2, gameHeight - 100, storyMsg, {
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
    if (player.y > gameHeight + 200) {
        respawn(this);
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

    // Update state
    nextPlatformX += gap + width;
    lastPlatformY = y;
}

function collectStar(player, star) {
    star.disableBody(true, true);
    coins += 10;
    scoreText.setText('Coins: ' + coins);
    updateShopUI();
}

function buyDoubleJump() {
    if (coins >= 50 && !hasDoubleJump) {
        coins -= 50;
        hasDoubleJump = true;
        scoreText.setText('Coins: ' + coins);
        shopText.setText('Double Jump\nACQUIRED');
        shopText.setColor('#0f0');
    }
}

function updateShopUI() {
    if (!hasDoubleJump) {
        if (coins >= 50) {
            shopText.setColor('#ff0');
        } else {
            shopText.setColor('#aaa');
        }
    }
}
