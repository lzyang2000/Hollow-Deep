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
| `Esc` | Pause (or leave the shop) |
| `V` | Toggle zoom |
| `M` | Mute audio |

In the merchant: click a row or press `1`–`7` to buy, `E`/`Esc` to leave.

## Careers

- **Mage** — ranged bolts that pierce and splash. More MP than HP, fastest
  movement, `Space` blinks 9 m along your aim.
- **Swordsman** — a 135° arc at sword reach, balanced HP and MP, `Space`
  whirlwinds everything around you.
- **Knight** — slow, heavy, highest HP and free defence, longest reach and
  knockback, `Space` raises a shield wall.

## The rules that matter

- Every level is a **300 m x 300 m** procedurally generated maze; every open
  tile is reachable, and the maze is braided so it reads as rooms and
  corridors rather than a hedge puzzle.
- The portal sits about **half the maze's own walking span** from the stair —
  a real journey each level, never a 700 m slog.
- Torchlight reveals **15 m** of the dungeon. Everything else is fogged, and
  what you have already seen stays dimly remembered.
- The **minimap** (upper right) is a 45 m square centred on you and shows the
  ground you have already revealed. Once you find the portal it is marked, and
  an arrow points at it when it is off the minimap.
- Demons **do not attack until they have seen you**. They mirror your three
  careers, one notch weaker.
- Kills and chests drop equipment (attack / defence), upgrades (movement
  speed, attack speed, max HP / MP) or coin.
- Every **10th level** is a boss arena (no maze) with a merchant. The boss
  sleeps until you strike it; the portal opens when it dies.
- Enemy stats grow with your power, but on a **30 % shallower slope**, so a
  well-played run outpaces the dungeon.
- Music and every sound effect are synthesised at runtime — no audio files.

## Development

    node tmp/test_maze.js    # maze invariants: reachability, borders, arenas
    node tmp/smoke.js        # loads the real files, 9000 frames of headless play
    node tmp/balance.js      # no-cheat difficulty bot across the three careers

`tmp/` is scratch and is git-ignored. `docs/SPEC.md` holds the full
specification and acceptance criteria; `docs/ARCHITECTURE.md` explains the
file layout and the load order.

To jump straight into a level while developing, use the dev flags:

    index.html?auto=mage&depth=21     # start that career at that depth
    index.html?select=1               # stop at the career select screen
