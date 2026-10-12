/* The merchant. Sells in boss rooms only, which is what makes the coin you
   carry across a level feel like a decision instead of a scoreboard. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  DC.Shop = {
    layout: function (game) {
      const W = game.cam.w, H = game.cam.h, L = DC.Layout;
      const narrow = L.narrow;
      const w = Math.min(760, W - (narrow ? 16 : 60));
      const h = Math.min(520, H - (narrow ? 16 : 80));
      const x = (W - w) / 2, y = (H - h) / 2;
      const stock = game.shop.stock;
      const headH = narrow ? 74 : 92;
      const footH = L.touch ? 52 : 26;
      const rowH = M.clamp((h - headH - footH) / Math.max(1, stock.length), 26, 46);
      const rows = [];
      for (let i = 0; i < stock.length; i++) {
        rows.push({ x: x + 20, y: y + headH + i * rowH, w: w - 40, h: rowH - (narrow ? 3 : 6), i });
      }
      // No ESC key on a phone, so leaving the counter has to be something you
      // can see and hit.
      const back = L.touch ? { x: x + 20, y: y + headH + stock.length * rowH + 4, w: w - 40, h: 44 } : null;
      return { x, y, w, h, rows, rowH, back, narrow: narrow };
    },

    describe: function (item, p, short) {
      const s = short ? '  ' : '   ';
      if (item.type === 'weapon') {
        return '+' + item.atk + ' ATK' + s + DC.Inv.compare(p, item) + ' vs worn' + (short ? '  sell ' + item.value : '   worth ' + item.value + ' if you sell it');
      }
      if (item.type === 'armor') {
        return '+' + item.def + ' DEF' + s + DC.Inv.compare(p, item) + ' vs worn' + (short ? '  sell ' + item.value : '   worth ' + item.value + ' if you sell it');
      }
      if (item.type === 'upgrade') {
        if (item.stat === 'attackSpeed') return '+' + Math.round(item.amount * 100) + '% attack speed';
        if (item.stat === 'moveSpeed') return '+' + item.amount.toFixed(2) + ' m/s movement';
        if (item.stat === 'maxHp') return '+' + item.amount + ' max HP';
        return '+' + item.amount + ' max MP';
      }
      if (item.type === 'potion') {
        return item.kind === 'hp' ? 'Restores ' + Math.round(item.frac * 100) + '% HP now' : 'Restores ' + Math.round(item.frac * 100) + '% MP now';
      }
      return '';
    },

    draw: function (ctx, game) {
      const L = DC.Shop.layout(game);
      const p = game.player;
      const stock = game.shop.stock;
      // The counter is a room of its own: dim everything behind it.
      ctx.fillStyle = 'rgba(3,4,8,0.9)';
      ctx.fillRect(0, 0, game.cam.w, game.cam.h);
      DC.UI.panel(ctx, L.x, L.y, L.w, L.h, 'rgba(255,209,102,0.45)');

      ctx.font = '700 20px ' + FONT;
      ctx.fillStyle = '#ffd166';
      ctx.fillText('THE MERCHANT', L.x + 20, L.y + 32);
      ctx.font = '500 12px ' + FONT;
      ctx.fillStyle = 'rgba(210,220,235,0.6)';
      if (!L.narrow) {
        const line = DC.UI.wrap(ctx, '"' + game.shop.line + '"', L.w - 430);
        for (let i = 0; i < Math.min(2, line.length); i++) ctx.fillText(line[i], L.x + 20, L.y + 54 + i * 15);
      }

      ctx.textAlign = 'right';
      ctx.font = '700 16px ' + FONT;
      ctx.fillStyle = p.gold >= 0 ? '#ffd166' : '#ff5c5c';
      ctx.fillText(p.gold + ' COIN', L.x + L.w - 20, L.y + 34);
      ctx.font = '600 ' + DC.Layout.font(11, 10) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(L.narrow
        ? 'HP ' + Math.ceil(p.hp) + '/' + p.maxHp + '  MP ' + Math.floor(p.mp) + '/' + p.maxMp
        : 'HP ' + Math.ceil(p.hp) + '/' + p.maxHp + '   MP ' + Math.floor(p.mp) + '/' + p.maxMp +
          '   ATK ' + Math.round(p.atk) + '   DEF ' + Math.round(p.def), L.x + L.w - 20, L.y + 54);
      ctx.textAlign = 'left';

      for (let i = 0; i < stock.length; i++) {
        const entry = stock[i];
        const r = L.rows[i];
        const hot = game.shop.hover === i;
        const afford = p.gold >= entry.price;
        ctx.fillStyle = entry.sold ? 'rgba(255,255,255,0.03)' : hot ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.05)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = entry.sold ? 'rgba(255,255,255,0.08)' : hot && afford ? 'rgba(255,209,102,0.5)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

        const it = entry.item;
        ctx.font = '700 ' + DC.Layout.font(13, 11) + 'px ' + FONT;
        ctx.fillStyle = entry.sold ? 'rgba(255,255,255,0.3)' : (it.color || '#fff');
        ctx.fillText((i + 1) + '. ' + it.name + (it.qualityName && !L.narrow ? ' \u00b7 ' + it.qualityName : ''), r.x + 12, r.y + (L.narrow ? 15 : 19));
        ctx.font = '500 ' + DC.Layout.font(11, 10) + 'px ' + FONT;
        ctx.fillStyle = entry.sold ? 'rgba(255,255,255,0.25)' : 'rgba(210,220,235,0.65)';
        ctx.fillText(DC.Shop.describe(it, p, L.narrow), r.x + 12, r.y + (L.narrow ? 28 : 35));

        ctx.textAlign = 'right';
        ctx.font = '700 ' + DC.Layout.font(13, 11) + 'px ' + FONT;
        ctx.fillStyle = entry.sold ? 'rgba(255,255,255,0.25)' : afford ? '#ffd166' : '#ff5c5c';
        ctx.fillText(entry.sold ? 'SOLD' : entry.price + (L.narrow ? '' : ' coin'), r.x + r.w - 12, r.y + (L.narrow ? Math.min(26, r.h - 4) : 27));
        ctx.textAlign = 'left';
      }

      if (L.back) {
        DC.UI.drawButton(ctx, { label: 'LEAVE THE COUNTER', primary: true, x: L.back.x, y: L.back.y, w: L.back.w, h: L.back.h }, game.shop.hover === -2);
      } else {
        ctx.font = '600 11px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText('Click or press 1-' + stock.length + ' to buy \u00b7 E or ESC to leave \u00b7 gear goes in the pack, open it with I',
          L.x + 20, L.y + L.h - 16);
      }
    },

    hover: function (game, mx, my) {
      const L = DC.Shop.layout(game);
      game.shop.hover = -1;
      if (L.back && DC.UI.hit(L.back, mx, my)) { game.shop.hover = -2; return -2; }
      for (let i = 0; i < L.rows.length; i++) {
        const r = L.rows[i];
        if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { game.shop.hover = i; return i; }
      }
      return -1;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
