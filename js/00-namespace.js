/* The Hollow Deep — namespace + global tuning constants. */
(function (global) {
  'use strict';
  const DC = global.DC || {};
  global.DC = DC;

  DC.VERSION = '1.0.0';

  DC.C = {
    // World geometry. 40 tiles * 5 m = a 200 m x 200 m level. The tile stays
    // 5 m, so every metre figure below -- torch, minimap, sight, reach --
    // carries over unchanged; only the square got smaller.
    TILE: 5,
    GRID: 40,
    WORLD_M: 200,

    // Information fog.
    REVEAL: 15,          // metres of torchlight
    REVEAL_NEAR: 5.5,    // fully lit out to here
    MEMORY_LIGHT: 0.13,  // how much of already-seen terrain survives
    LIGHT_STEP: 0.7,     // metres between light-map samples

    // Minimap: a 45 m square centred on the player, upper right.
    MINIMAP_M: 45,
    MINIMAP_PX: 300,

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
    ENEMY_BASE: 30,
    ENEMY_PER_DEPTH: 3.2,
    ENEMY_MAX: 120,
    CHEST_BASE: 11,
    CHEST_PER_DEPTH: 0.9,
    CHEST_MAX: 26,
    URN_BASE: 16,
    URN_PER_DEPTH: 1.2,
    URN_MAX: 39,
    MIN_SPAWN_DIST: 26,   // metres from start before a demon may appear

    // Descent cadence: every Nth floor is a boss arena with a merchant in it.
    // It used to be 10. At 200 m a floor is a short, dense sweep, and a
    // counter only every tenth floor meant nine floors of hoarding coin with
    // nothing to spend it on -- and nine floors with nothing standing between
    // you and the gate but demons that had already been thinned out.
    BOSS_EVERY: 5,

    // Portal gate: a reachable tile this deep into the maze's walking
    // distance, not the absolute farthest one.
    PORTAL_MIN_TILES: 20,
    PORTAL_FRACTION: 0.5,
    // The portal is a thing you walk *up to and decide about*, so it needs
    // room around it: this many tiles of open floor in every direction.
    PORTAL_CLEAR_TILES: 2,

    // Dungeon plan: rooms joined by corridors, not a lattice maze.
    ROOM_COUNT_MIN: 9,
    ROOM_COUNT_MAX: 13,
    ROOM_MIN: 4,          // tiles
    ROOM_MAX: 9,
    CORRIDOR_WIDE_CHANCE: 0.30,
    ROOM_LOOP_CHANCE: 0.4,      // extra links as a fraction of the room count
    ROOM_LOOP_MAX_DIST: 16,     // Manhattan between room centres
    ALCOVE_MIN: 7,
    ALCOVE_MAX: 12,

    // Aggro budget: how many demons may hunt at once. Levels are dense but
    // the whole floor never comes with you, so a pack can always be pulled.
    AGGRO_BASE: 3,
    AGGRO_PER_DEPTH: 0.8,
    AGGRO_MAX: 14,
    LEASH_DIST: 30,      // metres -- beyond this a lost hunter gives up
    SIGHT_CULL: 44,      // metres -- no line-of-sight test is paid for beyond this

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
