## 2026-01-24 - Infinite Object Accumulation in Phaser StaticGroups
**Learning:** Phaser 3 Arcade StaticGroups do not automatically cull or destroy off-screen entities. In infinite runner mechanics, this leads to linear memory growth and increasing collision check costs as the world expands.
**Action:** Always implement a manual cleanup routine for procedurally generated content in infinite runners, verifying destruction with `group.countActive()` or `group.getLength()`.

## 2026-01-31 - Invisible UI Updates
**Learning:** The Minimap update logic ran every frame regardless of visibility, consuming CPU for math and transform updates.
**Action:** Always wrap UI update logic (especially those involving math/transform) in visibility checks (e.g. `if (container.visible)`).
