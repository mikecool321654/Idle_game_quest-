from playwright.sync_api import sync_playwright
import time

def verify_idle():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        page.goto('http://localhost:8000')

        # Wait for StartScene
        page.wait_for_timeout(2000)

        # Inject state BEFORE starting GameScene
        page.evaluate("""
            window.gameState.coins = 0;
            window.gameState.hasCoinMaker = true;
            window.gameState.coinMakerLevel = 1;
            window.gameState.maxDistance = 2000; // x2 multiplier
            window.gameState.hasAutoAttack = true;
            window.gameState.spawnRateLevel = 9; // 1 kill/sec simulation
            window.gameState.scavengerEndTime = Date.now() + 10000; // Scavenger active
        """)

        # Start Game
        page.keyboard.press("Space")
        page.wait_for_timeout(3000) # Wait for GameScene create and some ticks

        # 1. Verify Coin Maker (Active)
        final_coins = page.evaluate("window.gameState.coins")
        print(f"Final Coins (Active): {final_coins}")

        if final_coins > 0:
            print("Active Coin Maker Verification SUCCESS")
        else:
            print("Active Coin Maker Verification FAILED")

        page.screenshot(path="verification_active.png")

        # 2. Verify Offline Earnings
        # Save current state
        page.evaluate("window.saveGame()")

        # Tamper save to simulate 100 seconds passed
        page.evaluate("""
            const data = JSON.parse(localStorage.getItem('idlegame_save'));
            data.timestamp = Date.now() - 100000; // 100 seconds ago
            localStorage.setItem('idlegame_save', JSON.stringify(data));
        """)

        # Reload
        page.reload()
        page.wait_for_timeout(2000)

        offline = page.evaluate("window.offlineDetails")
        print(f"Offline Details: {offline}")

        if offline and offline['earned'] == 1200:
            print("Offline Verification SUCCESS")
        else:
            print(f"Offline Verification FAILED (Expected 1200, got {offline.get('earned') if offline else 'None'})")

        page.screenshot(path="verification_offline.png")

        browser.close()

if __name__ == "__main__":
    verify_idle()
