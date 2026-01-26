from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 800, "height": 600})
        page.goto("http://localhost:3000")
        page.wait_for_timeout(2000) # Wait for load
        page.screenshot(path="verification.png")
        browser.close()

if __name__ == "__main__":
    run()
