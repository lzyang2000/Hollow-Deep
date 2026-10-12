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
js/data/lore.js         world story, fragments, boss names, epitaphs
js/data/classes.js      player careers
js/data/demons.js       demon roster mirroring the careers
js/data/items.js        equipment, upgrades, potions, shop stock
js/world/maze.js        maze + arena generation, flood fill, BFS
js/world/level.js       level assembly: start, portal, chests, demons, merchant
js/core/input.js        keyboard + mouse (aim, drag, click)
js/core/audio.js        procedural music engine + synthesised SFX
js/core/camera.js       follow camera, shake, zoom
js/entities/player.js   careers, movement, attacks, abilities
js/entities/demon.js    demon AI (sight gate, flow-field hunt, attacks)
js/entities/boss.js     boss behaviour and attack patterns
js/entities/props.js    chests, portal, merchant, projectiles, particles, floaters
js/systems/fog.js       light map, discovery memory, entity visibility
js/systems/combat.js    damage, arcs, projectiles, knockback, drops
js/systems/loot.js      drop table, equip/upgrade application, gold
js/systems/progression.js  the 30 %-shallower scaling curve
js/systems/flowfield.js BFS distance field for demon pathing
js/render/world.js      tiles, walls, props, light overlay
js/render/entities.js   vector art for actors, projectiles, particles
js/render/hud.js        bars, depth, gold, stats, toasts, banners
js/render/minimap.js    45 m minimap, portal marker and off-screen arrow
js/ui/screens.js        title, class select, lore, pause, death
js/ui/shop.js           merchant shop
js/90-game.js           state machine, fixed-step loop, level flow
```

`tmp/` holds throwaway harnesses and is git-ignored:

- `tmp/test_maze.js` — maze invariants (borders, reachability, braiding, arenas).
- `tmp/smoke.js` — evaluates the real files under headless DOM/canvas/WebAudio
  stubs and drives 9000 frames of play, asserting the sight gate, the sleeping
  boss, the scaling ratio, the shop and the fog light map.
- `tmp/balance.js` — a no-cheat difficulty bot (BFS pathing, real purchases,
  real potions) across all three careers.
- `tmp/shot.html` — drives one screen per query param and screenshots it with
  headless Chrome; `&dump=1` prints game state and any `window.onerror` hits.

Two ordering rules the harnesses exist to protect:

- Aim is computed once per step into `DC.Input.aim` and handed to the actor
  through the input frame. Anything that writes `player.aim` directly will be
  overwritten by `Player.update`.
- `Fog.discover` runs in `step()`, not `render()`. The minimap, the demon
  sight gate and the sealed boss portal all read discovery, so it is
  simulation state and must not depend on a frame being drawn.
