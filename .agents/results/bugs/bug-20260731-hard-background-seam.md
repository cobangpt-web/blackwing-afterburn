# Bug: Hard horizontal seam across stage backgrounds

**Date Reported**: 2026-07-31
**Date Fixed**: 2026-07-31
**Reporter**: User
**Assignee**: Codex
**Severity**: 🔵 LOW
**Status**: ✅ FIXED

## Problem

Every stage showed sudden tone shifts across fixed rows of the playfield, making the background look like separate image sections.

## Reproduction

1. Start any campaign stage.
2. Look at 42% and 72% of the world height.
3. Observe horizontal edges where the stage tint ends and the lower shade begins.

The issue occurred on every stage and viewport because it was drawn in world coordinates.

## Root Cause

`drawBackground()` painted two constant-opacity rectangles: an accent tint ending at `WORLD_H * 0.42` and a navy shade beginning at `WORLD_H * 0.72`. Their abrupt edges created visible horizontal seams, and the blends differed with each stage image.

## Fix

Replaced both hard rectangles with full-height transparent gradients. The stage tint now fades out through the upper field, while the lower shade gradually darkens toward the bottom. Player contrast and stage color remain without visible boundaries.

## Files Modified

- `public/game.js`
- `public/rendering.js`
- `tests/rendering.test.mjs`

## Verification

- Added regression tests that verify the upper tint fades to transparent and the lower shade starts transparent, uses ordered gradient stops, and covers the full playfield.
- Searched for other fixed-row background overlays; none remain.
- Verified stages 1, 4, and 5 at a 664×1080 viewport with no horizontal tone seam or browser console errors.
- All six automated tests and the production build pass.

## Prevention

Use gradients with a transparent starting stop for large tonal overlays. Avoid constant-opacity rectangles that begin inside continuous artwork unless a visible section boundary is intentional.
