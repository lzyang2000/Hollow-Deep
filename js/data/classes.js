/* The three careers. Ranged, balanced melee, slow tank. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.CLASSES = {
    mage: {
      id: 'mage', name: 'Mage', role: 'Ranged \u2014 spends MP to attack',
      hp: 60, mp: 130, speed: 4.6, def: 0, atk: 17,
      attackKind: 'ranged', attackCd: 0.5, mpCost: 4,
      projSpeed: 30, projLife: 1.35, pierce: 2, splash: 1.3,
      mpRegen: 8, power: 1.0,
      // What one m/s of stride is worth in ATK/DEF points to this career: a
      // kiting mage lives and dies by distance, a knight never had any.
      moveValue: 6,
      ability: { id: 'blink', name: 'Blink', mp: 18, cd: 6, desc: 'Fold 9 m along your aim through stone. You always land in open ground.' },
      color: '#7fd0ff', accent: '#2b6ea8', robe: '#243b57',
      blurb: 'Fragile, far-reaching, and out of mana at exactly the wrong moment.',
    },
    swordsman: {
      id: 'swordsman', name: 'Swordsman', role: 'Close quarters \u2014 balanced HP and MP',
      hp: 95, mp: 95, speed: 5.0, def: 1, atk: 19,
      attackKind: 'melee', attackCd: 0.46, reach: 2.8, arc: 135,
      mpRegen: 4, power: 1.0, moveValue: 4,
      ability: { id: 'whirlwind', name: 'Whirlwind', mp: 16, cd: 7, desc: 'A full circle slash at 1.5x damage, hitting everything close.' },
      color: '#ffd166', accent: '#a8762b', robe: '#5b3a2a',
      blurb: 'Fastest feet, widest arc. Nothing in front of you survives long.',
    },
    knight: {
      id: 'knight', name: 'Knight', role: 'Close quarters \u2014 slow, heavy, more HP than MP',
      hp: 145, mp: 70, speed: 3.5, def: 3, atk: 24,
      attackKind: 'melee', attackCd: 0.72, reach: 2.6, arc: 105,
      mpRegen: 2.6, power: 1.0, knockback: 2.4, moveValue: 2.5,
      ability: { id: 'shieldwall', name: 'Shield Wall', mp: 22, cd: 10, desc: '3.2 s of 70% damage reduction and immunity to knockback.' },
      color: '#c9d4e8', accent: '#6d7a92', robe: '#3b4252',
      blurb: 'Slow as a door. Hits like one. Can stand in a room full of demons and win.',
    },
  };

  DC.CLASS_ORDER = ['mage', 'swordsman', 'knight'];
})(typeof window !== 'undefined' ? window : globalThis);
