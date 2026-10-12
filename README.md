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

### On an iPhone (one hand, or two)

The game re-lays itself out for a phone: the frame zooms to about 30 m so the
torch still covers the screen, the minimap shrinks, and the run is driven by a
thumb cluster in the bottom-right corner plus an **ATTACK** pad in the
bottom-left. Serve the folder from your Mac and open it on the phone's browser
(same Wi-Fi):

    python3 -m http.server 8080    # then visit http://<mac-ip>:8080

Add it to the home screen for a fullscreen, no-chrome run. Two thumbs is the
comfortable way to fight, and it works like a twin-stick shooter: the right thumb
drags the field and **only walks**, while the left thumb holds the bottom-left
pad to swing and **slides it to aim** — so you can walk north and hit east. One
thumb is still enough: with nothing on the pad the fingertip goes back to being
the reticle, so drag to walk and aim, then tap **ATTACK** (or tap the glass) for
a swing.

## Hosting it on GitHub Pages

It is a plain static site — no build step, no bundler, no dependencies — so
Pages serves it as it is:

    git remote add origin git@github.com:<you>/hollow-deep.git
    git push -u origin main

Then in the repository's **Settings → Pages** pick **Deploy from a branch**,
branch `main`, folder **/ (root)**. About a minute later the game lives at
`https://<you>.github.io/hollow-deep/`. The `.nojekyll` at the root tells Pages
to serve the files verbatim instead of running them through Jekyll.

Hosting is better than `file://` or a LAN server for phone play, not just more
convenient: browsers only offer the share sheet ("Save to Files") on a secure
context, so an HTTPS URL is what makes *Carry this run out* work on an iPhone.
Open it there, use **Add to Home Screen**, and it runs fullscreen with no
browser chrome.

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
| `S` / `L` (while paused) | Save the run to a file / load one back |
| `R` (while paused) | Abandon the run |

In the merchant: click a row or press `1–9` to buy, `E`/`Esc` to leave. A deep
counter shelves ten things, so the last one is a click.

### Phone controls (one hand or two)

Two thumbs, two sticks. The right thumb drags the field and that is a joystick
and nothing else; the left thumb holds the wide **ATTACK** pad in the free
corner, and that pad is a trigger *and* an aim stick — hold it to swing, slide it
to point. Walking one way while hitting another is then one gesture per thumb,
which a single fingertip can never manage: one point on the glass is only ever
one direction. A swing is still always a decision — nothing attacks just because
a thumb is resting on the glass.

| Gesture | Action |
| --- | --- |
| Drag anywhere | Walk — the drag is a joystick measured from where the finger landed. With nothing on the pad it **also** aims at the fingertip, so one thumb still points where it walks |
| Tap | Interact — merchant, portal, urn; one swing **at the point you tapped** if there is nothing to talk to |
| **ATTACK** circle (right cluster) | Swing, aimed for you at the nearest demon the torch is showing. It sits under the thumb that is already walking, so it stays a plain trigger |
| **ATTACK pad** (bottom-left bar) | Hold to swing, **slide to aim**: the aim is the thumb's travel from where it landed, so the blow can go east while the other thumb walks north. Parked without a push, the swing aims itself |

Two-handed is the way to fight a room full of demons: the right thumb runs the
walk stick, the left thumb runs the trigger and the aim. Lifting either finger
affects only its own job. While the pad is held a finger on the field cannot
change the aim at all, and a second field finger is ignored, so a stray thumb
cannot steal it mid-stride.
| **WHIRL / BLINK / SHIELD** | Class ability |
| **HEAL / MANA** | Drink a draught or wick oil |
| **PACK** | Open the pack (bottom row: HEAL, MANA, SELL, CLOSE) |
| **PAUSE** | Pause menu — resume, pack, save, load, mute, abandon |

A touch that barely moves is a rest, not a walk, so a thumb resting on the glass
will not wander you into a demon. Buttons sit in the bottom-right corner, biggest
and nearest the thumb first: ATTACK, ability, (TRADE / DOWN when something is in
reach), HEAL, MANA, PACK, PAUSE — and the ATTACK pad sits in the opposite corner.
Sliding a thumb across the ATTACK **circle** neither walks nor re-aims; sliding
across the **pad** is how you aim. The aim ray leaves the body along the aim, and
a crosshair sits at its tip while the stick is pushed, so you can see where a
swing will land before it lands.


In the pack: `1–9`/`0` or the arrows pick a row, `E` wears it, `X` (or right
click) sells it, `R` sorts it, `Q`/`F` drink, and clicking a worn piece takes it
off. `I` or `Esc` closes it.

## Careers

- **Mage** — ranged bolts that pierce and splash. More MP than HP, fastest
  movement, `Space` blinks 9 m along your aim. A mage lives on distance, so
  heavy plate is priced accordingly: the stride a coat costs a mage is worth
  more than the defence it buys.
- **Swordsman** — a 135° arc at sword reach, balanced HP and MP, `Space`
  whirlwinds everything around you.
- **Knight** — slow, heavy, highest HP and free defence, longest reach and
  knockback, `Space` raises a shield wall.

## The rules that matter

- Every level is a **200 m x 200 m** procedurally generated dungeon: 9-13
  rooms of assorted sizes joined by corridors that bend, occasionally run two
  tiles wide, and are looped and alcoved so nothing is a dead end. Every open
  tile is reachable. It is built space, not a hedge puzzle. About a third of
  the square is walkable (~13,800 m^2), and the stair down is ~145 m of
  corridor away — a knight crosses it in about a minute of walking.
- The **camera follows you**. It eases toward the actor, snaps across big
  jumps, and gives way at the world edge so you can never walk out of frame.
- Levels are crowded: from the first floor there are **30+ demons, 11+ chests and
  16+ urns** on a level (growing to 120 / 26 / 39 deep down), plus rubble, bones,
  cobwebs, braziers and **wall torches** whose warm glow marks the rooms. Urns
  shatter when you walk into them and are the potion supply. The floor shrank
  44% and the population did not shrink with it, so a corridor holds about 25%
  more demons per metre than it used to. Nothing spawns within 26 m of the stair,
  and only a handful of demons hunt at once (the aggro budget), so you can always
  pull a pack.
- The portal sits about **half the maze's own walking span** from the stair —
  a real journey each level, never a 700 m slog.
- Torchlight reveals **15 m** of the dungeon. Everything else is fogged, and
  what you have already seen stays dimly remembered.
- The **minimap** (upper right) is a 45 m square centred on you and shows the
  ground you have already revealed. Once you find the portal it is marked, and
  an arrow points at it when it is off the minimap.
- **Click / tap the minimap** (or press **N**) for the **whole floor**: the level
  at full scale with every tile your torch has already taken back drawn clear of
  the fog, the explored percentage, a 50 m scale bar and a box showing which
  slice the little map is looking at. Anything the torch has not seen stays
  black, and demons, chests and urns still only appear while they are actually
  in the light. The floor stops while the map is up — a map read mid-fight is an
  obituary. Click, tap, or press N / ESC / ENTER to close it.
- Demons **do not attack until they have seen you**. All three mirrors walk every
  floor — imps are commonest early, the heavier Gorewarden and Hellblade get
  relatively more common as you go down — and each one sees *slightly* less far
  than your torch reaches, so on a crowded floor you always spot them first. Lose
  sight of a hunter for a few seconds and it gives up the chase and drifts home.
- Losing a pack is worth something: once nothing on the floor can see you and you
  have not been touched for five seconds, the wound starts closing on its own.
- Kills, chests and smashed urns drop equipment (attack / defence), upgrades
  (movement speed, attack speed, max HP / MP) or coin.
- **The pack.** Loot lands in a ten-row bag instead of making you dress
  yourself by hand. A find that is a **clear** gain goes on by itself — the first
  thing you ever find for an empty slot always goes on, and after that only a
  gain big enough to be worth the decision. Anything closer than that waits in
  the bag for you, and the piece a new find displaced goes through the bag's own
  door, so a full bag still melts something. Open it with `I` — the run pauses
  while you choose. Worn gear is the only source of equipment bonuses, so taking
  something off really does cost you. Everything you carry can be sold.
- **Steel has weight.** A Greataxe and an Ash Rod are not the same find at the
  same item level: the heavy piece buys about 20% more of its slot's stat and
  pays for it in stride, up to roughly half a metre per second once both slots
  are loaded with plate. Every piece shows what it costs (`-0.26 m/s`), and
  `vs worn` is scored in **stats minus stride**, at the rate your career values
  stride — a mage pays 6 ATK per m/s, a knight 2.5. That is why the same coat is
  auto-equipped on a knight and left on the floor for a mage.
- Every **10th level** is a boss arena (no maze) with a merchant. The boss
  sleeps until you strike it; the portal opens when it dies. The counter's wares
  improve as you descend — better item levels than the best chest on that floor,
  never below *Fine*, and a longer shelf the deeper you go — and its prices grow
  with the square of the depth, so a purchase stays worth saving for instead of
  turning into free money by the third boss.
- Enemy stats grow with your power, but on a **30 % shallower slope**, so a
  well-played run outpaces the dungeon.
- **A hot wick refills slowly.** Mana recovery ramps back over 1.6 s of not
  casting, so holding the trigger spends faster than you recover — a mage's
  whole pool is gone in about twenty seconds of continuous fire, and after that
  a bolt costs two seconds of waiting. A measured shot, once every two seconds,
  pays for itself outright.
- **Save files.** Pausing offers *Carry this run out*, which downloads the run
  as a small JSON file, and *Take up a saved run*, which reads one back (or you
  can drop the file onto the window). A save stores the level's seed and only
  what you changed since — dead demons, opened chests, broken urns, the fog you
  burned away — so a file is a few kilobytes and cannot hand you a floor you
  never walked. Numbers and indices from a file are clamped or dropped, and a
  boss portal cannot be skipped by editing one.
- Music and every sound effect are synthesised at runtime — no audio files.


## Development

    node tmp/test_maze.js    # maze invariants: reachability, borders, arenas
    node tmp/smoke.js        # loads the real files, 9000 frames of headless play
    node tmp/balance.js      # no-cheat difficulty bot across the three careers
    node tmp/duel.js         # worst-case stand-and-trade fights, career vs demon
    node tmp/perf.js         # cost of a full 180-demon floor, and level generation
    sh tmp/dump.sh           # every screen, desktop + iPhone portrait + landscape,
                             # through headless Chrome; reports any window.onerror hit
    sh tmp/shots3.sh         # writes the screenshot set into tmp/shots/

`tmp/` is scratch and is git-ignored. `docs/SPEC.md` holds the full
specification and acceptance criteria; `docs/ARCHITECTURE.md` explains the
file layout and the load order.

To jump straight into a level while developing, use the dev flags:

    index.html?auto=mage&depth=21     # start that career at that depth
    index.html?select=1               # stop at the career select screen
