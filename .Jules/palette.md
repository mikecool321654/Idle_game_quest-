## 2026-01-25 - Keyboard Shortcuts Race Condition
**Learning:** When adding global keyboard shortcuts (like ESC) to multiple overlapping scenes in Phaser, stopping a scene does not immediately prevent the underlying scene from processing the same key press in the same frame/update loop.
**Action:** Use a timestamp or flag (e.g., `lastCloseTime`) to debounce or lock interactions in the underlying scene when a top-level scene is closed.

## 2026-02-01 - Phaser Scene Restart & Camera Persistence
**Learning:** In Phaser scenes that rely on 'restart()' to refresh state (like updating unlocked nodes), the camera position resets to default (0,0), causing a jarring loss of spatial context for the user if they were panning.
**Action:** Always pass the current camera state (scrollX, scrollY) to 'restart(data)' and restore it in the 'create(data)' method to maintain a seamless experience.
