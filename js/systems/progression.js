/* The scaling rule: demons grow with the player, but 30% shallower.

   P(d) = 1 + 0.10*d + 0.5*equipIndex      (player power index at depth d)
   E(d) = 1 + 0.70*(P(d) - 1)             (demon stat multiplier)

   equipIndex is the player's loot advantage measured against what a normal run
   is expected to have picked up by that depth, so a greedy run scales the
   demons up and a cautious run leaves them behind.
*/
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const SLOPE = 0.7;          // 30% shallower than the player
  const DEPTH_SLOPE = 0.10;   // nominal player growth per level

  DC.Progression = {
    SLOPE, DEPTH_SLOPE,

    expected: function (d) {
      return {
        atk: 10 + 1.9 * d,
        def: 3 + 1.2 * d,
        hp: 60 + 12 * d,
        mp: 45 + 10 * d,
      };
    },

    equipIndex: function (p, depth) {
      const e = DC.Progression.expected(Math.max(1, depth || 1));
      const parts = [
        (p.bonusAtk || 0) / e.atk,
        (p.bonusDef || 0) / e.def,
        (p.bonusHp || 0) / e.hp,
        (p.bonusMp || 0) / e.mp,
      ];
      return M.clamp((parts[0] + parts[1] + parts[2] + parts[3]) / 4, 0, 2);
    },

    playerIndex: function (p, depth) {
      return 1 + DEPTH_SLOPE * depth + 0.5 * DC.Progression.equipIndex(p, depth);
    },

    enemyMult: function (p, depth) {
      return 1 + SLOPE * (DC.Progression.playerIndex(p, depth) - 1);
    },

    // Exposed for the test harness: the pure depth-only form of both curves.
    playerIndexAtDepth: function (d) { return 1 + DEPTH_SLOPE * d; },
    enemyMultAtDepth: function (d) { return 1 + SLOPE * DEPTH_SLOPE * d; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
