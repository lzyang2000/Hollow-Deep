/* Equipment, upgrades, potions and the merchant's stock tables. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.QUALITY = [
    { name: 'Worn', mult: 0.85, color: '#9aa3b2' },
    { name: 'Sound', mult: 1.0, color: '#d7dee9' },
    { name: 'Fine', mult: 1.16, color: '#7fd0ff' },
    { name: 'Runed', mult: 1.34, color: '#c79bff' },
    { name: 'Seal-forged', mult: 1.55, color: '#ffd166' },
  ];

  DC.WEAPON_NAMES = ['Dagger', 'Shortsword', 'Sabre', 'Falchion', 'Longsword', 'Rapier', 'Greataxe', 'Warhammer', 'Cleaver', 'Maul', 'Spadroon', 'Billhook'];
  DC.ARMOR_NAMES = ['Leather Jerkin', 'Ring Mail', 'Brigandine', 'Scale Hauberk', 'Cuirass', 'Half-Plate', 'Tower Shield', 'Warden Plate', 'Taper Cloak', 'Ash Vest'];
  DC.WEAPON_PREFIX = ['notched', 'blackened', 'choir-etched', 'emberbrand', 'taper-warden', 'gatehouse', 'nine-voiced', 'hollow', 'gravesong', 'sworn'];
  DC.ARMOR_PREFIX = ['dented', 'deepweave', 'sealbound', 'ashfurred', 'lantern-plate', 'unbroken', 'choir-marked', 'delver-made', 'gatekeeper'];

  // Repeatable stat upgrades. Caps stop a lucky run from becoming absurd.
  DC.UPGRADES = {
    moveSpeed: { key: 'moveSpeed', name: 'Strider\u2019s Coil', stat: 'moveSpeed', amount: 0.22, cap: 2.2, label: 'Movement speed' },
    attackSpeed: { key: 'attackSpeed', name: 'Whetstone of Haste', stat: 'attackSpeed', amount: 0.07, cap: 0.9, label: 'Attack speed' },
    maxHp: { key: 'maxHp', name: 'Heart of the Deep', stat: 'maxHp', amount: 16, cap: 260, label: 'Max HP' },
    maxMp: { key: 'maxMp', name: 'Wick Oil Vial', stat: 'maxMp', amount: 13, cap: 220, label: 'Max MP' },
  };

  DC.POTIONS = {
    heal: { key: 'heal', name: 'Healing Draught', kind: 'hp', frac: 0.45, color: '#ff6b6b' },
    greaterHeal: { key: 'greaterHeal', name: 'Greater Healing Draught', kind: 'hp', frac: 0.85, color: '#ff3d5a' },
    mana: { key: 'mana', name: 'Wick Oil', kind: 'mp', frac: 0.6, color: '#6bb6ff' },
  };

  /* minQuality is a floor, not a cap: the merchant uses it so the counter never
     sells rags, while the floor's own drops stay as random as ever. */
  DC.rollQuality = function (rng, depth, minIndex) {
    // Deeper levels skew richer.
    const bias = Math.min(0.55, depth * 0.022);
    let r = rng.next() + bias;
    let i = 0;
    while (r >= 1 && i < DC.QUALITY.length - 1) { r -= 1; i++; }
    // r in [0,1) inside band i; occasionally jump a band
    if (i < DC.QUALITY.length - 1 && rng.chance(0.12 + bias * 0.3)) i++;
    if (minIndex && i < minIndex) i = minIndex;
    return { index: i, q: DC.QUALITY[Math.min(i, DC.QUALITY.length - 1)] };
  };

  DC.makeWeapon = function (rng, ilvl, opts) {
    const { index, q } = DC.rollQuality(rng, ilvl, opts && opts.minQuality);
    const atk = Math.max(1, Math.round((2.1 + 0.95 * ilvl) * q.mult));
    const name = (rng.chance(0.55) ? rng.pick(DC.WEAPON_PREFIX) + ' ' : '') + rng.pick(DC.WEAPON_NAMES);
    return {
      type: 'weapon', name, ilvl, quality: index, qualityName: q.name, color: q.color,
      atk, value: Math.round((26 + 13 * ilvl) * q.mult),
    };
  };

  DC.makeArmor = function (rng, ilvl, opts) {
    const { index, q } = DC.rollQuality(rng, ilvl, opts && opts.minQuality);
    const def = Math.max(1, Math.round((1.1 + 0.6 * ilvl) * q.mult));
    const name = (rng.chance(0.55) ? rng.pick(DC.ARMOR_PREFIX) + ' ' : '') + rng.pick(DC.ARMOR_NAMES);
    return {
      type: 'armor', name, ilvl, quality: index, qualityName: q.name, color: q.color,
      def, value: Math.round((24 + 12 * ilvl) * q.mult),
    };
  };

  DC.makeUpgrade = function (rng, key) {
    const u = DC.UPGRADES[key || rng.pick(Object.keys(DC.UPGRADES))];
    return { type: 'upgrade', key: u.key, name: u.name, stat: u.stat, amount: u.amount, label: u.label, color: '#8ef0c0', value: 60 };
  };

  DC.makePotion = function (key) {
    const p = DC.POTIONS[key];
    return { type: 'potion', key: p.key, name: p.name, kind: p.kind, frac: p.frac, color: p.color, value: 30 };
  };

  /* Merchant stock, and the two curves it has to get right.

     The wares must beat the floor. Chests roll ilvl depth+1..3 with a random
     quality, so the counter sits a tier and a half above that and refuses to
     sell anything below Fine -- otherwise a Worn roll at depth 20 comes out
     worse than the sword on the delver's back, which is exactly what the
     measured economy showed it doing.

     The prices must keep up with the purse. Income per floor grows with depth
     (more demons, richer ones, more urns), so a price that only steps once per
     boss tier is free money by depth 20: a 53,769 coin purse looking at a 416
     coin weapon is not a decision. Gear is therefore priced off depth squared,
     which lands near a tenth of what a careful delver has saved by the time it
     reaches the counter, at every depth. */
  DC.shopStock = function (rng, depth) {
    const t = Math.max(1, Math.round(depth / 10));
    const ilvl = depth + 4 + t;
    const minQuality = Math.min(DC.QUALITY.length - 1, 2 + Math.floor(t / 2));
    const gear = Math.max(180, Math.round(13 * depth * depth - 58 * depth + 150));
    const price = (frac) => Math.max(20, Math.round(gear * frac));
    const fine = { minQuality };

    const stock = [];
    stock.push({ item: DC.makePotion('heal'), price: price(0.12) });
    stock.push({ item: DC.makePotion('mana'), price: price(0.1) });
    if (depth >= 10) stock.push({ item: DC.makePotion('greaterHeal'), price: price(0.22) });

    const upgradeKeys = Object.keys(DC.UPGRADES);
    rng.shuffle(upgradeKeys);
    const offers = [
      { item: DC.makeWeapon(rng, ilvl, fine), price: gear },
      { item: DC.makeArmor(rng, ilvl, fine), price: Math.round(gear * 0.92) },
      { item: DC.makeUpgrade(rng, upgradeKeys[0]), price: price(0.6) },
      { item: DC.makeUpgrade(rng, upgradeKeys[1]), price: price(0.64) },
    ];
    // Deeper counters have a longer shelf: a third upgrade from the second boss
    // floor, and a finer piece of the same kind -- better, and priced for it --
    // from the fourth.
    if (depth >= 20) offers.push({ item: DC.makeUpgrade(rng, upgradeKeys[2]), price: price(0.55) });
    if (depth >= 40) {
      offers.push({ item: DC.makeWeapon(rng, ilvl + 3, fine), price: Math.round(gear * 1.55) });
      offers.push({ item: DC.makeArmor(rng, ilvl + 3, fine), price: Math.round(gear * 1.45) });
    }
    rng.shuffle(offers);
    for (let i = 0; i < offers.length; i++) stock.push(offers[i]);
    return stock;
  };
})(typeof window !== 'undefined' ? window : globalThis);
