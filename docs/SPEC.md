# Specification — The Hollow Deep

## 1. Premise
Single-player, 2D, top-down roguelike dungeon crawler that runs locally in a
browser with no build step. The run ends on death; the score is depth reached.

## 2. Controls
- `WASD` — movement (8-directional, diagonal normalised).
- Mouse move / drag — aim. Aim always tracks the cursor relative to the player;
  holding the button shows an aim guide.
- Left click — attack. Holding repeats at the current attack rate.
- `Space` — class ability (MP cost). `E` — interact. `Esc` — pause.
  `V` — zoom. `M` — mute.
- While paused: `Esc`/`Enter` resume, `I` pack, `S` **save to a file**,
  `L` **load a file**, `M` mute, `R` abandon the run.
- `I` / `Tab` — open or close **the pack**.
 While it is open the simulation does
  not advance: `1–9`/`0` or `W`/`S`/arrows pick a row, `E`/`Enter` wears it,
  `X`/`Backspace` sells it, `R` sorts it, `Q`/`F` drink, right-click sells the row
  under the cursor, and clicking a worn piece stows it.

### 2b. Touch (one-handed, phone)

One thumb only. The drag is the whole locomotion-and-combat gesture, mirroring
what drag already means with a mouse:

- **Drag** anywhere on the play field: walk in the direction of the finger, aim
  along it, and keep attacking. The aim stays where the finger left it
  (`Input.aimHold`) instead of snapping back to a phantom cursor.
- **Tap** (short, under 14 px of travel, under 0.4 s): interact with whatever is
  in reach; if nothing is, one swing (`Input.tapFrames` releases the attack a
  few frames later so a tap is never a permanent hold).
- A touch that never crosses the dead zone walks nobody and attacks nothing.
- Buttons are laid out by `DC.Layout.buttons()` in the bottom-right corner,
  each at least 44 px across, and hit-tested before the drag starts.
- Menus are tap-only: every screen has a real button for leaving it, and the
  career select folds to one card with prev/next arrows.

## 3. Classes (career choices)

| Class | Style | HP | MP | Move | Attack | Ability |
| --- | --- | --- | --- | --- | --- | --- |
| Mage | Ranged | 60 | 130 | 4.6 m/s | Magic bolt, costs MP | Blink |
| Swordsman | Melee, balanced | 95 | 95 | 5.0 m/s | Wide arc slash | Whirlwind |
| Knight | Melee, slow tank | 145 | 70 | 3.5 m/s | Heavy arc, +3 def | Shield Wall |

## 4. Levels
- 300 m x 300 m, 60 x 60 tiles of 5 m.
- Normal level: **rooms and corridors**. 12-18 rooms of assorted sizes
  (4-11 tiles) are placed without touching, joined by a minimum spanning tree
  of L-shaped corridors with jittered bends; 28 % of corridors are two tiles
  wide. Extra links between nearby rooms add loops, and alcoves are carved off
  the corridors. This is deliberately not a lattice maze: the level reads as
  built space, and the harness asserts it holds a lot of open 2x2 floor.
- **Every open tile must be reachable** — verified by flood fill at generation.
- Population, and it is deliberately thick from the first floor:
  `ENEMY_BASE 42` (+4.5/depth, cap 180), `CHEST_BASE 18` (+1.5, cap 48),
  `URN_BASE 27` (+2.1, cap 66). Nothing spawns closer than `MIN_SPAWN_DIST`
  (40 m of **walking** distance, measured on the flow field) off the stair, and
  nothing within 20 m in a straight line either.
- Boss level (every 10th): open arena, no maze, a handful of pillars.
- Portal: a reachable tile about **half the level's own farthest walk** from
  the stair (never closer than 30 tiles), chosen with random tie-breaking. It
  is always reachable and always worth travelling to, without the 700 m slog
  that the absolute farthest tile turns a level into. On a boss level it only
  materialises after the boss dies.

## 5. Fog of war / information fog
- Torchlight radius 15 m, line-of-sight aware, with torch flicker.
- Tiles outside the light are obscured; tiles you have already seen stay
  faintly remembered (terrain only — enemies and chests are never remembered).
- The minimap is a 45 m square centred on the player showing revealed terrain.
  The portal is marked once discovered; when it is discovered but outside the
  minimap window an arrow on the rim points at it.

## 6. Enemies
Demons mirror the three player careers, one tier weaker:
| Demon | Mirrors | Behaviour |
| --- | --- | --- |
| Imp | Mage | Keeps distance, firebolts (skittish, not a sprinter) |
| Hellblade | Swordsman | Fast rusher, quick slashes |
| Gorewarden | Knight | Slow, tanky, heavy overhead slam |

- **All three mirrors walk every floor**, whatever career you picked. The mix
  drifts with depth: imps start at the plurality (`1.05 + 0.02d` weight) and the
  heavier Hellblade (`0.70 + 0.035d`) and Gorewarden (`0.45 + 0.04d) catch up, so
  by depth 24 the three are near even. A floor is one ecosystem, not a gauntlet
  of one enemy type.
- A demon **never attacks until it has seen the player** (line of sight within
  its sight radius). Once seen it hunts using a shared BFS flow field.
- Every sight radius sits **just inside the 15 m torch** (Imp 12, Hellblade 11,
  Gorewarden 10). On a floor this crowded that gap is what makes it walkable
  rather than a minefield: you always see them first, and the harness asserts it.
- Line-of-sight tests are only paid for inside `SIGHT_CULL` (44 m).
- **Aggro budget**: only `AGGRO_BASE + AGGRO_PER_DEPTH * depth` demons (capped
  at `AGGRO_MAX`) may hunt at once, so a crowded floor never becomes a swarm.
  Being hit always wakes a demon regardless of the budget, and a kill frees
  the slot.
- **Out-of-combat recovery**: `REGEN_DELAY` (5 s) after nothing on the floor can
  see you and you have not been hit, HP starts creeping back at `REGEN_FRAC`
  (1.4 % of max per second). The calm clock is a property of the *floor*, owned
  by `Game.step`, not a timer on the player — otherwise a second pack across the
  room would let you heal in the middle of a fight.
- **Leash**: a hunter that has lost line of sight and is beyond `LEASH_DIST`
  for `LEASH_TIME` seconds gives up and drifts again, handing its slot back.
- Population scales with depth: demons, chests and urns all grow, and every
  level is dressed with rubble, bones, skulls, cobwebs, braziers and wall
  torches that light the rooms.
- Boss: large, hits far harder, dormant until the player lands the first hit.

## 7. Rewards
Every kill, chest and **smashed urn** drops exactly one of: equipment (attack
or defence), an upgrade (movement speed, attack speed, max HP, max MP), money,
or (chests and urns) a potion. Urns mostly hold coin and sometimes hold nothing
but the satisfaction.

### 7.1 The pack

Equipment does not auto-equip. It lands in a bag of `INV_SIZE` (10) rows and the
player decides what to wear.

- The one exception: the first find for an **empty** worn slot goes on without
  asking, so a run never starts unarmed by accident.
- Worn gear is the only source of equipment bonuses. Stowing a piece really does
  lower ATK or DEF, and stowing needs a free row.
- Wearing from the bag puts the displaced piece into the row the new one just
  left, so the bag never reshuffles under the cursor.
- A full bag gives up the item with the lowest **urgency**, defined as
  `power(item) - power(worn in that slot)`. Comparing raw ATK against DEF would
  let a good coat be melted by a mediocre blade, which is the whole reason this
  rule is written down. A piece worse than what you already wear therefore has
  negative urgency and is the first thing to go.
- Carried casualties pay half value; a find that never arrives pays full value.
- Selling pays full value anywhere, which is what makes the merchant's prices the
  interesting half of the economy rather than a toll.
- Potions are a separate count, not bag rows.

## 8. Scaling
Player power index: `P(d) = 1 + 0.10*d + 0.5*equipIndex`, where `equipIndex` is
the average of attack / defence / HP / MP bonus ratios against class baselines.
Enemy multiplier: `E(d) = 1 + 0.70*(P(d) - 1)` — a 30 % shallower slope.

## 9. Merchant
Sits in every boss arena. Sells potions, HP/MP elixirs, weapons, armour,
movement speed, attack speed. Prices scale with boss tier; expected income is
tuned so a careful run affords roughly two to three purchases per boss visit.

## 10. Audio
All audio is generated at runtime with WebAudio: an adaptive procedural
soundtrack (drone, pad, arpeggio, percussion; a darker variant in boss rooms)
and synthesised SFX for swings, hits, grunts, roars, deaths, magic, chests,
coins, portals, purchases and level descents.

## 11. Story
The fallen sky-city of Aetherfall and the Nine Seals; lore is delivered on the
title screen, class selection, depth milestones, boss antechambers and death.

## 12. Save and load (files)

- The pause menu offers **save** (downloads a JSON file) and **load** (a file
  picker, or drop the file onto the window). Format `hollowdeep-save` v1.
- A save stores the run (career, depth, seed, gold, gear, pack, stats, potions,
  position) plus **deltas** for the current level, which is rebuilt from its
  seed: dead demons, wounded demon positions/HP, opened chests, broken urns,
  the fog as run-length pairs. It never stores the maze itself.
- Every value read from a file is treated as hostile: numbers are clamped to
  sane ranges, indices out of range are dropped rather than wrapped, unknown
  careers and wrong versions are refused, and a boss portal cannot be marked
  open before the boss is dead.
- `localStorage` is not used: the run leaves the browser as a file and can be
  moved between machines.

## 13. Mobile / one-handed layout

- `DC.Layout` derives everything from the viewport: `touch` (coarse pointer,
  or under 640 px wide, or under 480 px tall), `narrow`, `tiny`, the minimap
  size, the thumb cluster, and the zoom levels. It is recomputed inside
  `Camera.setViewport`, so any resize re-derives the whole layout.
- A phone cannot show 64 m of floor and keep the torch legible, so the zoom
  scales with the frame: `base = clamp(min(w,h)/30, 9, 20)` px/m, giving a
  desktop 1280x720 the original 14/20/26 and an iPhone 390x844 about 9/13/17 —
  roughly a 30 m frame, i.e. the torch diameter.
- The minimap shrinks to `clamp(min(w*0.30, h*0.42), 104, 300)` px and stays
  inside the frame; the HUD, shop, pack and menus all fold to fit.
- Desktop behaviour is unchanged: a mouse-driven viewport is not `touch`, keeps
  the keyboard panels, three career cards and the original zoom levels.

## 14. Acceptance checks

1. Level generation always yields a fully reachable level (flood fill == open
   tiles) whose rooms sit inside the border, never overlap, and are open at
   their centre.
2. Portal is reachable from the start on every normal level.
3. Enemies deal zero damage before they have line of sight on the player.
4. Boss deals zero damage before it has been struck.
5. Enemy stat multiplier slope is exactly 0.7x the player's.
6. A scripted headless run of 3000 simulated frames with combat throws no errors.
7. The actor never leaves the frame: across a long scripted walk the camera
   stays within the inner 82 % of the viewport around the player.
8. The aggro budget holds — a ring of demons around the player wakes only up to
   the cap, a kill frees a slot, a wound wakes regardless, and leashing calms.
9. Urns break from a melee sweep and from an impact, and never pay out twice.
10. The pack never exceeds `INV_SIZE` rows no matter how many finds arrive, the
    two worn slots are the only equipment bonus, and equipping / stowing / selling
    each move exactly one item and recalculate the derived stats.
11. A full pack never melts a piece of one slot to make room for a piece of
    another slot when the incoming item is the worse trade against what is worn.
12. Every harness loads the same script list as `index.html`, in the same order —
    a screen that works in the browser and silently fails in the test rig (or the
    reverse) is the cheapest possible bug to prevent.
13. A save round-trips: depth, career, gold, worn gear, the pack, stat bonuses,
    potions, position, the fog, and the state of every demon / chest / urn on the
    floor come back identical from the JSON file.
14. A hand-edited or corrupt file cannot cheat: wrong version or unknown career
    is refused, absurd numbers are clamped, out-of-range indices are dropped, and
    a boss portal cannot be pre-opened.
15. On a 390x844 viewport the layout reports `touch`, the minimap fits across the
    screen, the torch diameter fits inside the frame, and every thumb button is
    on screen and at least 44 px across.
16. A drag walks, aims and attacks with no mouse involved; lifting the finger
    stops both; a touch that barely moves does neither; a tap descends a portal
    when one is in reach and swings once when nothing is.
17. The pause menu, the pack, the career card and the merchant's leave button all
    fit a portrait phone and a landscape phone.
18. A desktop viewport is not `touch`: it keeps the keyboard panels, three
    career cards, one-column pack and the original zoom levels.

