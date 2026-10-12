# Specification — The Hollow Deep

## 1. Premise
Single-player, 2D, top-down roguelike dungeon crawler that runs locally in a
browser with no build step. The run ends on death; the score is depth reached.

## 2. Controls
- `WASD` — movement (8-directional, diagonal normalised).
- Mouse move / drag — aim. Aim always tracks the cursor relative to the player;
  holding the button shows an aim guide.
- Left click — attack. Holding repeats at the current attack rate.
- `Space` — class ability (MP cost). `Shift` — **dodge** (see 2b). `E` — interact.
  `Esc` — pause.
  `V` — zoom. `M` — mute.
- While paused: `Esc`/`Enter` resume, `I` pack, `S` **save to a file**,
  `L` **load a file**, `M` mute, `R` abandon the run.
- `I` / `Tab` — open or close **the pack**.
 While it is open the simulation does
  not advance: `1–9`/`0` or `W`/`S`/arrows pick a row, `E`/`Enter` wears it,
  `X`/`Backspace` sells it, `R` sorts it, `Q`/`F` drink, right-click sells the row
  under the cursor, and clicking a worn piece stows it.

### 2b. Dodge

A committed dash, deliberately modest, so that it stays a positioning tool and
never becomes a second Blink or a get-out-of-jail card:

- `C.DODGE_TIME` 0.2 s at `C.DODGE_SPEED` 21 m/s — about **4.2 m** of ground,
  against Blink's 9 m. `C.DODGE_CD` 1.9 s between dashes (9x the dash itself).
- **No invulnerability at any point in it.** A blow taken mid-dash lands for
  exactly what it lands for standing still (`p.invuln` is never touched).
- It costs your balance: an in-flight swing is dropped (`p.swing = null`) and
  `attackTimer` is pushed to at least `DODGE_TIME + C.DODGE_RECOVERY` (0.18 s),
  so no swing can start until the feet are planted. Spamming it trades damage for
  distance.
- Direction is the movement vector, else the current aim, so it never turns your
  back by accident. The stick cannot steer it once it has started.
- `DC.moveBody` resolves it, so rock stops it dead, leaves the body outside the
  rock, and still spends the cooldown. A fizzle inside the cooldown says so
  (floater + `empty` sfx) through the shared `noManaT` throttle.
- Drawn as a career-coloured smear behind the body while `dodgeT > 0`, and heard
  as the `dodge` sfx (bandpassed noise + a short falling triangle).

### 2c. Touch (one hand, or two)

Two thumbs, two sticks. The field finger is a joystick; the wide ATTACK pad in
the free corner is a trigger *and* an aim stick. That split is the point: one
fingertip on the glass is one point, and one point can only ever be the direction
you are walking, so a phone that aims with its walking thumb can never walk north
and hit east. Attacking stays a decision either way: nothing swings just because
a thumb is resting on the glass.

- **Drag** anywhere on the play field: walk along the drag (a joystick measured
  from where the finger landed). It does not attack. While nothing is on the pad
  that same finger **also** aims at the fingertip itself — the aim is the line
  from the player's own screen position to the finger — so one thumb still points
  where it walks and a tap still hits what it tapped.
- **Tap** (short, under 14 px of travel, under 0.4 s): interact with whatever is
  in reach; if nothing is, one swing **at the point tapped** (`Input.tapFrames`
  releases the attack a few frames later so a tap is never a permanent hold).
- **ATTACK** is the one hold-button, offered twice, and either sets
  `Input.firing` until that finger lifts. The circle in the right cluster sits
  under the thumb that is already walking, so it stays a plain trigger: it
  neither walks nor re-aims, and its swing aims itself at the nearest demon the
  torch is showing (`Game.aimAssist`).
- The wide **pad** in the bottom-left corner is also the **aim stick**
  (`DC.Touch.stick`). The thumb holding it may slide, and the aim becomes that
  travel from where the thumb landed (`atan2(dy, dx)` beyond a 12 px dead zone)
  rather than the line from the body to the thumb — so the thumb never leaves its
  corner and the aim can be east while the other thumb walks north. Parked
  without a push it lets the assist aim; pushed, it is left alone. While it is
  held the field finger is a joystick only, and the direction the stick leaves
  behind survives its release. A press that never reached a simulation step still
  gets one swing rather than being swallowed.
- Only one field finger at a time: a second finger dropped on the glass is
  ignored, and while the aim stick is held the field finger cannot move the aim
  at all, so a stray thumb cannot steal it mid-stride.
- A touch that never crosses the dead zone walks nobody and attacks nothing.
- The HUD draws every part on its own: the walk-stick from where the field
  finger landed to where it is, the aim as a ray leaving the body, a crosshair
  under the field fingertip while that finger is the one aiming, a crosshair at
  the tip of the ray while the aim stick is pushed, and the stick itself as a
  ring at its pivot with a knob at the direction it is pushing.
- A mouse event that arrives just after a touch is the same finger arriving
  twice, so `Input.mouseBlocked` swallows it. Taken for a mouse it starts a drag
  that no mouse button ever releases: the player swings forever and the reticle
  freezes at the tap point.
- Buttons are laid out by `DC.Layout.buttons()` in the bottom-right corner,
  each at least 44 px across, and hit-tested before the drag starts.
- Menus are tap-only: every screen has a real button for leaving it, and the
  career select folds to one card with prev/next arrows.

## 3. Classes (career choices)

| Class | Style | HP | MP | Move | Attack | Ability |
| --- | --- | --- | --- | --- | --- | --- |
| Mage | Ranged | 60 | 130 | 4.6 m/s | Magic bolt, costs MP | Blink |
| Knight | Melee, slow tank | 145 | 70 | 4.2 m/s | Heavy arc, +3 def | Shield Wall |

There used to be a third row — Swordsman (95 / 95, 5.5 m/s, Whirlwind). A mage
owns the reach and a knight owns the brawl and nothing was left in between, so
the career is retired: `DC.CLASS_ORDER` is `['mage','knight']` and
`DC.CLASSES` has exactly those two keys.

Retiring a career must not delete anybody's run, so `DC.CLASS_ALIAS = {
swordsman: 'knight' }` resolves the name everywhere it can arrive from — a save
file (`DC.Save.classId`), a stale bookmark, an `?auto=swordsman` link
(`DC.Player.create` walks the same table, so it can never build a body with no
stats on it). The run keeps its depth, coin, gear, pack and fog memory, its
pools are re-derived from the knight, and the log says out loud that the hands
are not the ones it saved with. An unknown name (`paladin`) is still refused.

The demons never had a career to be, and they keep his shape: the Hellblade and
the blade-shaped sovereigns are still there. The stride ladder is still a rule,
not a taste — a mage (4.6) is the quicker of the two because distance is her
whole defence, and a knight (4.2) is quick enough to close on a shooter and
disengage from a mistake — but the Hellblade (4.7) is quicker than either, so
nothing down there can simply be walked away from and being heavy still costs
something real.

## 4. Levels
- 200 m x 200 m, 40 x 40 tiles of 5 m. The tile is 5 m and every other metre
  figure (torch 15, minimap 45, reach, sight, leash) is absolute, so shrinking
  the level changes only how much dungeon there is, never what a metre means.
  Measured across 18 floors: ~553 walkable tiles (~13,800 m^2, 34.5 % of the
  square), 11.1 rooms, 0.4 % dead ends.
- Normal level: **rooms and corridors**. 9-13 rooms of assorted sizes
  (4-9 tiles) are placed without touching, joined by a minimum spanning tree
  of L-shaped corridors with jittered bends; 30 % of corridors are two tiles
  wide. Extra links between nearby rooms add loops, and alcoves are carved off
  the corridors. This is deliberately not a lattice maze: the level reads as
  built space, and the harness asserts it holds a lot of open 2x2 floor.
- **Every open tile must be reachable** — verified by flood fill at generation.
- Population, and it is deliberately thick from the first floor:
  `ENEMY_BASE 30` (+3.2/depth, cap 120), `CHEST_BASE 11` (+0.9, cap 26),
  `URN_BASE 16` (+1.2, cap 39). These are density figures: the level lost 44 %
  of its area and the population lost less, so a floor is about 25 % more
  crowded per metre of corridor than the 300 m version was (0.0585 demons per
  walkable tile against 0.0467). Nothing spawns closer than `MIN_SPAWN_DIST`
  (26 m of **walking** distance, measured on the flow field) off the stair, and
  nothing within 20 m in a straight line either.
- **Every floor is named.** `DC.floorName(depth, levelSeed)` composes one out of
  `DC.FLOOR_WORDS` and remembers it for the rest of the run. The run seed is
  recovered from the level seed (an XOR with the depth, which is invertible), so
  the same run always calls depth 7 the same thing, a different run renames the
  floor, and two floors in one run never share a name — a repeat takes a roman
  numeral. Boss floors draw from a separate register (Throne, Vessel, Marrow
  Hall, Assay Yard...) that ordinary floors never use. Longest name over 80
  floors: 37 characters, and every place that prints one shrinks to fit.
- Boss level (every **5th** — `C.BOSS_EVERY`): open arena, no maze, a handful of
  pillars. `DC.bossTier(depth) = max(1, round(depth / C.BOSS_EVERY))` drives the
  demon roster, the counter's stock and the soundtrack change. The sovereign's
  own strength stays anchored to its depth (`0.65 + 0.175 * tier`), so a boss at
  depth 20 is exactly as dangerous as a boss at depth 20 ever was — there are
  simply twice as many of them on the way down.
- Portal: a reachable tile about **half the level's own farthest walk** from
  the stair (never closer than 20 tiles), chosen with random tie-breaking. It
  measures 20-65 tiles of corridor in the harness (p10/p50/p90 = 110/145/200 m
  of corridor): always reachable and always worth travelling to, without the
  700 m slog the absolute farthest tile used to turn a level into. On a boss
  level it only materialises after the boss dies.
- The portal tile must be **inside a room** and have `PORTAL_CLEAR_TILES` (2)
  tiles of open floor in every direction, so it never lands in a corridor, a
  doorway or an alcove. Candidates are scored on distance-to-target with a
  bonus for the widest open patch; if nothing qualifies the requirement relaxes
  in order (drop the room test, then radius 1, then radius 0) rather than
  leaving a level with no gate. Measured over 1600 levels: 100% in a room,
  100% at radius >= 1, 99.7% at radius 2.
- **No auto-enter.** Standing on the ring only sets the interact prompt (4.2 m);
  descending requires `E`, the thumb `DOWN` button, or a tap. `descend()` is
  guarded by the transition, so a double-press cannot start two floors. Once per
  run the first prompt also logs the verb.

## 5. Fog of war / information fog
- Torchlight radius 15 m, line-of-sight aware, with torch flicker.
- Tiles outside the light are obscured; tiles you have already seen stay
  faintly remembered (terrain only — enemies and chests are never remembered).
- The minimap is a 45 m square centred on the player showing revealed terrain.
  The portal is marked once discovered; when it is discovered but outside the
  minimap window an arrow on the rim points at it. Everything it draws is
  clipped to the panel — a tile that starts inside the 45 m span and ends
  outside it must not bleed past the frame.
- Clicking / tapping the minimap, or pressing `N`, opens the **whole-floor map**
  (`state === 'map'`): the level at `WORLD_M` scale, discovered tiles drawn
  clear of the fog, undiscovered tiles left black, and the same marker rules as
  the minimap (demons / chests / urns only while actually visible, portal only
  once discovered). It reports the explored percentage of the floor, draws a
  50 m scale bar and a rectangle showing the minimap's current window. The run
  is paused while it is open — the loop only steps in `playing`, and the fog
  stops advancing — and any click, tap, or `N` / `ESC` / `ENTER` closes it.
- The toggle is decided on the **press** (`mousedown`, `pointerdown`), never on
  the `click` that follows it: a press is one gesture, and the compatibility
  click a browser fires a few hundred ms after a tap was closing the map the
  same tap had just opened. A drag that merely ends over the panel is not a
  request to see the floor either, so `onClick` has no say in the map at all.

## 6. Enemies
Demons echo three shapes, one tier weaker than the career each one answers to.
The shapes outlive the careers — the middle one is a Swordsman nobody can play
any more, and it is still the fastest thing in the dark:
| Demon | Echoes | Behaviour |
| --- | --- | --- |
| Imp | Mage | Keeps distance, firebolts (skittish, and deliberately slower than you) |
| Hellblade | Swordsman (retired) | Fast rusher, quick slashes |
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
- **A shooter may never outrun the slowest career.** An Imp that can back away
  at your own stride is not a fight, it is a countdown. Imp stride is **2.6 m/s**
  against a knight's 4.2, and a per-kind `speedCap` (1.18) stops depth scaling
  from buying the legs back: an Imp tops out at **3.07 m/s**, not the 5.10 the
  old blanket 1.5x cap allowed. The mage sovereign obeys the same rule (2.9 m/s,
  3.42 while enraged). Melee mirrors stay allowed to be faster — a Hellblade at
  4.7 must close to hit you, which is a different problem than never being
  catchable. The smoke test asserts all three cases.
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

Equipment auto-equips only when it is a clear gain, and the judgement calls land
in a bag of `INV_SIZE` (10) rows for the player to decide.

- The first find for an **empty** worn slot goes on without asking, so a run
  never starts unarmed by accident.
- After that a find goes on by itself only when its **fit** — the stat it buys
  minus the stride it costs, priced at the career's `moveValue` — beats what is
  worn by `AUTO_EQUIP_MARGIN`. The displaced piece goes through `Inv.add`, so a
  full bag still melts its least useful row rather than overflowing.
- Weight is a trade, not a tax: `WEIGHT_STAT` gives a heavy piece more of its
  slot's stat and `WEIGHT_PENALTY` takes stride (`penalty`, growing slightly
  with item level, weapons at 60% of armour). `Player.recalc` subtracts the worn
  penalty from speed with a floor of 1.2 m/s.
- Worn gear is the only source of equipment bonuses. Stowing a piece really does
  lower ATK or DEF, and stowing needs a free row.
- Wearing from the bag puts the displaced piece into the row the new one just
  left, so the bag never reshuffles under the cursor.
- A full bag gives up the item with the lowest **urgency**, defined as
  `fit(p, item) + value/100000`, where `fit` is the stat it buys over what is
  worn in that slot minus the stride it costs at the career's `moveValue`.
  Comparing raw ATK against DEF would let a good coat be melted by a mediocre
  blade, which is the whole reason this rule is written down. A piece worse than
  what you already wear therefore has negative urgency and is the first to go.
- Carried casualties pay half value; a find that never arrives pays full value.
- Selling pays full value anywhere, which is what makes the merchant's prices the
  interesting half of the economy rather than a toll.
- Potions are a separate count, not bag rows.

## 8. Scaling
Player power index: `P(d) = 1 + 0.10*d + 0.5*equipIndex`, where `equipIndex` is
the average of attack / defence / HP / MP bonus ratios against class baselines.
Enemy multiplier: `E(d) = 1 + 0.70*(P(d) - 1)` — a 30 % shallower slope.

## 9. Merchant
Sits in every boss arena. Sells potions, weapons, armour and repeatable stat
upgrades (`DC.shopStock`), and the shelf lengthens with depth: always weapon,
armour and two upgrades, a third upgrade from depth 20, and a finer pair of the
same kind (item level +3, priced for it) from depth 40 — ten rows at the deepest.
Those gates are written in depths, not in boss visits: the arenas came twice as
often, and the shelf was left growing with the purse rather than with the count
of counters.

Two curves have to hold. **The wares must beat the floor:** chests roll
`depth+1..3` at a random quality, so the counter rolls `depth+4+t`
(`t = DC.bossTier(depth) = round(depth/5)`) and floors the quality at Fine,
Runed from the fourth boss floor (depth 20) and Seal-forged from the eighth
(depth 40). The quality divisor doubled when the cadence halved, or every
counter would have been selling Seal-forged by depth 30. **The prices must keep
up with the purse:** income per floor grows with depth, so gear is priced off depth squared
(`13d^2 - 58d + 150`, floor 180) with potions and upgrades as fractions of it.
Measured against a careful bot's savings that lands near a tenth of the purse at
every depth, which is roughly two to three purchases per boss visit.

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
  picker, or drop the file onto the window). Format `hollowdeep-save` v4 — a v3
  file is refused rather than misread, because depth 15 is a throne room now
  where it used to be a maze.
- A save stores the run (career, depth, seed, gold, gear, pack, stats, potions,
  position) plus **deltas** for the current level, which is rebuilt from its
  seed: dead demons, wounded demon positions/HP, opened chests, broken urns,
  the fog as run-length pairs. It never stores the maze itself.
- Every value read from a file is treated as hostile: numbers are clamped to
  sane ranges, indices out of range are dropped rather than wrapped, unknown
  careers and wrong versions are refused, and a boss portal cannot be marked
  open before the boss is dead. A career that has been retired is not unknown:
  it resolves through `DC.CLASS_ALIAS` and keeps its run.
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
  the keyboard panels, a card for every career and the original zoom levels.
- The thumb cluster is eight circles — ATTACK, DODGE, ability, (TRADE / DOWN when
  something is in reach), HEAL, MANA, PACK, PAUSE — plus the ATTACK pad in the
  opposite corner and a **second DODGE circle one gap to the right of that pad**.
  DODGE is placed immediately beside ATTACK so one thumb covers a swing and a
  step, and the ability keeps the ring it always had; the left-hand twin exists
  because the thumb that owns the pad should own the step as well, and making it
  cross the glass is a reason not to dodge at all. Both circles read the same
  `p.dodgeCd`, so they cool together and ring together. The left one is a plain
  circle: `hitButton` round-tests it, `Touch.down` dashes, and it never becomes
  the aim stick and never sets `firing`. Nine controls fit a 390x844 portrait
  cluster (two columns, left DODGE centre 139,811 clear of the pad box) and an
  844x390 single row (left DODGE centre 169,357), with no pair overlapping.

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
11b. Auto-equip is career-relative: the same heavy coat is equipped on a knight
    and left in the pack for a mage, the stride cost survives a save round-trip,
    worn weight lowers `speed` down to the 1.2 m/s floor, and a hot wick
    (`mpRegenMul`) recovers to 1 only after `MP_CALM` seconds of not casting.
12. Every harness loads the same script list as `index.html`, in the same order —
    a screen that works in the browser and silently fails in the test rig (or the
    reverse) is the cheapest possible bug to prevent.
13. A save round-trips: depth, career, gold, worn gear, the pack, stat bonuses,
    potions, position, the fog, and the state of every demon / chest / urn on the
    floor come back identical from the JSON file.
14. A hand-edited or corrupt file cannot cheat: wrong version or unknown career
    is refused, absurd numbers are clamped, out-of-range indices are dropped, and
    a boss portal cannot be pre-opened. A career that has since been retired is
    the one exception: it resolves through `CLASS_ALIAS`, keeps its depth, coin
    and gear, gets the new career's pools, and the swap is announced in the log.
15. On a 390x844 viewport the layout reports `touch`, the minimap fits across the
    screen, the torch diameter fits inside the frame, and every thumb button is
    on screen and at least 44 px across.
16. A drag walks and aims at the fingertip with no mouse involved, and does not
    swing on its own; lifting the finger stops the walk; a touch that barely
    moves does neither; a tap descends a portal when one is in reach and, when
    nothing is, swings once aimed at the point that was tapped.
17. The pause menu, the pack, the career card and the merchant's leave button all
    fit a portrait phone and a landscape phone.
19. The ATTACK button attacks without walking, keeps attacking while held, stops
    on release, and is unmoved by a thumb that slides across it; with nothing
    under it, it aims at the nearest demon the torch is showing; the whole
    cluster, seven buttons deep when an interact prompt is up, plus the left
    ATTACK pad, stays inside a portrait and a landscape phone frame.
21. Two fingers work apart: a field finger walking plus the ATTACK pad held
    swings *and* walks at once, and lifting either finger stops only its own
    job. A second field finger is refused.
22. The counter's best gear improves at every boss tier, always outscores the
    best chest on the same floor (`depth+3`), never sells below Fine at depth 10,
    Runed at depth 20 or Seal-forged at depth 40, and its cheapest piece of gear costs
    more than three times as much ten depths later. A full ten-row counter fits a
    portrait phone, a landscape phone and a desktop panel, LEAVE button included.
23. With the pad held, pushing it points the weapon and a field finger pulling
    the other way cannot move the aim: the actor walks one way and blows the
    other. Lifting the walk finger stops the walk only; lifting the pad stops the
    swing and keeps the direction. With nothing on the pad, the fingertip is the
    reticle again.
26. One press on the minimap opens the whole floor and the click that follows
    that same press leaves it open; a press afield closes it and its trailing
    click reopens nothing; a drag that ends over the panel opens nothing. On a
    phone, a thumb on the panel opens it and the compatibility click does not
    close it again.
25. Over 240 generated levels the portal is always inside a room, always has
    open floor all the way round it, is always reachable, and stays a journey
    rather than a slog. Standing in the portal for 150 frames descends nothing
    and offers a prompt instead; a thumb on the ring gets a `DOWN` button;
    `tryInteract` then descends.
24. The minimap clips before it paints any terrain, on desktop and on a phone,
    even though its tile window genuinely overflows the panel. Clicking, tapping
    or pressing `N` on the minimap opens the whole-floor map, which paints only
    discovered tiles, stays inside its board and its screen, holds the floor
    still while it is up, and closes on a click, a tap, `N`, `ESC` or `ENTER`.
20. A compatibility mouse event fired within 900 ms of a touch is ignored, and a
    real mouse is not: `Input.mouseBlocked` is true right after a tap and false
    once the touch has aged out.
27. Every floor carries a name and a region band. Over 80 depths no two floors in
    one run share a name, a rebuild from the same seed names them identically, a
    different seed renames them, no boss word ever appears on an ordinary floor,
    and every name fits its banner, lore card and map title. A sovereign stands
    on every fifth depth (`depth % C.BOSS_EVERY === 0`) and is no stronger at its
    own depth than it was before.
18. A desktop viewport is not `touch`: it keeps the keyboard panels, one career
    card per career (two, wider than the three narrow ones they replaced),
    one-column pack and the original zoom levels, and the mouse still aims and
    drags-attacks exactly as before.
28. A dodge crosses about 4.2 m on open floor and stops dead against rock without
    leaving the body inside it, spending the cooldown either way. It grants no
    invulnerability — a hit taken mid-dash deals exactly what it deals standing
    still. It drops a swing already in the air, blocks any new swing until the
    feet are planted, cannot be re-triggered inside `C.DODGE_CD`, and cannot be
    steered once started. `Shift` triggers it on a keyboard; on a phone the DODGE
    circle sits beside ATTACK, is hit-testable, and shows a cooldown ring and a
    countdown while it is spent. A second DODGE circle sits beside the ATTACK pad
    for the left thumb: it is hit-testable, dashes, shares the same cooldown and
    ring, never starts the aim stick and never starts an attack, and the pad
    beside it still becomes the stick.

