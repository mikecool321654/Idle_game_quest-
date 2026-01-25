## 2026-01-25 - Keyboard Shortcuts Race Condition
**Learning:** When adding global keyboard shortcuts (like ESC) to multiple overlapping scenes in Phaser, stopping a scene does not immediately prevent the underlying scene from processing the same key press in the same frame/update loop.
**Action:** Use a timestamp or flag (e.g., `lastCloseTime`) to debounce or lock interactions in the underlying scene when a top-level scene is closed.
