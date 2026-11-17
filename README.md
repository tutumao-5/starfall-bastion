# starfall-bastion

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/tutumao-5/starfall-bastion/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/tutumao-5/starfall-bastion/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Starfall Bastion** is an original top-down arena shooter that runs entirely in the browser — no build step, no assets, no network. You are the last ship holding a besieged bastion: survive escalating waves of geometric hostiles, grab energy cores, pick an upgrade after every wave, and bring down the Dreadnought boss every fifth wave.

- **Move** with WASD / arrow keys, **aim** with the mouse, **fire** by holding the mouse button, **dash** (with i-frames) on Shift or Space, **pause** with P, **mute** with M
- Five enemy kinds with distinct behaviour: chasers, sine-weaving skirmishers, snipers that keep their distance, splitters that burst into minis, and a radial-burst boss
- Combo multiplier scoring, floating pickups with a tractor magnet, dash cooldown management, eight stackable upgrades, persistent best score
- Synthesised WebAudio sound effects and music — zero audio files
- Deterministic seeded runs (`?seed=N`) and staged screenshot scenes (`?shot=start|play|end`)

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve the `game/` folder with any static file server and open `game/index.html`.

## Layout

- `game/` — the game itself: plain static files (`index.html` + ES modules under `src/`), loads fully offline
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` via the vendored make.fun library
- `screenshots/` — real browser renders of the game (first by name is the cover)
- `vendor/makefun-game.ts` — the kit's dossier library, unmodified

MIT licensed (see `LICENSE`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=cgc97sya&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
