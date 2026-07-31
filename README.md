# BLACKWING // AFTERBURN

Five-stage top-down jet shooter built for desktop and mobile browsers.

Live: https://blackwing-afterburn.vercel.app/

## Play

- Move, dodge, and build overdrive from close calls.
- Auto-fire cannons during combat.
- Launch multi-lock missile volleys against priority targets.
- Break through five distinct environments and bosses.
- Choose one of three combat cores after every cleared stage.
- Stack weapon, missile, drone, armor, shield, EMP, and afterburner upgrades to level 3.

## Campaign

1. Tempest Sea — Varka Sky Carrier
2. Red Canyon — Moloch Siege Dreadnought
3. Neon Blockade — Phantom Stealth Bomber
4. Frozen Stratosphere — Boreas Weather Engine
5. Black Sky — Erebus Black Crown

## Test mode

Open https://blackwing-afterburn.vercel.app/?test=1 to use the private campaign test panel.

- Jump directly to any of the five stages with a recommended stage build.
- Reveal or instantly defeat the current boss.
- Toggle invincibility and max every combat core.
- Open a specific boss directly with `?test=1&stage=5&boss=1`.
- Test scores never replace the normal high score.

## Develop

```sh
npm install
npm run build
```

The playable source lives in `public/`. The build step copies it into `dist/` for Vercel.
