/* Demons mirror the three careers, one tier weaker. powerFactor < 1 keeps the
   run winnable: they are the same shape of enemy as you, just dimmer. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.DEMONS = {
    imp: {
      // Skittish but not a sprinter: an imp keeps its distance by backing off
      // to keepRange, not by outrunning a knight forever.
      id: 'imp', mirrors: 'mage', name: 'Imp',
      hp: 26, atk: 8, def: 0, speed: 3.4, r: 0.62,
      attackKind: 'ranged', attackCd: 1.5, sight: 12, keepRange: 9,
      projSpeed: 15, projLife: 2.0,
      powerFactor: 0.62, color: '#ff7a59', accent: '#8f2f22', xp: 1,
    },
    hellblade: {
      id: 'hellblade', mirrors: 'swordsman', name: 'Hellblade',
      hp: 34, atk: 10, def: 1, speed: 4.7, r: 0.66,
      attackKind: 'melee', attackCd: 0.95, reach: 2.2, arc: 110, sight: 11,
      powerFactor: 0.66, color: '#e0524b', accent: '#68190f', xp: 1,
    },
    gorewarden: {
      id: 'gorewarden', mirrors: 'knight', name: 'Gorewarden',
      hp: 58, atk: 16, def: 3, speed: 3.0, r: 0.82,
      attackKind: 'melee', attackCd: 1.5, reach: 2.4, arc: 95, sight: 10,
      knockback: 2.6, powerFactor: 0.7, xp: 2,
    },
  };

  DC.DEMON_ORDER = ['imp', 'hellblade', 'gorewarden'];

  /* The mix of mirrors on a floor.

     All three walk every level from the first stair -- the deep does not care
     which career you chose, and a mage has to be able to survive a Gorewarden
     standing in its doorway. Depth shifts the *proportions*, never the roster:
     imps are the common sight early, and by the middle floors the three are
     near equal with the heavier bodies edging ahead. Weights are capped so a
     very deep run never turns into nothing but warden walls. */
  DC.demonMix = function (depth) {
    const d = Math.min(depth || 1, 24);
    return [
      ['imp', 1.05 + 0.02 * d],
      ['hellblade', 0.7 + 0.035 * d],
      ['gorewarden', 0.45 + 0.04 * d],
    ];
  };

  DC.BOSS = {
    knight: { hp: 420, atk: 26, def: 5, speed: 3.4, r: 2.5, color: '#9fb0cc', accent: '#4a5772', body: '#2b3444', cape: '#161c26', horn: '#c8b79a' },
    mage: { hp: 340, atk: 30, def: 3, speed: 3.9, r: 2.2, color: '#ff8f5e', accent: '#7c2c1c', body: '#3a1f1a', cape: '#1d0f0d', horn: '#e2c39b' },
    swordsman: { hp: 380, atk: 28, def: 4, speed: 4.6, r: 2.3, color: '#e8564d', accent: '#5d160d', body: '#33171a', cape: '#1a0c0e', horn: '#d8b78e' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
