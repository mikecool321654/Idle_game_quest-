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
            .setScrollFactor(0);

        // Camera Pan Logic
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
                this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
            }
        });

        // Nodes Definition
        this.nodes = [
{ id: 'jump', name: 'Jump', cost: 0, x: 0, y: 200, parent: null, var: null, description: 'Basic movement capability.' },
            { id: 'double', name: 'Double Jump', cost: 20, x: -100, y: 50, parent: 'jump', var: 'hasDoubleJump', description: 'Jump a second time in mid-air.' },
            { id: 'armor', name: 'Armor', cost: 30, x: 100, y: 50, parent: 'jump', var: 'hasArmor', description: 'Protects against one spike impact (Consumable).' },
            { id: 'triple', name: 'Triple Jump', cost: 50, x: -100, y: -100, parent: 'double', var: 'hasTripleJump', description: 'Jump a third time in mid-air.' },
            { id: 'jetpack', name: 'Jetpack', cost: 200, x: -100, y: -250, parent: 'triple', var: 'hasJetpack', description: 'Hold Jump while falling to fly.' },
            { id: 'coinmaker', name: 'Coin Maker', cost: 40, x: 100, y: -100, parent: 'armor', var: 'hasCoinMaker', description: 'Generates 1 coin every second.' }
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
        // Try to find the default scene
        let mainScene = this.scene.get('default');
        // If 'default' key isn't used (implicit), look for active non-UpgradeScene
        if (!mainScene || !mainScene.sys.settings.active) {
             mainScene = this.scene.manager.getScenes(false).find(s => s.sys.settings.key !== 'UpgradeScene');
        }

        if (mainScene) {
            if (mainScene.physics) mainScene.physics.resume();
            if (mainScene.createUI) {
                // Refresh main scene UI text
                // Since updateShopUI is a local function in create scope, we can't call it easily unless exposed.
                // But we can update the variables it uses (gameState) which we did.
                // We should update the text elements.
                // Actually, handleShopAction calls updateShopUI.
                // We can't access `updateShopUI` directly if it's not on the scene instance.
                // Let's rely on game loop to update or user action.
                // Or we can just restart the main scene? No.
                // We can set a flag on the main scene?
            }
        }
        this.scene.stop();
    }

    drawLines() {
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0x008800); // Cyberpunk Green

        this.nodes.forEach(node => {
            if (node.parent) {
                const parent = this.nodes.find(n => n.id === node.parent);

                // Visibility Check
                let parentOwned = (parent.id === 'jump') || (window.gameState[parent.var]);
                if (!parentOwned) return;

                if (parent) {
                    graphics.lineBetween(this.centerX + node.x, this.centerY + node.y, this.centerX + parent.x, this.centerY + parent.y);
                }
            }
        });
    }

    drawNodes() {
        this.nodeContainer = this.add.container(0, 0);

        this.nodes.forEach(node => {
            const x = this.centerX + node.x;
            const y = this.centerY + node.y;

            // Visibility Check
            let isVisible = false;
            if (!node.parent || node.id === 'jump') isVisible = true;
            else {
                const parent = this.nodes.find(n => n.id === node.parent);
                let parentOwned = (parent.id === 'jump') || (window.gameState[parent.var]);
                if (parentOwned) isVisible = true;
            }

            if (!isVisible) return;

            // Determine state
            let state = 'locked';
            let isOwned = (node.id === 'jump') || (window.gameState[node.var]);

            if (isOwned) {
                state = 'owned';
            } else {
                // Check parent (already checked for visibility, but double check logic)
                let parentOwned = true;
                if (node.parent) {
                    const parent = this.nodes.find(n => n.id === node.parent);
                    parentOwned = (parent.id === 'jump') || (window.gameState[parent.var]);
                }

                if (parentOwned) {
                    if (window.gameState.coins >= node.cost) {
                        state = 'available';
                    } else {
                        state = 'poor'; // Unlocked but cant afford
                    }
                }
            }

            // Colors
            let color = 0x555555;
            let strokeColor = 0xffffff;

            if (state === 'owned') { color = 0x39FF14; strokeColor = 0x000000; } // Neon Green
            if (state === 'available') { color = 0x00FFFF; strokeColor = 0xffffff; } // Cyan
            if (state === 'poor') { color = 0xFFA500; strokeColor = 0xff0000; } // Orange

            // Glow
            if (state === 'owned' || state === 'available') {
                 this.add.circle(x, y, 45, color, 0.3);
            }

            // Shape
            const circle = this.add.circle(x, y, 40, color);
            circle.setStrokeStyle(3, strokeColor);

            // Interaction
            // Hover logic for all visible nodes
            circle.setInteractive({ useHandCursor: state === 'available' })
                .on('pointerover', () => {
                    this.descriptionText.setText(node.description);
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
            window.gameState[node.var] = true;

            // Refresh
            this.scene.restart();
        }
    }
}
