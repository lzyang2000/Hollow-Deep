# Architecture

Plain `<script>` tags in numeric load order — no modules, no bundler, so the
game runs straight from `file://`. Every file attaches to one global namespace,
`window.DC`, and is written so it also loads under Node (the `tmp/` test
harnesses evaluate the same files).

```
index.html              canvas + script tags
css/style.css           page chrome, menus, HUD overlays
js/00-namespace.js      DC namespace + tuning constants
js/utils/rng.js         seeded RNG (mulberry32) + deterministic tile hash
js/utils/math.js        vector/angle helpers, DDA line-of-sight
js/core/layout.js       what the viewport implies: touch? narrow? panel sizes,
                        thumb buttons, zoom levels
js/data/lore.js         world story, fragments, boss names, epitaphs
js/data/classes.js      player careers
js/data/demons.js       demon roster mirroring the careers
js/data/items.js        equipment, upgrades, potions, shop stock
js/world/maze.js        rooms-and-corridors + arena generation, flood fill, BFS
js/world/level.js       level assembly: start, portal, chests, urns, demons,
                        merchant, decor and wall torches
js/core/input.js        keyboard + mouse (aim, drag, click; swallows the
                          compatibility mouse event iOS fires after a tap)
js/core/touch.js        one-handed pointer input: drag = walk + aim-at-fingertip
                        (never a swing), tap = interact-or-one-swing-where-tapped,
                        ATTACK hold-button, button hit tests
js/core/audio.js        procedural music engine + synthesised SFX
js/core/camera.js       follow camera (never lets the actor leave frame), shake, zoom
js/entities/player.js   careers, movement, attacks, abilities
js/entities/demon.js    demon AI (sight gate, flow-field hunt, attacks)
js/entities/boss.js     boss behaviour and attack patterns
js/entities/props.js    chests, urns, portal, merchant, projectiles, particles, floaters
js/systems/fog.js       light map, discovery memory, entity visibility
js/systems/combat.js    damage, arcs, projectiles, knockback, drops
js/systems/loot.js      drop table, equip/upgrade application, gold
js/systems/inventory.js the pack: worn slots, bag triage, equip/stow/sell/sort
js/systems/save.js      run <-> JSON file: seed + deltas, validation, download
js/systems/progression.js  the 30 %-shallower scaling curve
js/systems/flowfield.js BFS distance field for demon pathing
js/render/world.js      tiles, walls, props, light overlay
js/render/entities.js   vector art for actors, projectiles, particles
js/render/hud.js        bars, depth, gold, stats, toasts, banners
js/render/minimap.js    45 m minimap, portal marker and off-screen arrow
js/ui/screens.js        title, class select, lore, pause, death
js/ui/shop.js           merchant shop
js/ui/inventory.js      pack screen (worn rows, bag rows, potions, hover map)
js/90-game.js           state machine, fixed-step loop, level flow
```

`tmp/` holds throwaway harnesses and is git-ignored:

- `tmp/test_maze.js` — level invariants (borders, reachability, room placement,
  open 2x2 floor, arenas).
- `tmp/duel.js` — worst-case stand-and-trade fights: each career against 1, 3,
  5 and 8 of each demon at depth 1 and 10, which is how the melee numbers are
  kept honest without trusting the pathing bot.
- `tmp/smoke.js` — evaluates the real files under headless DOM/canvas/WebAudio
  stubs and drives 9000 frames of play, asserting the sight gate, the sleeping
  boss, the scaling ratio, the shop and the fog light map.
- `tmp/balance.js` — a no-cheat difficulty bot (BFS pathing, real purchases,
  real potions) across all three careers.
- `tmp/shot.html` — drives one screen per query param and screenshots it with
  headless Chrome; `&dump=1` prints game state and any `window.onerror` hits.
  `&touch=1&vw=390&vh=844` fakes an iPhone, because headless Chrome refuses to
  open a window narrower than 500 px.
- `tmp/dump.sh` + `tmp/dumpcheck.py` — run every screen through that page at
  desktop, iPhone-portrait and iPhone-landscape sizes and fail on any error or
  any panel that does not fit. `tmp/shots3.sh` writes the PNG set.
- `tmp/smoke.js` sections [16] and [17] are the save-file and one-handed suites.


Two ordering rules the harnesses exist to protect:

- Aim is computed once per step into `DC.Input.aim` and handed to the actor
  through the input frame. Anything that writes `player.aim` directly will be
  overwritten by `Player.update`.
- `Fog.discover` runs in `step()`, not `render()`. The minimap, the demon
  sight gate and the sealed boss portal all read discovery, so it is
  simulation state and must not depend on a frame being drawn.
- `Camera.follow(player, dt)` is called from `Game.step`, not from the render
  path. `Camera.snap` only runs on a level change; `Camera.update` only does
  shake. If `follow` is ever dropped from the step, the actor walks out of the
  browser frame and nothing else in the code notices — `tmp/smoke.js` section
  [8] is the guard.
- Equipment bonuses come from exactly one place: `DC.Inv.applyStats` reads the
  two worn slots into `bonusAtk` / `bonusDef` and calls `Player.recalc`. Anything
  that sets those fields directly will be silently overwritten the next time the
  player changes gear, and the pack screen's "`vs worn`" column will disagree with
  the numbers on the HUD.
- `DC.Loot.onUrn` deliberately does **not** mark the urn broken; every caller has
  to (`combat.js` smashes do, `Game.step` contact does). Forgetting it pays out
  every frame you keep standing there.
- `tmp/shot.html` carries its own script list because it is a separate page.
  `tmp/smoke.js` section [0] fails if it ever drifts from `index.html` — the HUD
  reading `DC.Inv` with the module missing is exactly that bug.
- The layout is a **property of the viewport**, not a flag set once at boot:
  `Camera.setViewport` calls `DC.Layout.recompute(w, h)`. Anything that reads
  `Layout.touch`, `minimapPx` or `Camera.levels()` therefore stays correct after
  a resize or an orientation change. `Layout.buttons()` returns fresh objects
  every call — compare `id`, never identity.
- `DC.Touch` writes into the same `DC.Input` frame the keyboard does, so the
  simulation never learns which device moved it. `Input.endFrame()` owns
  `tapFrames` and releases a tapped attack; `Touch.up()` only raises it.
- A save is **seed + deltas**. `DC.Save.restore` regenerates the level from the
  stored seed and replays only what changed, so the maze in the file can never
  disagree with the maze in the game. Every number and index that arrives from a
  file goes through `num()` / `idx()`, which clamp or reject — never wrap, never
  trust.
- `world.awakeCount` is the aggro budget
 and is owned by `DC.Demons.wake` and
  `DC.Demons.calm`. Nothing else may set `d.hasSeen` directly: the counter and
  the flag have to move together, and `tmp/smoke.js` section [10] asserts they
  agree.
