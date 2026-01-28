## 2026-01-25 - Keyboard Shortcuts Race Condition
**Learning:** When adding global keyboard shortcuts (like ESC) to multiple overlapping scenes in Phaser, stopping a scene does not immediately prevent the underlying scene from processing the same key press in the same frame/update loop.
**Action:** Use a timestamp or flag (e.g., `lastCloseTime`) to debounce or lock interactions in the underlying scene when a top-level scene is closed.

## 2024-05-21 - Phaser Tooltip Pattern
**Learning:** Simple tooltips for UI elements can be implemented by pairing a hidden `Phaser.GameObjects.Text` object with a target sprite, toggling visibility and scale on `pointerover`/`pointerout`.
**Action:** Use this lightweight pattern for all icon-only buttons instead of importing a heavy UI plugin.
