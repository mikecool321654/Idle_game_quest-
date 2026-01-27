class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });
    }

    preload() {
        this.load.image('player_raw', 'player_spritesheet.png');
        this.load.image('bg_layer', 'background.png');
    }

    create() {
        // Expose for testing
        window.forceStartGame = () => this.startGame();

        const width = this.scale.width;
        const height = this.scale.height;

        // Background
        const bgScale = height / 1536;
        this.background = this.add.tileSprite(0, 0, width / bgScale, 1536, 'bg_layer');
        this.background.setOrigin(0, 0);
        this.background.setScale(bgScale);

        // --- Generate Player Texture ---
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

        // Animation
        if (!this.anims.exists('run')) {
            this.anims.create({
                key: 'run',
                frames: this.anims.generateFrameNumbers('dude_run', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Player Sprite (Running)
        const player = this.add.sprite(width / 2, height / 2, 'dude_run');
        player.setScale(0.8);
        player.play('run');

        // Title
        const title = this.add.text(width / 2, height * 0.3, 'CYBERPUNK\nROBOT RUNNER', {
            fontSize: '64px',
            fontFamily: 'Courier',
            fontStyle: 'bold',
            fill: '#00ffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            scale: { from: 1, to: 1.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Start Button
        const startBtn = this.add.text(width / 2, height * 0.7, 'START GAME', {
            fontSize: '48px',
            fontFamily: 'Courier',
            fill: '#0f0',
            backgroundColor: '#00000088',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => startBtn.setScale(1.2))
        .on('pointerout', () => startBtn.setScale(1.0))
        .on('pointerdown', () => this.startGame());

        // Keyboard Support & Hint
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());

        const pressSpaceText = this.add.text(width / 2, height * 0.82, 'PRESS [SPACE]', {
            fontSize: '24px',
            fontFamily: 'Courier',
            fill: '#0f0',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: pressSpaceText,
            alpha: { from: 1, to: 0.2 },
            duration: 800,
            yoyo: true,
            repeat: -1
        });

    }

    update() {
        if (this.background) {
            this.background.tilePositionX += 2;
        }
    }

    startGame() {
        this.scene.start('GameScene');
    }
}
