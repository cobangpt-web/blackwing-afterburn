# Runtime thresholds

- Simulation: fixed 60 Hz with a seeded random generator.
- Target rendering: 60 FPS at 390×844 CSS pixels with device-pixel ratio capped at 1.5.
- Frame budget: 16.67 ms; warning threshold 20 ms averaged over 30 frames.
- Maximum live entities: 220 total, 150 hostile projectiles, 48 enemies, 24 effects.
- Player visible sprite: approximately 72 px tall on a 720×1280 logical field.
- Player collision radius: 34% of visible half-width; enemy projectile radius remains visually honest.
- Post-hit invulnerability: 700 ms.
- Overdrive duration: 2.8 seconds; activation requires a full meter.
- Missile recharge: one charge every 7 seconds, maximum three charges.
- Missile lock: up to four targets within 420 logical pixels.
- First meaningful action: no more than two inputs from page load.
- Screen shake: maximum 10 logical pixels and disabled when reduced-shake is selected.
- Audio targets: music about −19 dBFS, effects about −11 dBFS, no output above −3 dBFS after the master gain.
