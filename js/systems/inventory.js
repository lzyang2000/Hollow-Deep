/* The pack. Loot no longer silently re-dresses you: it lands in a bag with a
   finite number of hangers, and what you actually wear down there is a choice
   you make -- which is also what makes the merchant's coin meaningful, since
   everything you carry can be turned back into it. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.Inv = {
    /* Which worn slot a piece belongs to, or null if it is not worn. */
    slotOf: function (item) {
      if (!item) return null;
      if (item.type === 'weapon') return 'weapon';
      if (item.type === 'armor') return 'armor';
      return null;
    },

    /* One number that says how good a piece is, so "the worst thing I own"
       is a well-defined thing. Ties fall back to coin value. */
    power: function (item) {
      if (!item) return -1;
      if (item.type === 'weapon') return item.atk;
      if (item.type === 'armor') return item.def;
      return (item.value || 0) / 1000;
    },

    /* The stride a piece costs, spelled out wherever the piece is shown. */
    weightTag: function (item) {
      if (!item || !item.penalty) return '';
      return '  -' + item.penalty.toFixed(2) + ' m/s';
    },

    statLine: function (item) {
      if (!item) return '';
      if (item.type === 'weapon') return '+' + item.atk + ' ATK' + DC.Inv.weightTag(item);
      if (item.type === 'armor') return '+' + item.def + ' DEF' + DC.Inv.weightTag(item);
      if (item.type === 'potion') {
        return 'Restores ' + Math.round(item.frac * 100) + '% ' + (item.kind === 'hp' ? 'HP' : 'MP');
      }
      return '';
    },

    /* What putting this on actually does to you: the stat it buys, minus the
       stride it costs, at the rate this career values stride. This is the one
       number a piece of gear should be judged by, and it is what "vs worn"
       means everywhere in the interface. */
    fit: function (p, item) {
      const slot = DC.Inv.slotOf(item);
      if (!slot) return (item.value || 0) / 1000;
      const worn = p[slot];
      const dStat = DC.Inv.power(item) - DC.Inv.power(worn);
      const dPen = (item.penalty || 0) - (worn ? worn.penalty || 0 : 0);
      return dStat - dPen * (p.cls.moveValue || 4);
    },

    compare: function (p, item) {
      const slot = DC.Inv.slotOf(item);
      if (!slot) return '';
      const d = Math.round(DC.Inv.fit(p, item));
      return (d >= 0 ? '+' : '') + d;
    },

    /* Worn gear is the only source of equipment bonuses, so the derived
       stats are recomputed from the two worn slots and nothing else. */
    applyStats: function (p) {
      p.bonusAtk = p.weapon ? p.weapon.atk : 0;
      p.bonusDef = p.armor ? p.armor.def : 0;
      DC.Player.recalc(p);
    },

    capacity: function (p) { return p.invSize || DC.C.INV_SIZE; },

    isFull: function (p) { return p.inv.length >= DC.Inv.capacity(p); },

    /* How much a piece would actually help *you*, which is the only honest
       way to compare a sword to a breastplate: +30 ATK and +8 DEF are not the
       same object, but both are measured against what you are already wearing.
       Something worse than what you wear is worth less than nothing. */
    urgency: function (p, item) {
      return DC.Inv.fit(p, item) + (item.value || 0) / 100000;
    },

    /* Put a find in the bag. A full bag gives up the thing that helps you
       least: if that is the find, it never reaches you and you get its full
       worth; if it is something you were carrying, you get half back. */
    add: function (p, item, game) {
      const pay = function (n) { if (game) game.addGold(n); else p.gold += n; };
      if (!DC.Inv.isFull(p)) {
        p.inv.push(item);
        return { text: 'Packed ' + item.name, color: item.color, packed: true };
      }
      let worstIdx = -1, worst = DC.Inv.urgency(p, item);
      for (let i = 0; i < p.inv.length; i++) {
        const v = DC.Inv.urgency(p, p.inv[i]);
        if (v < worst) { worst = v; worstIdx = i; }
      }
      if (worstIdx < 0) {
        const g = Math.max(1, Math.round(item.value || 0));
        pay(g);
        return { text: 'Pack full \u00b7 melted ' + item.name + ' for ' + g, color: 'rgba(255,255,255,0.55)', melted: item };
      }
      const old = p.inv.splice(worstIdx, 1)[0];
      const g = Math.max(1, Math.round((old.value || 0) * 0.5));
      pay(g);
      p.inv.push(item);
      return { text: 'Packed ' + item.name + ' \u00b7 melted ' + old.name + ' for ' + g, color: item.color, packed: true, melted: old };
    },

    /* The displaced piece takes the row the new one just left, so the bag
       does not reshuffle under the cursor. */
    equip: function (p, index, game) {
      const item = p.inv[index];
      const slot = DC.Inv.slotOf(item);
      if (!slot) return null;
      const prev = p[slot];
      p.inv.splice(index, 1);
      if (prev) p.inv.splice(Math.min(index, p.inv.length), 0, prev);
      p[slot] = item;
      DC.Inv.applyStats(p);
      if (game) DC.Audio.play('levelUp');
      return {
        text: 'Equipped ' + item.name + ' (' + DC.Inv.statLine(item) + ')' + (prev ? ' \u00b7 stowed ' + prev.name : ''),
        color: item.color, slot, displaced: prev || null,
      };
    },

    /* Taking something off costs a bag row, which is the whole tension:
       you cannot carry every option and wear none of them. */
    stow: function (p, slot, game) {
      const item = p[slot];
      if (!DC.Inv.slotOf({ type: slot }) || !item) return null;
      if (DC.Inv.isFull(p)) {
        if (game) DC.Audio.play('empty');
        return { text: 'No room in the pack for ' + item.name, color: '#ff5c5c', full: true };
      }
      p[slot] = null;
      p.inv.push(item);
      DC.Inv.applyStats(p);
      if (game) DC.Audio.play('uiSelect');
      return { text: 'Stowed ' + item.name + ' \u00b7 ' + DC.Inv.statLine(item) + ' gone', color: item.color, slot };
    },

    sell: function (p, index, game, rate) {
      const item = p.inv[index];
      if (!item) return null;
      const g = Math.max(1, Math.round((item.value || 0) * (rate == null ? 1 : rate)));
      if (game) game.addGold(g); else p.gold += g;
      p.inv.splice(index, 1);
      if (game) DC.Audio.play('coin');
      return { text: 'Sold ' + item.name + ' for ' + g + ' coin', color: '#ffd166', gold: g };
    },

    /* Most useful thing first, so the bag reads as a shortlist rather than a
       heap -- and a piece you would never wear over what you already have
       sinks to the bottom where it can be sold from. */
    sort: function (p) {
      p.inv.sort(function (a, b) {
        const d = DC.Inv.urgency(p, b) - DC.Inv.urgency(p, a);
        return d !== 0 ? d : (b.value || 0) - (a.value || 0);
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
