## 2026-01-24 - Infinite Object Accumulation in Phaser StaticGroups
**Learning:** Phaser 3 Arcade StaticGroups do not automatically cull or destroy off-screen entities. In infinite runner mechanics, this leads to linear memory growth and increasing collision check costs as the world expands.
**Action:** Always implement a manual cleanup routine for procedurally generated content in infinite runners, verifying destruction with `group.countActive()` or `group.getLength()`.
