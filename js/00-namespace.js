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
    MEMORY_LIGHT: 0.085, // how much of already-seen terrain survives
    LIGHT_STEP: 1.0,     // metres between light-map samples

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

    // Level population.
    ENEMY_BASE: 9,
    ENEMY_PER_DEPTH: 1.15,
    ENEMY_MAX: 46,
    CHEST_BASE: 3,
    CHEST_PER_DEPTH: 0.34,
    CHEST_MAX: 9,
    MIN_SPAWN_DIST: 26,   // metres from start before a demon may appear
  };
})(typeof window !== 'undefined' ? window : globalThis);
