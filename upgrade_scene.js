class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    create() {
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        this.centerX = this.gameWidth / 2;
        this.centerY = this.gameHeight / 2;

        // Background (Static)
        this.add.rectangle(this.centerX, this.centerY, this.gameWidth, this.gameHeight, 0x000000, 0.9).setScrollFactor(0);
        // Grid (Large enough to pan)
        this.add.grid(this.centerX, this.centerY, 4000, 4000, 50, 50, 0x000000, 1, 0x003300, 0.5);

        // Title (Static)
        this.add.text(this.centerX, 50, 'AMELIORATION TREE', { fontSize: '32px', fill: '#fff', fontFamily: 'Courier' })
            .setOrigin(0.5).setScrollFactor(0);
        this.coinsText = this.add.text(this.centerX, 90, 'Coins: ' + window.gameState.coins, { fontSize: '24px', fill: '#ff0', fontFamily: 'Courier' })
            .setOrigin(0.5).setScrollFactor(0);

        // Close Button (Static)
        const closeBtn = this.add.text(this.gameWidth - 40, 40, 'X', { fontSize: '40px', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeScene())
            .on('pointerover', () => closeBtn.setScale(1.2))
            .on('pointerout', () => closeBtn.setScale(1.0))
            .setScrollFactor(0);

        // Escape Key to Close
        this.input.keyboard.on('keydown-ESC', () => this.closeScene());

        // Camera Pan Logic
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        // Nodes Definition
        // Core -> 4 Branches
        this.nodes = [
            // Capability (North)
            { id: 'jump', name: 'Jump', cost: 0, x: 0, y: -100, parent: null, var: null, description: 'Command Center: Basic mobility thrusters. Essential for traversal.' },
            { id: 'double', name: 'Double Jump', cost: 20, x: 0, y: -200, parent: 'jump', var: 'hasDoubleJump', description: 'Command Center: Mid-air secondary thruster. Access higher elevations.' },
            { id: 'triple', name: 'Triple Jump', cost: 50, x: 0, y: -300, parent: 'double', var: 'hasTripleJump', description: 'Command Center: Tertiary propulsion module. Maximum verticality.' },
            { id: 'jetpack', name: 'Jetpack', cost: 200, x: 0, y: -400, parent: 'triple', var: 'hasJetpack', description: 'Command Center: Sustained flight capability. Hold Jump to ascend.' },

            // Defense (West)
            { id: 'armor', name: 'Armor', cost: 30, x: -150, y: 0, parent: null, var: 'hasArmor', description: 'Command Center: Ablative plating. Absorbs one kinetic impact.' },
            { id: 'shield', name: 'Shield', cost: 100, x: -300, y: 0, parent: 'armor', var: 'hasShield', description: 'Command Center: Energy barrier. Provides additional layer of protection.' },

            // Attack (East)
            { id: 'sword', name: 'Sword', cost: 50, x: 150, y: 0, parent: null, var: 'hasSword', description: 'Command Center: Close-range plasma blade. Press Z to neutralize targets.' },
            { id: 'laser', name: 'Laser', cost: 150, x: 300, y: 0, parent: 'sword', var: 'hasLaser', description: 'Command Center: Long-range photon emitter. Press X to fire.' },

            // Coin Making (South)
            { id: 'coinmaker', name: 'Coin Maker', cost: 40, x: 0, y: 150, parent: null, var: 'hasCoinMaker', description: 'Command Center: Automated mining algorithm. Generates 1 coin/sec.' },
            { id: 'coinfactory', name: 'Coin Factory', cost: 100, x: 0, y: 250, parent: 'coinmaker', var: 'coinMakerLevel', description: 'Command Center: Optimization protocols. Increases generation to 2 coins/sec.' },

            // NEW IDLE UPGRADES
            { id: 'autojump', name: 'Auto-Pilot', cost: 500, x: 0, y: -500, parent: 'jetpack', var: 'hasAutoJump', description: 'AI Navigation. Jumps automatically to avoid falling.' },
            { id: 'magnet', name: 'Magnet', cost: 200, x: 0, y: 350, parent: 'coinfactory', var: 'hasMagnet', description: 'Gravitic Field. Attracts stars and gems automatically.' },
            { id: 'lure', name: 'Monster Lure', cost: 150, x: 0, y: 450, parent: 'magnet', var: 'spawnRateLevel', description: 'Increases enemy spawn rate. More enemies = more loot.' },
            { id: 'autoattack', name: 'Auto-Turret', cost: 300, x: 450, y: 0, parent: 'laser', var: 'hasAutoAttack', description: 'Automated defense system. Fires at enemies in range.' }
        ];

        // Description Text
        this.descriptionText = this.add.text(this.centerX, this.gameHeight - 80, '', {
            fontSize: '18px', fill: '#fff', backgroundColor: '#000000aa', padding: { x: 10, y: 5 }, align: 'center', fontFamily: 'Courier',
            wordWrap: { width: this.gameWidth * 0.8 }
        }).setOrigin(0.5).setScrollFactor(0);

        this.drawLines();
        this.drawNodes();
    }

    closeScene() {
        // Set timestamp to prevent race condition with Game scene
        window.lastUpgradeCloseTime = Date.now();

        // Try to find the default scene
        let mainScene = this.scene.get('default');
        if (!mainScene || !mainScene.sys.settings.active) {
             mainScene = this.scene.manager.getScenes(false).find(s => s.sys.settings.key !== 'UpgradeScene');
        }

        if (mainScene) {
            if (mainScene.physics) mainScene.physics.resume();
        }
        this.scene.stop();
    }

    drawLines() {
        const graphics = this.add.graphics();

        this.nodes.forEach(node => {
            if (node.parent) {
                const parent = this.nodes.find(n => n.id === node.parent);
                if (!parent) return;

                let parentOwned = !parent.var || window.gameState[parent.var];
                if (parent.var === 'coinMakerLevel' && window.gameState.coinMakerLevel < 2) parentOwned = false;

                if (parentOwned) {
                    graphics.lineStyle(4, 0x008800); // Active Line
                } else {
                    graphics.lineStyle(2, 0x333333); // Ghost Line
                }

                graphics.lineBetween(this.centerX + node.x, this.centerY + node.y, this.centerX + parent.x, this.centerY + parent.y);
            }
        });
    }

    drawNodes() {
        this.nodeContainer = this.add.container(0, 0);

        this.nodes.forEach(node => {
            const x = this.centerX + node.x;
            const y = this.centerY + node.y;

            // Determine state
            let state = 'ghost';
            let isOwned = !node.var || window.gameState[node.var];

            // Special handling for Level based var (Coin Factory)
            // If var is a number (coinMakerLevel), "owned" means it equals 2 (since factory is lvl 2).
            // Actually, let's just make coinMakerLevel = true/false? No, user requested improvement.
            // Let's assume coinMakerLevel: 2 means we have factory.
            // But window.gameState[node.var] returns a number if initialized as number.
            // So if (window.gameState['coinMakerLevel']) might be true if > 0.
            // Let's treat 'coinMakerLevel' as boolean "hasCoinFactory" for simplicity in tree logic?
            // No, plan said "coinMakerLevel".
            // If node.var === 'coinMakerLevel', check if value >= 2.

            if (node.var === 'coinMakerLevel') {
                if (window.gameState.coinMakerLevel >= 2) isOwned = true;
                else isOwned = false;
            }

            if (node.var === 'spawnRateLevel') {
                if (window.gameState.spawnRateLevel >= 1) isOwned = true;
                else isOwned = false;
            }

            if (isOwned) {
                state = 'owned';
            } else {
                let parentOwned = true;
                if (node.parent) {
                    const parent = this.nodes.find(n => n.id === node.parent);
                    parentOwned = !parent.var || window.gameState[parent.var];
                    if (parent.var === 'coinMakerLevel' && window.gameState.coinMakerLevel < 2) parentOwned = false;
                }

                if (parentOwned) {
                    if (window.gameState.coins >= node.cost) {
                        state = 'available';
                    } else {
                        state = 'poor';
                    }
                } else {
                    state = 'ghost';
                }
            }

            // Colors
            let color = 0x555555;
            let strokeColor = 0xffffff;
            let alpha = 1;

            if (state === 'owned') { color = 0x39FF14; strokeColor = 0x000000; }
            if (state === 'available') { color = 0x00FFFF; strokeColor = 0xffffff; }
            if (state === 'poor') { color = 0xFFA500; strokeColor = 0xff0000; }
            if (state === 'ghost') { color = 0x333333; strokeColor = 0x555555; alpha = 0.5; }

            // Glow
            if (state === 'owned' || state === 'available') {
                 this.add.circle(x, y, 45, color, 0.3);
            }

            // Shape
            const circle = this.add.circle(x, y, 40, color).setAlpha(alpha);
            circle.setStrokeStyle(3, strokeColor);

            // Interaction
            // Hover logic for all nodes (Tease the power!)
            circle.setInteractive({ useHandCursor: state === 'available' })
                .on('pointerover', () => {
                    let desc = node.description;
                    if (state === 'ghost') desc = "(LOCKED) " + desc;
                    this.descriptionText.setText(desc);
                    if (state === 'available' || state === 'owned') circle.setStrokeStyle(5, strokeColor);
                })
                .on('pointerout', () => {
                    this.descriptionText.setText('');
                    circle.setStrokeStyle(3, strokeColor);
                });

            if (state === 'available') {
                circle.on('pointerdown', () => this.buyUpgrade(node));
            }

            // Label
            const label = this.add.text(x, y, node.name + '\n' + (node.cost > 0 ? node.cost : ''), {
                fontSize: '14px', fill: '#000', align: 'center', fontFamily: 'Courier', fontWeight: 'bold'
            }).setOrigin(0.5);

            this.nodeContainer.add([circle, label]);
        });
    }

    buyUpgrade(node) {
        if (window.gameState.coins >= node.cost) {
            window.gameState.coins -= node.cost;

            if (node.var === 'coinMakerLevel') {
                window.gameState.coinMakerLevel = 2; // Set level 2
            } else if (node.var === 'spawnRateLevel') {
                window.gameState.spawnRateLevel = 1; // Set level 1 (Upgrade logic can be expanded later)
            } else {
                window.gameState[node.var] = true;
            }

            if (window.saveGame) window.saveGame();

            // Refresh
            this.scene.restart();
        }
    }
}
