/* The two careers. A ranged wick, and a wall of steel.

   The stride ladder, and why it sits here: a mage (4.6) is the quicker of the
   two, because distance is her whole defence -- but the Hellblade (4.7) still
   catches her, so no fight down there can simply be walked away from. A knight
   (4.2) is slower on purpose: 3.5 m/s meant he could neither close on a
   shooter nor disengage from a mistake, so he was given legs, but not enough
   to outrun anything that wants to hit him. Being heavy still costs something
   real.

   There used to be a third -- Swordsman, fastest feet and widest arc. He is
   gone: a mage owns the reach and a knight owns the brawl, and there was
   nothing left in between for him to be. The demons never had a career to
   mirror, and the Hellblade that wore his shape is still down there. A save
   file that names him comes back as a knight (see CLASS_ALIAS). */
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
    knight: {
      id: 'knight', name: 'Knight', role: 'Close quarters \u2014 slow, heavy, more HP than MP',
      hp: 145, mp: 70, speed: 4.2, def: 3, atk: 24,
      attackKind: 'melee', attackCd: 0.72, reach: 2.6, arc: 105,
      mpRegen: 2.6, power: 1.0, knockback: 2.4, moveValue: 2.5,
      ability: { id: 'shieldwall', name: 'Shield Wall', mp: 22, cd: 10, desc: '3.2 s of 70% damage reduction and immunity to knockback.' },
      color: '#c9d4e8', accent: '#6d7a92', robe: '#3b4252',
      blurb: 'Slow for a big man. Hits like a door. Can stand in a room full of demons and win.',
    },
  };

  DC.CLASS_ORDER = ['mage', 'knight'];

  /* Careers come and go; save files do not. A run saved as something that is
     no longer offered would otherwise be refused outright -- coin, gear, fog
     memory and all -- so it comes back as the nearest thing it was. The pools
     are re-derived from the new career, which is why the knight is the honest
     answer for a swordsman: same melee body, and the HP he ends up with is the
     HP he would have had. */
  DC.CLASS_ALIAS = { swordsman: 'knight' };
})(typeof window !== 'undefined' ? window : globalThis);
