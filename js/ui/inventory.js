/* The pack screen. It pauses the run -- the deep is not a place to change
   your mind at speed -- and it shows the comparison, because a number you
   have to remember is a number you will get wrong.
   On a phone there is no right-click and no X key, so selling is a button and
   a row is selected before it is worn. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  DC.UI = DC.UI || {};
  DC.UI.Inv = {
    layout: function (game) {
      const cam = game.cam, L = DC.Layout;
      const W = cam.w, H = cam.h;
      const w = Math.min(840, W - (L.narrow ? 16 : 40));
      const h = Math.min(640, H - (L.narrow ? 12 : 32));
      const x = (W - w) / 2, y = (H - h) / 2;
      const pad = L.narrow ? 14 : 20, inner = w - pad * 2;

      const eqLabelY = y + (L.narrow ? 66 : 80);
      const eqTop = eqLabelY + 10, eqH = L.narrow ? 34 : 40;
      const equip = [
        { kind: 'equip', slot: 'weapon', x: x + pad, y: eqTop, w: inner, h: eqH - 6 },
        { kind: 'equip', slot: 'armor', x: x + pad, y: eqTop + eqH, w: inner, h: eqH - 6 },
      ];

      const size = DC.Inv.capacity(game.player);
      const bagLabelY = eqTop + eqH * 2 + 16;
      const bagTop = bagLabelY + 10;
      const bottomH = L.touch ? 44 : 30;
      const footerH = L.touch ? 8 : 24;
      const avail = (y + h - footerH - bottomH - 6) - bagTop;

      // A short window cannot hold ten tall rows, so the bag folds into two
      // columns rather than running off the bottom of the screen.
      let cols = 1;
      if (avail / size < 22) cols = 2;
      const rowsN = Math.ceil(size / cols);
      const rowH = Math.min(40, Math.max(18, avail / rowsN));
      const colW = (inner - (cols - 1) * 10) / cols;
      const bag = [];
      for (let i = 0; i < size; i++) {
        const c = Math.floor(i / rowsN), r = i % rowsN;
        bag.push({ kind: 'bag', i, x: x + pad + c * (colW + 10), y: bagTop + r * rowH, w: colW, h: rowH - 5 });
      }

      const bottomY = bagTop + rowsN * rowH + 6;
      const pots = [];
      const acts = [];
      if (L.touch) {
        const n = 4, gap = 8;
        const bw = (inner - gap * (n - 1)) / n;
        const defs = [
          { kind: 'potion', key: 'heal', label: 'HEAL' },
          { kind: 'potion', key: 'mana', label: 'MANA' },
          { kind: 'sell', label: 'SELL' },
          { kind: 'close', label: 'CLOSE' },
        ];
        for (let i = 0; i < n; i++) {
          const d = defs[i];
          pots.push(Object.assign({}, d, { x: x + pad + i * (bw + gap), y: bottomY, w: bw, h: bottomH - 4 }));
        }
      } else {
        const half = (inner - 14) / 2;
        pots.push({ kind: 'potion', key: 'heal', label: 'HEAL', x: x + pad, y: bottomY, w: half, h: bottomH - 6 });
        pots.push({ kind: 'potion', key: 'mana', label: 'MANA', x: x + pad + half + 14, y: bottomY, w: half, h: bottomH - 6 });
      }
      return {
        x, y, w, h, pad, inner, eqLabelY, equip, bagLabelY, bag, pots, acts,
        rowH, size, cols, rowsN, narrow: L.narrow,
        footerY: y + h - 12,
      };
    },

    draw: function (ctx, game) {
      const L = DC.UI.Inv.layout(game);
      const p = game.player;
      const sel = M.clamp(game.invSel | 0, 0, Math.max(0, p.inv.length - 1));
      const hov = game.invHover;
      const narrow = L.narrow;
      const fs = DC.Layout.font(11, 10);

      ctx.fillStyle = 'rgba(3,4,8,0.9)';
      ctx.fillRect(0, 0, game.cam.w, game.cam.h);
      DC.UI.panel(ctx, L.x, L.y, L.w, L.h, 'rgba(199,155,255,0.45)');

      ctx.font = '700 ' + DC.Layout.font(20, 15) + 'px ' + FONT;
      ctx.fillStyle = '#c79bff';
      ctx.fillText('THE PACK', L.x + L.pad, L.y + 34);
      ctx.font = '500 ' + fs + 'px ' + FONT;
      ctx.fillStyle = 'rgba(210,220,235,0.6)';
      if (!narrow) ctx.fillText('What you carry is what you fight with. Sell the rest.', L.x + L.pad, L.y + 54);

      ctx.textAlign = 'right';
      ctx.font = '700 ' + DC.Layout.font(16, 13) + 'px ' + FONT;
      ctx.fillStyle = '#ffd166';
      ctx.fillText(p.gold + ' COIN', L.x + L.w - L.pad, L.y + 34);
      ctx.font = '600 ' + fs + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(narrow
        ? 'HP ' + Math.ceil(p.hp) + '/' + p.maxHp + '  MP ' + Math.floor(p.mp) + '/' + p.maxMp
        : 'HP ' + Math.ceil(p.hp) + '/' + p.maxHp + '   MP ' + Math.floor(p.mp) + '/' + p.maxMp +
          '   ATK ' + Math.round(p.atk) + '   DEF ' + Math.round(p.def), L.x + L.w - L.pad, L.y + 54);
      ctx.textAlign = 'left';

      /* ---- worn ---- */
      ctx.font = '700 ' + fs + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('WORN', L.x + L.pad, L.eqLabelY);
      ctx.textAlign = 'right';
      ctx.fillText('tap to stow', L.x + L.w - L.pad, L.eqLabelY);
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
        ctx.font = '700 ' + DC.Layout.font(13, 11) + 'px ' + FONT;
        ctx.fillStyle = it ? (it.color || '#fff') : 'rgba(255,255,255,0.3)';
        ctx.fillText((r.slot === 'weapon' ? 'Weapon  ' : 'Armor   ') + (it ? it.name + (it.qualityName && !narrow ? ' \u00b7 ' + it.qualityName : '') : '\u2014 nothing \u2014'), r.x + 12, r.y + 17);
        if (!narrow) {
          ctx.font = '500 ' + fs + 'px ' + FONT;
          ctx.fillStyle = it ? 'rgba(210,220,235,0.65)' : 'rgba(210,220,235,0.3)';
          ctx.fillText(it ? DC.Inv.statLine(it) + '   item level ' + it.ilvl + '   worth ' + it.value : 'the bag is where the rest of it waits', r.x + 12, r.y + 31);
        }
      }

      /* ---- bag ---- */
      ctx.font = '700 ' + fs + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('CARRIED  ' + p.inv.length + '/' + L.size, L.x + L.pad, L.bagLabelY);
      ctx.textAlign = 'right';
      ctx.fillText(DC.Layout.touch ? 'tap to pick up \u00b7 tap again to wear' : 'click to wear \u00b7 right-click or X to sell', L.x + L.w - L.pad, L.bagLabelY);
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
          ctx.font = '500 ' + fs + 'px ' + FONT;
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillText((i + 1) + '.', r.x + 12, r.y + r.h - (twoLine ? 12 : 6));
          continue;
        }
        ctx.font = '700 ' + DC.Layout.font(13, 11) + 'px ' + FONT;
        ctx.fillStyle = it.color || '#fff';
        ctx.fillText((i + 1 === 10 ? 0 : i + 1) + '. ' + it.name + (it.qualityName && !narrow ? ' \u00b7 ' + it.qualityName : ''), r.x + 12, r.y + (twoLine ? 17 : r.h - 6));
        if (twoLine) {
          ctx.font = '500 ' + fs + 'px ' + FONT;
          ctx.fillStyle = 'rgba(210,220,235,0.6)';
          ctx.fillText(DC.Inv.statLine(it) + '   item level ' + it.ilvl, r.x + 12, r.y + 32);
        }
        const d = DC.Inv.compare(p, it);
        ctx.textAlign = 'right';
        ctx.font = '700 ' + DC.Layout.font(12, 10) + 'px ' + FONT;
        const dn = parseInt(d, 10) || 0;
        ctx.fillStyle = dn > 0 ? '#8ef0c0' : dn < 0 ? '#ff8a5c' : 'rgba(255,255,255,0.45)';
        ctx.fillText(d + (narrow ? '' : ' vs worn'), r.x + r.w - 12, r.y + (twoLine ? 17 : r.h - 6));
        if (twoLine) {
          ctx.font = '500 ' + fs + 'px ' + FONT;
          ctx.fillStyle = 'rgba(255,209,102,0.6)';
          ctx.fillText('sell ' + it.value, r.x + r.w - 12, r.y + 32);
        }
        ctx.textAlign = 'left';
      }

      /* ---- potions + (on a phone) sell and close ---- */
      for (let i = 0; i < L.pots.length; i++) {
        const r = L.pots[i];
        const hot = hov && hov.kind === r.kind && (r.kind !== 'potion' || hov.key === r.key);
        if (r.kind === 'potion') {
          const n = p.potions[r.key] || 0;
          const def = DC.POTIONS[r.key];
          ctx.fillStyle = hot && n > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          ctx.font = '700 ' + DC.Layout.font(12, 10) + 'px ' + FONT;
          ctx.fillStyle = n > 0 ? def.color : 'rgba(255,255,255,0.28)';
          ctx.fillText(r.label + ' x' + n, r.x + 10, r.y + 17);
          if (!narrow) {
            ctx.font = '500 ' + fs + 'px ' + FONT;
            ctx.fillStyle = 'rgba(210,220,235,0.5)';
            ctx.fillText((r.key === 'heal' ? 'Q' : 'F') + ' to drink \u00b7 ' + DC.Inv.statLine(def), r.x + 10, r.y + 30);
          }
        } else {
          ctx.fillStyle = hot ? 'rgba(199,155,255,0.14)' : 'rgba(255,255,255,0.05)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.strokeStyle = hot ? 'rgba(199,155,255,0.55)' : 'rgba(255,255,255,0.16)';
          ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
          ctx.font = '700 ' + DC.Layout.font(12, 10) + 'px ' + FONT;
          ctx.fillStyle = r.kind === 'close' ? '#8ef0c0' : '#ffd166';
          ctx.fillText(r.label, r.x + 10, r.y + r.h / 2 + 4);
        }
      }

      if (!DC.Layout.touch) {
        ctx.font = '600 ' + fs + 'px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText('1-9 pick \u00b7 E wear \u00b7 X or right-click sell \u00b7 R sort \u00b7 Q/F drink \u00b7 I or ESC close', L.x + L.pad, L.footerY);
      }
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
