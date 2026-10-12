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

## 3. Classes (career choices)
| Class | Style | HP | MP | Move | Attack | Ability |
| --- | --- | --- | --- | --- | --- | --- |
| Mage | Ranged | 60 | 130 | 4.6 m/s | Magic bolt, costs MP | Blink |
| Swordsman | Melee, balanced | 95 | 95 | 5.0 m/s | Wide arc slash | Whirlwind |
| Knight | Melee, slow tank | 145 | 70 | 3.5 m/s | Heavy arc, +3 def | Shield Wall |

## 4. Levels
- 300 m x 300 m, 60 x 60 tiles of 5 m.
- Normal level: perfect maze (recursive backtracker) that is then **braided**
  (dead ends removed) and looped so it is readable, not a hairball.
- **Every open tile must be reachable** — verified by flood fill at generation.
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
| Imp | Mage | Keeps distance, firebolts |
| Hellblade | Swordsman | Fast rusher, quick slashes |
| Gorewarden | Knight | Slow, tanky, heavy overhead slam |

- A demon **never attacks until it has seen the player** (line of sight within
  its sight radius). Once seen it hunts using a shared BFS flow field.
- Boss: large, hits far harder, dormant until the player lands the first hit.

## 7. Rewards
Every kill and chest drops exactly one of: equipment (attack or defence),
an upgrade (movement speed, attack speed, max HP, max MP), money, or (chests
only) a potion. Equipment that is worse than what you wear is melted into coin.

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

## 12. Acceptance checks
1. Level generation always yields a fully reachable maze (flood fill == open tiles).
2. Portal is reachable from the start on every normal level.
3. Enemies deal zero damage before they have line of sight on the player.
4. Boss deals zero damage before it has been struck.
5. Enemy stat multiplier slope is exactly 0.7x the player's.
6. A scripted headless run of 3000 simulated frames with combat throws no errors.
