# Mobile App Development (iOS)

This project uses [Capacitor](https://capacitorjs.com/) to run the game as a native iOS app.

## Prerequisites

- **Node.js** and **npm** installed.
- **Xcode** installed (Mac only).
- **CocoaPods** installed (optional, if using plugins that require it, but this project uses Swift Package Manager where possible).

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

## Building the App

The game is a web application that needs to be bundled before syncing with the native project.

1.  **Build the web assets**:
    This copies the game files (`index.html`, JS files, CSS) into the `www/` directory.
    ```bash
    npm run build
    ```

2.  **Sync with iOS**:
    This copies the `www/` assets to the iOS project.
    ```bash
    npx cap sync ios
    ```

## Running on iOS

1.  **Open in Xcode**:
    ```bash
    npx cap open ios
    ```
    This command opens the `ios` folder in Xcode.

2.  **Run the App**:
    - Select a simulator or a connected device in Xcode.
    - Click the "Play" button (Run) to build and launch the app.

## Workflow for Changes

If you modify the game code (`game.js`, `index.html`, etc.):

1.  Run `npm run build` to update `www/`.
2.  Run `npx cap sync` to update the native project with the new web assets.
3.  Re-run the app in Xcode.

## Notes

- The project uses a local copy of `phaser.js` to ensure the game works offline.
- `index.html` references `phaser.js` locally.
