/* The Hollow Deep — namespace + global tuning constants. */
(function (global) {
  'use strict';
  const DC = global.DC || {};
  global.DC = DC;

  DC.VERSION = '1.0.0';

  DC.C = {
    // World geometry. 30 tiles * 5 m = a 150 m x 150 m level. The tile stays
    // 5 m, so every metre figure below -- torch, reach, dodge, sight --
    // carries over unchanged; only the square got smaller. It used to be
    // 200 m, and 200 m was not a floor, it was an errand: the interesting part
    // of a roguelike level is the part you can hold in your head.
    TILE: 5,
    GRID: 30,
    WORLD_M: 150,

    // Information fog.
    REVEAL: 15,          // metres of torchlight
    REVEAL_NEAR: 5.5,    // fully lit out to here
    MEMORY_LIGHT: 0.13,  // how much of already-seen terrain survives
    LIGHT_STEP: 0.7,     // metres between light-map samples

    // Minimap: a 50 m square centred on the player, upper right. A third of
    // the floor across, which is about how much of a 150 m floor you are ever
    // making a decision about at once.
    MINIMAP_M: 50,
    MINIMAP_PX: 300,

    // The throne chamber: a 50 m square of open floor hewn out of the middle
    // of the level, walls of solid rock on every side. It used to be the whole
    // floor, which turned a boss fight into a lap of an empty stadium.
    ARENA_TILES: 10,

    // Camera.
    PX_PER_M: 20,
    ZOOM_LEVELS: [14, 20, 26],

    // Simulation.
    DT: 1 / 60,
    MAX_STEPS: 5,

    // Flow field recompute cadence (seconds).
    FLOW_INTERVAL: 0.3,

    // Level population. A floor is meant to feel inhabited: you meet the
    // whole ecosystem of the deep, not three demons and a chest. These are
    // density figures, not raw counts -- the walkable floor went from ~1000 to
    // ~450 tiles when the level shrank, so the counts came down with it and a
    // corridor still holds the same number of demons per torch.
    //
    // A tenth again the crowd on top of that. A 150 m floor is about 450 walkable
    // tiles, so 75 demons is still one per six tiles, and the spawner's 2 tile
    // spacing is what decides whether a floor can hold them all -- see the
    // crowded-floor section of the smoke test.
    ENEMY_BASE: 23,
    ENEMY_PER_DEPTH: 2.42,
    ENEMY_MAX: 75,         // what the spawner can actually place on a 150 m floor
    CHEST_BASE: 10,
    CHEST_PER_DEPTH: 0.6,
    CHEST_MAX: 18,
    URN_BASE: 14,
    URN_PER_DEPTH: 0.8,
    URN_MAX: 32,
    MIN_SPAWN_DIST: 22,   // metres from start before a demon may appear

    // Demon strength. Every shape hits a tenth as hard again, swings a tenth as
    // often again and covers ground a tenth as fast again. The windup is deliberately
    // left alone: the cooldown is how often a blow arrives, the windup is the
    // tell you dodge by, and shortening both at once takes away the only thing
    // that made a faster demon fair. The stride rule still holds -- see the
    // speedCap on the ranged shapes in data/demons.js.
    DEMON_ATK_MULT: 1.1,
    DEMON_RATE_MULT: 1.1,     // attacks per second, so cooldowns divide by it
    DEMON_SPEED_MULT: 1.1,

    // Descent cadence: every Nth floor is a boss arena with a merchant in it.
    // It used to be 10. At 200 m a floor is a short, dense sweep, and a
    // counter only every tenth floor meant nine floors of hoarding coin with
    // nothing to spend it on -- and nine floors with nothing standing between
    // you and the gate but demons that had already been thinned out.
    BOSS_EVERY: 5,

    // Dodge: a short, committed dash. SHIFT on a keyboard, the DODGE circle
    // beside ATTACK on a phone. It is deliberately modest -- about a second of a
    // mage's walking, no invulnerability anywhere in it, and it takes your
    // balance out from under you: a swing already in the air is given up and the
    // next one is late. That is what keeps it from becoming a second Blink.
    DODGE_CD: 1.9,        // seconds between dashes
    DODGE_TIME: 0.2,      // how long the dash itself lasts
    DODGE_SPEED: 21,      // m/s while dashing -> about 4.2 m of ground
    DODGE_RECOVERY: 0.18, // extra seconds before the next swing can start

    // Portal gate: a reachable tile this deep into the maze's walking
    // distance, not the absolute farthest one.
    PORTAL_MIN_TILES: 14,
    PORTAL_FRACTION: 0.5,
    // The portal is a thing you walk *up to and decide about*, so it needs
    // room around it: this many tiles of open floor in every direction.
    PORTAL_CLEAR_TILES: 2,

    // Dungeon plan: rooms joined by corridors, not a lattice maze.
    ROOM_COUNT_MIN: 6,
    ROOM_COUNT_MAX: 10,
    ROOM_MIN: 4,          // tiles
    ROOM_MAX: 7,          // a 9-tile room in a 30-tile grid is a district
    CORRIDOR_WIDE_CHANCE: 0.30,
    ROOM_LOOP_CHANCE: 0.4,      // extra links as a fraction of the room count
    ROOM_LOOP_MAX_DIST: 16,     // Manhattan between room centres
    ALCOVE_MIN: 7,
    ALCOVE_MAX: 12,

    // Aggro budget: how many demons may hunt at once. Levels are dense but
    // the whole floor never comes with you, so a pack can always be pulled.
    // The waking budget follows the crowd. More demons on a floor without this
    // would only mean more demons asleep in the dark.
    AGGRO_BASE: 3.3,
    AGGRO_PER_DEPTH: 0.88,
    AGGRO_MAX: 12,
    LEASH_DIST: 26,      // metres -- beyond this a lost hunter gives up
    SIGHT_CULL: 38,      // metres -- no line-of-sight test is paid for beyond this

    // Out-of-combat recovery. A crowded floor is only survivable if losing
    // a pack is worth something: once nothing can see you and you have not
    // been hit for a few seconds, the wound starts to close.
    REGEN_DELAY: 5,      // seconds calm before it starts
    REGEN_FRAC: 0.014,   // fraction of max HP per second, once calm
    LEASH_TIME: 3.5,     // seconds out of sight before it gives up

    // The pack. Loot lands in a bag instead of silently re-dressing you, and
    // the finite number of rows is what turns every find into a decision:
    // wear it, carry it, or sell it.
    INV_SIZE: 10,
    /* A find goes on by itself only when it is a clear gain, measured in stats
       *and* stride. Below this it waits in the pack for a decision. */
    AUTO_EQUIP_MARGIN: 1,
    /* Casting on an empty wick: how long the flame takes to stop guttering
       after the last bolt, and how little it recovers while it is still hot. */
    MP_CALM: 1.6,
    MP_HEAT_FLOOR: 0.12,
  };
})(typeof window !== 'undefined' ? window : globalThis);
