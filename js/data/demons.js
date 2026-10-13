/* Three demon shapes, one tier weaker than the career they echo. powerFactor <
   1 keeps the run winnable: they are the same shape of enemy as you, just
   dimmer. The shapes are not the careers -- a Hellblade wears the shape of the
   Swordsman nobody can play any more, and it is still the fastest thing in the
   dark, so the deep keeps three bodies while the surface offers two. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.DEMONS = {
    imp: {
      // Skittish but not a sprinter: an imp keeps its distance by backing off
      // to keepRange, not by outrunning a knight forever. The stride is set
      // under the knight's 3.5 on purpose -- a shooter you can eventually run
      // down is a fight, a shooter you cannot is a countdown. speedCap keeps
      // deep floors from buying that stride back (2.6 x 1.18 = 3.07 m/s).
      id: 'imp', mirrors: 'mage', name: 'Imp',
      hp: 26, atk: 8, def: 0, speed: 2.6, speedCap: 1.18, r: 0.62,
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

  /* Sovereigns. hp is what you grind through, def is what makes the grinding
     mean something, atk is what makes you care about getting hit.
     The old numbers were 420/5, 340/3, 380/4 with the def never actually read
     by anything. Measured against a properly kitted delver, that made a
     throne room a 20-second punching bag: 24 harness fights, 24 wins, 0
     deaths, and a mage standing at 14 m took literally zero damage. So the
     beef came down about a quarter and the plate went up about double -- the
     fight gets shorter but every blow has to be earned through armour -- and
     the reach fixes in entities/boss.js are what actually make it dangerous. */
  DC.BOSS = {
    knight: { hp: 330, atk: 26, def: 11, speed: 3.4, r: 2.5, color: '#9fb0cc', accent: '#4a5772', body: '#2b3444', cape: '#161c26', horn: '#c8b79a' },
    // The sovereign kites too, so it obeys the same rule: slower than a knight
    // even at the x1.18 enrage (2.9 x 1.18 = 3.42 < 3.5). Its threat is the
    // volley and the slam, not the ability to never be caught.
    mage: { hp: 270, atk: 30, def: 8, speed: 2.9, r: 2.2, color: '#ff8f5e', accent: '#7c2c1c', body: '#3a1f1a', cape: '#1d0f0d', horn: '#e2c39b' },
    swordsman: { hp: 300, atk: 28, def: 10, speed: 4.6, r: 2.3, color: '#e8564d', accent: '#5d160d', body: '#33171a', cape: '#1a0c0e', horn: '#d8b78e' },
  };
})(typeof window !== 'undefined' ? window : globalThis);
