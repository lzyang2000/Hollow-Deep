# The Hollow Deep — a roguelike dungeon crawler

A 2D browser roguelike. Descend an endless procedurally generated dungeon,
fight demons that mirror your class, and see how deep you can get before you die.

## Run it

No build step, no dependencies, no server required:

    open index.html

(or double-click `index.html`). If your browser blocks anything, serve the
folder instead:

    python3 -m http.server 8080    # then visit http://localhost:8080

## Controls

| Input | Action |
| --- | --- |
| `W A S D` | Move |
| Mouse move / drag | Aim |
| Left click (hold to keep attacking) | Attack |
| `Space` | Class ability (costs MP) |
| `E` | Interact (merchant, portal) |
| `Esc` | Pause |
| `V` | Toggle zoom |
| `M` | Mute audio |

## The rules that matter

- Every level is a **300 m x 300 m** procedurally generated maze; every open
  tile is reachable.
- Torchlight reveals **15 m** of the dungeon. Everything else is fogged.
- The **minimap** (upper right) is a 45 m square centred on you and shows the
  ground you have already revealed. Once you find the portal it is marked, and
  an arrow points at it when it is off the minimap.
- Demons **do not attack until they have seen you**.
- Every **10th level** is a boss arena (no maze) with a merchant. The boss
  sleeps until you strike it; the portal opens when it dies.
- Enemy stats grow with your power, but on a **30 % shallower slope**.

See `docs/SPEC.md` for the full specification and `docs/ARCHITECTURE.md` for
the code layout.
