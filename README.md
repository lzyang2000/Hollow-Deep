# The Hollow Deep — a roguelike dungeon crawler

A 2D browser roguelike. Descend an endless procedurally generated dungeon,
fight demons that mirror your class, and see how deep you can get before you die.

## Run it

No build step, no dependencies, no server required:

    open index.html

(or double-click `index.html`). If your browser blocks anything, serve the
folder instead:

    python3 -m http.server 8080    # then visit http://localhost:8080

Audio starts on your first click or keypress — browsers will not let a page
make noise before you touch it.

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| Mouse move / drag | Aim |
| Left click (hold to keep attacking) | Attack |
| `Space` | Class ability (costs MP) |
| `1` / `2` | Drink healing draught / wick oil |
| `E` | Interact (merchant, portal) |
| `I` or `Tab` | Open / close **the pack** (pauses the run) |
| `Esc` | Pause (or leave the shop / the pack) |
| `V` | Toggle zoom |
| `M` | Mute audio |

In the merchant: click a row or press `1–7` to buy, `E`/`Esc` to leave.

In the pack: `1–9`/`0` or the arrows pick a row, `E` wears it, `X` (or right
click) sells it, `R` sorts it, `Q`/`F` drink, and clicking a worn piece takes it
off. `I` or `Esc` closes it.

## Careers

- **Mage** — ranged bolts that pierce and splash. More MP than HP, fastest
  movement, `Space` blinks 9 m along your aim.
- **Swordsman** — a 135° arc at sword reach, balanced HP and MP, `Space`
  whirlwinds everything around you.
- **Knight** — slow, heavy, highest HP and free defence, longest reach and
  knockback, `Space` raises a shield wall.

## The rules that matter

- Every level is a **300 m x 300 m** procedurally generated dungeon: 12-18
  rooms of assorted sizes joined by corridors that bend, occasionally run two
  tiles wide, and are looped and alcoved so nothing is a dead end. Every open
  tile is reachable. It is built space, not a hedge puzzle.
- The **camera follows you**. It eases toward the actor, snaps across big
  jumps, and gives way at the world edge so you can never walk out of frame.
- Levels are crowded: from the first floor there are **42+ demons, 18+ chests and
  27+ urns** on a level (growing to 180 / 48 / 66 deep down), plus rubble, bones,
  cobwebs, braziers and **wall torches** whose warm glow marks the rooms. Urns
  shatter when you walk into them and are the potion supply. Nothing spawns within
  40 m of the stair, and only a handful of demons hunt at once (the aggro budget),
  so you can always pull a pack.
- The portal sits about **half the maze's own walking span** from the stair —
  a real journey each level, never a 700 m slog.
- Torchlight reveals **15 m** of the dungeon. Everything else is fogged, and
  what you have already seen stays dimly remembered.
- The **minimap** (upper right) is a 45 m square centred on you and shows the
  ground you have already revealed. Once you find the portal it is marked, and
  an arrow points at it when it is off the minimap.
- Demons **do not attack until they have seen you**. All three mirrors walk every
  floor — imps are commonest early, the heavier Gorewarden and Hellblade get
  relatively more common as you go down — and each one sees *slightly* less far
  than your torch reaches, so on a crowded floor you always spot them first. Lose
  sight of a hunter for a few seconds and it gives up the chase and drifts home.
- Losing a pack is worth something: once nothing on the floor can see you and you
  have not been touched for five seconds, the wound starts closing on its own.
- Kills, chests and smashed urns drop equipment (attack / defence), upgrades
  (movement speed, attack speed, max HP / MP) or coin.
- **The pack.** Loot lands in a ten-row bag instead of silently re-dressing you;
  the only exception is the first thing you find for an empty slot, which goes on
  without asking. Open it with `I` — the run pauses while you choose. Worn gear
  is the only source of equipment bonuses, so taking something off really does
  cost you. A full bag gives up whatever helps you *least*, measured against what
  you are already wearing, which is why a good coat is never traded away for a
  mediocre blade. Everything you carry can be sold for what it is worth.
- Every **10th level** is a boss arena (no maze) with a merchant. The boss
  sleeps until you strike it; the portal opens when it dies.
- Enemy stats grow with your power, but on a **30 % shallower slope**, so a
  well-played run outpaces the dungeon.
- Music and every sound effect are synthesised at runtime — no audio files.

## Development

    node tmp/test_maze.js    # maze invariants: reachability, borders, arenas
    node tmp/smoke.js        # loads the real files, 9000 frames of headless play
    node tmp/balance.js      # no-cheat difficulty bot across the three careers
    node tmp/duel.js         # worst-case stand-and-trade fights, career vs demon
    node tmp/perf.js         # cost of a full 180-demon floor, and level generation

`tmp/` is scratch and is git-ignored. `docs/SPEC.md` holds the full
specification and acceptance criteria; `docs/ARCHITECTURE.md` explains the
file layout and the load order.

To jump straight into a level while developing, use the dev flags:

    index.html?auto=mage&depth=21     # start that career at that depth
    index.html?select=1               # stop at the career select screen
