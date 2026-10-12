/* The pack screen. It pauses the run -- the deep is not a place to change
   your mind at speed -- and it shows the comparison, because a number you
   have to remember is a number you will get wrong. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  DC.UI = DC.UI || {};
  DC.UI.Inv = {
    layout: function (game) {
      const W = game.cam.w, H = game.cam.h;
      const w = Math.min(840, W - 40);
      const h = Math.min(640, H - 32);
      const x = (W - w) / 2, y = (H - h) / 2;
      const pad = 20, inner = w - pad * 2;

      const eqLabelY = y + 80;
      const eqTop = eqLabelY + 10, eqH = 40;
      const equip = [
        { kind: 'equip', slot: 'weapon', x: x + pad, y: eqTop, w: inner, h: eqH - 6 },
        { kind: 'equip', slot: 'armor', x: x + pad, y: eqTop + eqH, w: inner, h: eqH - 6 },
      ];

      const size = DC.Inv.capacity(game.player);
      const bagLabelY = eqTop + eqH * 2 + 16;
      const bagTop = bagLabelY + 10;
      const potH = 38, footerH = 26;
      const avail = (y + h - footerH) - bagTop - potH;
      const rowH = Math.min(40, Math.max(20, avail / size));
      const bag = [];
      for (let i = 0; i < size; i++) {
        bag.push({ kind: 'bag', i, x: x + pad, y: bagTop + i * rowH, w: inner, h: rowH - 5 });
      }

      const potY = bagTop + size * rowH + 4;
      const half = (inner - 14) / 2;
      const pots = [
        { kind: 'potion', key: 'heal', x: x + pad, y: potY, w: half, h: potH - 8 },
        { kind: 'potion', key: 'mana', x: x + pad + half + 14, y: potY, w: half, h: potH - 8 },
      ];
      return { x, y, w, h, pad, inner, eqLabelY, equip, bagLabelY, bag, pots, rowH, size, footerY: y + h - 12 };
    },

    draw: function (ctx, game) {
      const L = DC.UI.Inv.layout(game);
      const p = game.player;
      const sel = M.clamp(game.invSel | 0, 0, Math.max(0, p.inv.length - 1));
      const hov = game.invHover;

      ctx.fillStyle = 'rgba(3,4,8,0.9)';
      ctx.fillRect(0, 0, game.cam.w, game.cam.h);
      DC.UI.panel(ctx, L.x, L.y, L.w, L.h, 'rgba(199,155,255,0.45)');

      ctx.font = '700 20px ' + FONT;
      ctx.fillStyle = '#c79bff';
      ctx.fillText('THE PACK', L.x + L.pad, L.y + 34);
      ctx.font = '500 12px ' + FONT;
      ctx.fillStyle = 'rgba(210,220,235,0.6)';
      ctx.fillText('What you carry is what you fight with. Sell the rest.', L.x + L.pad, L.y + 54);

      ctx.textAlign = 'right';
      ctx.font = '700 16px ' + FONT;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(p.gold + ' COIN', L.x + L.w - L.pad, L.y + 34);
      ctx.font = '600 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('HP ' + Math.ceil(p.hp) + '/' + p.maxHp + '   MP ' + Math.floor(p.mp) + '/' + p.maxMp +
        '   ATK ' + Math.round(p.atk) + '   DEF ' + Math.round(p.def), L.x + L.w - L.pad, L.y + 54);
      ctx.textAlign = 'left';

      /* ---- worn ---- */
      ctx.font = '700 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('WORN', L.x + L.pad, L.eqLabelY);
      ctx.textAlign = 'right';
      ctx.fillText('click to stow', L.x + L.w - L.pad, L.eqLabelY);
      ctx.textAlign = 'left';

      for (let i = 0; i < L.equip.length; i++) {
        const r = L.equip[i];
        const it = p[r.slot];
        const hot = hov && hov.kind === 'equip' && hov.slot === r.slot;
        ctx.fillStyle = hot ? 'rgba(199,155,255,0.12)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = hot ? 'rgba(199,155,255,0.5)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.font = '700 13px ' + FONT;
        ctx.fillStyle = it ? (it.color || '#fff') : 'rgba(255,255,255,0.3)';
        ctx.fillText((r.slot === 'weapon' ? 'Weapon  ' : 'Armor   ') + (it ? it.name + (it.qualityName ? ' \u00b7 ' + it.qualityName : '') : '\u2014 nothing \u2014'), r.x + 12, r.y + 19);
        ctx.font = '500 11px ' + FONT;
        ctx.fillStyle = it ? 'rgba(210,220,235,0.65)' : 'rgba(210,220,235,0.3)';
        ctx.fillText(it ? DC.Inv.statLine(it) + '   item level ' + it.ilvl + '   worth ' + it.value : 'the bag is where the rest of it waits', r.x + 12, r.y + 33);
      }

      /* ---- bag ---- */
      ctx.font = '700 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('CARRIED  ' + p.inv.length + '/' + L.size, L.x + L.pad, L.bagLabelY);
      ctx.textAlign = 'right';
      ctx.fillText('click to wear \u00b7 right-click or X to sell', L.x + L.w - L.pad, L.bagLabelY);
      ctx.textAlign = 'left';

      const twoLine = L.rowH >= 30;
      for (let i = 0; i < L.bag.length; i++) {
        const r = L.bag[i];
        const it = p.inv[i];
        const hot = hov && hov.kind === 'bag' && hov.i === i;
        const picked = it && i === sel;
        ctx.fillStyle = picked ? 'rgba(199,155,255,0.14)' : hot ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = picked ? 'rgba(199,155,255,0.6)' : 'rgba(255,255,255,0.1)';
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        if (!it) {
          ctx.font = '500 11px ' + FONT;
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillText((i + 1) + '.', r.x + 12, r.y + r.h - (twoLine ? 12 : 6));
          continue;
        }
        ctx.font = '700 13px ' + FONT;
        ctx.fillStyle = it.color || '#fff';
        ctx.fillText((i + 1 === 10 ? 0 : i + 1) + '. ' + it.name + (it.qualityName ? ' \u00b7 ' + it.qualityName : ''), r.x + 12, r.y + (twoLine ? 17 : r.h - 6));
        if (twoLine) {
          ctx.font = '500 11px ' + FONT;
          ctx.fillStyle = 'rgba(210,220,235,0.6)';
          ctx.fillText(DC.Inv.statLine(it) + '   item level ' + it.ilvl, r.x + 12, r.y + 32);
        }
        const d = DC.Inv.compare(p, it);
        ctx.textAlign = 'right';
        ctx.font = '700 12px ' + FONT;
        const dn = parseInt(d, 10) || 0;
        ctx.fillStyle = dn > 0 ? '#8ef0c0' : dn < 0 ? '#ff8a5c' : 'rgba(255,255,255,0.45)';
        ctx.fillText(d + ' vs worn', r.x + r.w - 12, r.y + (twoLine ? 17 : r.h - 6));
        ctx.font = '500 11px ' + FONT;
        ctx.fillStyle = 'rgba(255,209,102,0.6)';
        if (twoLine) ctx.fillText('sell ' + it.value, r.x + r.w - 12, r.y + 32);
        ctx.textAlign = 'left';
      }

      /* ---- potions ---- */
      for (let i = 0; i < L.pots.length; i++) {
        const r = L.pots[i];
        const n = p.potions[r.key] || 0;
        const def = DC.POTIONS[r.key];
        const hot = hov && hov.kind === 'potion' && hov.key === r.key;
        ctx.fillStyle = hot && n > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
        ctx.font = '700 12px ' + FONT;
        ctx.fillStyle = n > 0 ? def.color : 'rgba(255,255,255,0.28)';
        ctx.fillText(def.name + ' x' + n, r.x + 12, r.y + 17);
        ctx.font = '500 11px ' + FONT;
        ctx.fillStyle = 'rgba(210,220,235,0.5)';
        ctx.fillText((r.key === 'heal' ? 'Q' : 'F') + ' to drink \u00b7 ' + DC.Inv.statLine(def), r.x + 12, r.y + 30);
      }

      ctx.font = '600 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('1-9 pick \u00b7 E wear \u00b7 X or right-click sell \u00b7 R sort \u00b7 Q/F drink \u00b7 I or ESC close', L.x + L.pad, L.footerY);
    },

    hover: function (game, mx, my) {
      const L = DC.UI.Inv.layout(game);
      const all = L.equip.concat(L.bag, L.pots);
      for (let i = 0; i < all.length; i++) {
        const r = all[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
          game.invHover = r;
          return r;
        }
      }
      game.invHover = null;
      return null;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
