class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    create() {
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        this.centerX = this.gameWidth / 2;
        this.centerY = this.gameHeight / 2;

        // Background
        this.add.rectangle(this.centerX, this.centerY, this.gameWidth, this.gameHeight, 0x000000, 0.9);

        // Title
        this.add.text(this.centerX, 50, 'AMELIORATION TREE', { fontSize: '32px', fill: '#fff', fontFamily: 'Courier' }).setOrigin(0.5);
        this.coinsText = this.add.text(this.centerX, 90, 'Coins: ' + window.gameState.coins, { fontSize: '24px', fill: '#ff0', fontFamily: 'Courier' }).setOrigin(0.5);

        // Close Button
        const closeBtn = this.add.text(this.gameWidth - 40, 40, 'X', { fontSize: '40px', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeScene());

        // Nodes Definition
        this.nodes = [
            { id: 'jump', name: 'Jump', cost: 0, x: 0, y: 200, parent: null, var: null },
            { id: 'double', name: 'Double Jump', cost: 20, x: 0, y: 50, parent: 'jump', var: 'hasDoubleJump' },
            { id: 'triple', name: 'Triple Jump', cost: 50, x: -150, y: -100, parent: 'double', var: 'hasTripleJump' },
            { id: 'armor', name: 'Armor', cost: 100, x: 150, y: -100, parent: 'double', var: 'hasArmor' },
            { id: 'jetpack', name: 'Jetpack', cost: 200, x: -150, y: -250, parent: 'triple', var: 'hasJetpack' }
        ];

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
        graphics.lineStyle(4, 0xffffff);

        this.nodes.forEach(node => {
            if (node.parent) {
                const parent = this.nodes.find(n => n.id === node.parent);
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

            // Determine state
            let state = 'locked';
            let isOwned = (node.id === 'jump') || (window.gameState[node.var]);

            if (isOwned) {
                state = 'owned';
            } else {
                // Check parent
                const parent = this.nodes.find(n => n.id === node.parent);
                let parentOwned = (parent.id === 'jump') || (window.gameState[parent.var]);

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
            if (state === 'owned') color = 0x00ff00;
            if (state === 'available') color = 0xffff00;
            if (state === 'poor') color = 0xcc8800; // Dark Orange

            // Shape
            const circle = this.add.circle(x, y, 40, color);
            circle.setStrokeStyle(2, 0xffffff);

            // Interaction
            if (state === 'available') {
                circle.setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this.buyUpgrade(node));
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
