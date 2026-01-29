
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Start game
        page.wait_for_function("() => window.forceStartGame")
        page.evaluate("window.forceStartGame()")
        time.sleep(2)

        # 1. Trigger Scavenger Synergy manually to verify Drone Tint
        page.evaluate("window.gameState.hasCoinMaker = true")
        page.evaluate("window.gameState.lastCollectionTime = Date.now()")
        time.sleep(1) # Wait for Coin Maker loop to hit

        page.screenshot(path="verification/drone_tint.png")
        print("Captured drone_tint.png")

        # 2. Open Upgrade Menu to verify descriptions
        page.keyboard.press("B")
        time.sleep(1)

        # Hover over Auto-Attack (Node position calculation needed)
        # Auto-Attack id='autoattack', x=450, y=0 relative to center.
        # Center is likely 1280/2, 720/2 if default.
        # But scale resize...
        # We can find the node via JS.

        aa_pos = page.evaluate("""() => {
            const scene = window.game.scene.getScene('UpgradeScene');
            const node = scene.nodes.find(n => n.id === 'autoattack');
            return { x: scene.centerX + node.x, y: scene.centerY + node.y };
        }""")

        page.mouse.move(aa_pos['x'], aa_pos['y'])
        time.sleep(0.5)
        page.screenshot(path="verification/upgrade_desc_autoattack.png")
        print("Captured upgrade_desc_autoattack.png")

        # Hover over Magnet
        # Magnet id='magnet', x=0, y=350
        mag_pos = page.evaluate("""() => {
            const scene = window.game.scene.getScene('UpgradeScene');
            const node = scene.nodes.find(n => n.id === 'magnet');
            return { x: scene.centerX + node.x, y: scene.centerY + node.y };
        }""")

        page.mouse.move(mag_pos['x'], mag_pos['y'])
        time.sleep(0.5)
        page.screenshot(path="verification/upgrade_desc_magnet.png")
        print("Captured upgrade_desc_magnet.png")

        browser.close()

if __name__ == "__main__":
    run()
