/* Demons mirror the three careers, one tier weaker. powerFactor < 1 keeps the
   run winnable: they are the same shape of enemy as you, just dimmer. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.DEMONS = {
    imp: {
      id: 'imp', mirrors: 'mage', name: 'Imp',
      hp: 26, atk: 8, def: 0, speed: 3.9, r: 0.62,
      attackKind: 'ranged', attackCd: 1.5, sight: 15, keepRange: 9,
      projSpeed: 15, projLife: 2.0,
      powerFactor: 0.62, color: '#ff7a59', accent: '#8f2f22', xp: 1,
    },
    hellblade: {
      id: 'hellblade', mirrors: 'swordsman', name: 'Hellblade',
      hp: 34, atk: 10, def: 1, speed: 4.7, r: 0.66,
      attackKind: 'melee', attackCd: 0.95, reach: 2.2, arc: 110, sight: 15,
      powerFactor: 0.66, color: '#e0524b', accent: '#68190f', xp: 1,
    },
    gorewarden: {
      id: 'gorewarden', mirrors: 'knight', name: 'Gorewarden',
      hp: 58, atk: 16, def: 3, speed: 3.0, r: 0.82,
      attackKind: 'melee', attackCd: 1.5, reach: 2.4, arc: 95, sight: 13,
      knockback: 2.6, powerFactor: 0.7, xp: 2,
    },
  };

  DC.DEMON_ORDER = ['imp', 'hellblade', 'gorewarden'];

  // Which mirrors show up at which depth, so early levels are not a wall of
  // tanks and late levels are not only imps.
  DC.demonMix = function (depth) {
    const mix = [['imp', 1], ['hellblade', 0.2]];
    if (depth >= 3) mix.push(['gorewarden', 0.25]);
    if (depth >= 6) { mix[1][1] = 0.9; mix[2][1] = 0.7; }
    if (depth >= 12) { mix[0][1] = 0.8; mix[1][1] = 1.3; mix[2][1] = 1.1; }
    return mix;
  };

  DC.BOSS = {
    knight: { hp: 420, atk: 26, def: 5, speed: 3.4, r: 2.5, color: '#9fb0cc', accent: '#4a5772', body: '#2b3444', cape: '#161c26', horn: '#c8b79a' },
    mage: { hp: 340, atk: 30, def: 3, speed: 3.9, r: 2.2, color: '#ff8f5e', accent: '#7c2c1c', body: '#3a1f1a', cape: '#1d0f0d', horn: '#e2c39b' },
    swordsman: { hp: 380, atk: 28, def: 4, speed: 4.6, r: 2.3, color: '#e8564d', accent: '#5d160d', body: '#33171a', cape: '#1a0c0e', horn: '#d8b78e' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
