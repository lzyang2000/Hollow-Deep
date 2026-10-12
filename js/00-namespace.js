/* The Hollow Deep — namespace + global tuning constants. */
(function (global) {
  'use strict';
  const DC = global.DC || {};
  global.DC = DC;

  DC.VERSION = '1.0.0';

  DC.C = {
    // World geometry. 60 tiles * 5 m = a 300 m x 300 m level.
    TILE: 5,
    GRID: 60,
    WORLD_M: 300,

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
    // whole ecosystem of the deep, not three demons and a chest. The caps
    // exist because the open floor of a level is only ~1000 tiles and the
    // spawner needs room to keep things apart.
    ENEMY_BASE: 42,
    ENEMY_PER_DEPTH: 4.5,
    ENEMY_MAX: 180,
    CHEST_BASE: 18,
    CHEST_PER_DEPTH: 1.5,
    CHEST_MAX: 48,
    URN_BASE: 27,
    URN_PER_DEPTH: 2.1,
    URN_MAX: 66,
    MIN_SPAWN_DIST: 40,   // metres from start before a demon may appear

    // Portal gate: a reachable tile this deep into the maze's walking
    // distance, not the absolute farthest one.
    PORTAL_MIN_TILES: 30,
    PORTAL_FRACTION: 0.5,

    // Dungeon plan: rooms joined by corridors, not a lattice maze.
    ROOM_COUNT_MIN: 12,
    ROOM_COUNT_MAX: 18,
    ROOM_MIN: 4,          // tiles
    ROOM_MAX: 11,
    CORRIDOR_WIDE_CHANCE: 0.28,
    ROOM_LOOP_CHANCE: 0.4,      // extra links as a fraction of the room count
    ROOM_LOOP_MAX_DIST: 24,     // Manhattan between room centres
    ALCOVE_MIN: 10,
    ALCOVE_MAX: 18,

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
  };
})(typeof window !== 'undefined' ? window : globalThis);
