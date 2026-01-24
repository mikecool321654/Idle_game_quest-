from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)

    # Test 1: Landscape
    print("Testing Landscape...")
    page = browser.new_page(viewport={'width': 800, 'height': 600})
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000) # Wait for game load
    page.screenshot(path="verification_landscape.png")

    # Open Shop
    print("Opening Shop...")
    page.keyboard.press("B")
    page.wait_for_timeout(1000)
    page.screenshot(path="verification_shop.png")

    # Test 2: Portrait
    print("Testing Portrait...")
    page_portrait = browser.new_page(viewport={'width': 375, 'height': 667})
    page_portrait.goto("http://localhost:3000")
    page_portrait.wait_for_timeout(2000)
    page_portrait.screenshot(path="verification_portrait.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
