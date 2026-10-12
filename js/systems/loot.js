/* One reward per kill and per chest: equipment, an upgrade, money, or (chests
   only) a potion. Worse gear is melted into coin so the run never stalls. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Loot = {
    goldFromKill: function (d, depth, rng) {
      const base = 3 + 1.6 * depth * (d.def.xp || 1);
      return Math.max(1, Math.round(base * rng.range(0.7, 1.45)));
    },

    goldFromChest: function (depth, rng) {
      return Math.max(1, Math.round((10 + 5 * depth) * rng.range(0.8, 1.5)));
    },

    /* Returns a description string for the HUD log. */
    grant: function (game, world, source, x, y) {
      const rng = game.rng;
      const p = game.player;
      const depth = world.depth;
      const isChest = source === 'chest';
      const roll = rng.next();

      let equipChance = 0.30, upChance = 0.25, goldChance = 0.45, potChance = 0;
      if (isChest) { equipChance = 0.42; upChance = 0.24; goldChance = 0.16; potChance = 0.18; }

      if (roll < potChance) {
        const pot = DC.makePotion(rng.chance(0.65) ? 'heal' : 'mana');
        game.addItem(pot);
        return { text: 'Found ' + pot.name, color: pot.color };
      }
      if (roll < potChance + goldChance) {
        const g = isChest ? DC.Loot.goldFromChest(depth, rng) : DC.Loot.goldFromKill({ def: { xp: 1 } }, depth, rng);
        game.addGold(g);
        return { text: '+' + g + ' coin', color: '#ffd166' };
      }
      if (roll < potChance + goldChance + upChance) {
        const up = DC.makeUpgrade(rng);
        const applied = game.applyUpgrade(up);
        return { text: applied, color: up.color };
      }
      const ilvl = Math.max(1, depth + (isChest ? rng.int(1, 3) : 0));
      const item = rng.chance(0.5) ? DC.makeWeapon(rng, ilvl) : DC.makeArmor(rng, ilvl);
      return game.applyItem(item);
    },

    onChest: function (game, world, chest) {
      chest.opened = true;
      chest.lid = 0;
      const res = DC.Loot.grant(game, world, 'chest', chest.x, chest.y);
      game.log(res.text, res.color);
      DC.Props.floater(world, chest.x, chest.y - 1, res.text, res.color, { life: 1.5, size: 13 });
      DC.Props.burst(world, chest.x, chest.y, 16, { color: ['#ffd166', '#ffe9b0', '#c79bff'], spMin: 1.5, spMax: 5, lifeMin: 0.4, lifeMax: 0.9 });
      DC.Audio.play('chest');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
