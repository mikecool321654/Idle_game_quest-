## 2026-01-24 - Infinite Object Accumulation in Phaser StaticGroups
**Learning:** Phaser 3 Arcade StaticGroups do not automatically cull or destroy off-screen entities. In infinite runner mechanics, this leads to linear memory growth and increasing collision check costs as the world expands.
**Action:** Always implement a manual cleanup routine for procedurally generated content in infinite runners, verifying destruction with `group.countActive()` or `group.getLength()`.

## 2026-01-30 - Phaser Object Pooling Pitfalls
**Learning:** In Phaser 3, simply calling `group.get()` isn't enough for object pooling. You must manually reactivate the object (`setActive(true)`, `setVisible(true)`) and reset its physics body (`enableBody(true, x, y, true, true)`). Using `destroy()` defeats the purpose of pooling; use `disableBody(true, true)` instead.
**Action:** When optimizing group performance, audit both the spawn (use `get`) and cleanup (use `disableBody`) logic.
