/* Title, career select, lore interstitials, pause and death screens. All drawn
   on the game canvas so the whole thing stays one file:// page with no DOM UI. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  DC.UI = DC.UI || {};

  DC.UI.wrap = function (ctx, text, maxW) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  DC.UI.panel = function (ctx, x, y, w, h, accent) {
    ctx.fillStyle = 'rgba(6,9,14,0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = accent || 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, w, 2);
  };

  DC.UI.centerText = function (ctx, text, x, y, font, color) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  };

  /* ---------------- title ---------------- */
  DC.UI.drawTitle = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h;
    ctx.fillStyle = 'rgba(3,4,7,0.86)';
    ctx.fillRect(0, 0, W, H);

    const t = game.time;
    DC.UI.centerText(ctx, DC.LORE.title, W / 2, H * 0.2, '700 46px ' + FONT, '#e8eef8');
    DC.UI.centerText(ctx, DC.LORE.subtitle, W / 2, H * 0.2 + 30, '600 14px ' + FONT, 'rgba(255,209,102,0.85)');

    ctx.font = '500 14px ' + FONT;
    ctx.textAlign = 'center';
    const lines = DC.LORE.crawl;
    for (let i = 0; i < lines.length; i++) {
      const appear = M.clamp((t - 0.6 - i * 0.45) * 1.6, 0, 1);
      if (appear <= 0) continue;
      ctx.globalAlpha = appear;
      ctx.fillStyle = lines[i] ? 'rgba(210,220,235,0.85)' : ' ';
      ctx.fillText(lines[i], W / 2, H * 0.34 + i * 22);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    if (game.best && game.best.depth) {
      DC.UI.centerText(ctx, 'DEEPEST DESCENT: DEPTH ' + game.best.depth + '  \u00b7  ' + game.best.cls,
        W / 2, H * 0.34 + lines.length * 22 + 26, '600 12px ' + FONT, 'rgba(142,240,192,0.8)');
    }

    const blink = 0.55 + 0.45 * Math.sin(t * 3);
    DC.UI.centerText(ctx, 'CLICK OR PRESS ENTER TO DESCEND', W / 2, H * 0.86,
      '700 15px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  /* ---------------- career select ---------------- */
  DC.UI.classCards = function (game) {
    const W = game.cam.w, H = game.cam.h;
    const n = DC.CLASS_ORDER.length;
    const gap = 22;
    const cw = Math.min(320, (W - gap * (n + 1)) / n);
    const ch = Math.min(430, H * 0.66);
    const totalW = cw * n + gap * (n - 1);
    const x0 = (W - totalW) / 2;
    const y0 = (H - ch) / 2 + 20;
    const out = [];
    for (let i = 0; i < n; i++) out.push({ id: DC.CLASS_ORDER[i], x: x0 + i * (cw + gap), y: y0, w: cw, h: ch });
    return out;
  };

  DC.UI.drawClassSelect = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h;
    ctx.fillStyle = 'rgba(3,4,7,0.9)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'CHOOSE YOUR CAREER', W / 2, H * 0.14, '700 30px ' + FONT, '#e8eef8');
    DC.UI.centerText(ctx, 'Each one goes down the same hole differently.', W / 2, H * 0.14 + 24, '500 12px ' + FONT, 'rgba(255,255,255,0.5)');

    const cards = DC.UI.classCards(game);
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cls = DC.CLASSES[card.id];
      const hot = game.hoverClass === card.id;
      DC.UI.panel(ctx, card.x, card.y, card.w, card.h, hot ? cls.color : 'rgba(255,255,255,0.18)');
      if (hot) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(card.x, card.y, card.w, card.h);
      }
      const px = card.x + 18;
      let y = card.y + 34;
      ctx.font = '700 20px ' + FONT;
      ctx.fillStyle = cls.color;
      ctx.fillText(cls.name, px, y);
      y += 20;
      ctx.font = '600 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const roleLines = DC.UI.wrap(ctx, cls.role, card.w - 98);
      for (let k = 0; k < roleLines.length; k++) {
        ctx.fillText(roleLines[k], px, y);
        if (k < roleLines.length - 1) y += 13;
      }

      // portrait
      ctx.save();
      ctx.translate(card.x + card.w - 44, card.y + 40);
      ctx.fillStyle = cls.robe;
      ctx.beginPath();
      ctx.moveTo(-16, 22); ctx.quadraticCurveTo(-14, -16, 0, -20);
      ctx.quadraticCurveTo(14, -16, 16, 22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = cls.accent;
      ctx.beginPath(); ctx.arc(0, -18, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cls.color;
      ctx.beginPath(); ctx.arc(0, -18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      y += 26;
      const rows = [
        ['HP', cls.hp], ['MP', cls.mp], ['MOVE', cls.speed.toFixed(1) + ' m/s'],
        ['ATTACK', cls.atk + (cls.attackKind === 'melee' ? ' (arc)' : ' (bolt)')],
        ['DEFENCE', cls.def],
      ];
      ctx.font = '600 12px ' + FONT;
      for (let r = 0; r < rows.length; r++) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(rows[r][0], px, y);
        ctx.fillStyle = 'rgba(232,238,248,0.95)';
        ctx.textAlign = 'right';
        ctx.fillText(String(rows[r][1]), card.x + card.w - 18, y);
        ctx.textAlign = 'left';
        y += 19;
      }

      y += 10;
      ctx.font = '700 12px ' + FONT;
      ctx.fillStyle = cls.color;
      ctx.fillText('SPACE \u00b7 ' + cls.ability.name, px, y);
      y += 17;
      ctx.font = '500 11px ' + FONT;
      ctx.fillStyle = 'rgba(210,220,235,0.7)';
      const dl = DC.UI.wrap(ctx, cls.ability.desc, card.w - 36);
      for (let k = 0; k < dl.length; k++) { ctx.fillText(dl[k], px, y); y += 15; }

      y += 8;
      ctx.font = '500 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      const bl = DC.UI.wrap(ctx, cls.blurb, card.w - 36);
      for (let k = 0; k < bl.length; k++) { ctx.fillText(bl[k], px, y); y += 15; }
    }

    const sel = DC.CLASSES[game.hoverClass || 'mage'];
    const introY = cards.length ? cards[0].y + cards[0].h + 34 : H * 0.8;
    ctx.font = '500 12px ' + FONT;
    ctx.textAlign = 'center';
    const intro = DC.UI.wrap(ctx, DC.LORE.classIntros[sel.id], Math.min(760, W - 120));
    for (let i = 0; i < intro.length; i++) {
      ctx.fillStyle = 'rgba(210,220,235,0.62)';
      ctx.fillText(intro[i], W / 2, introY + i * 17);
    }
    ctx.textAlign = 'left';
    DC.UI.centerText(ctx, 'CLICK A CAREER OR PRESS ENTER', W / 2, H - 26, '700 13px ' + FONT, 'rgba(255,255,255,0.7)');
  };

  /* ---------------- lore interstitial ---------------- */
  DC.UI.drawLore = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h;
    ctx.fillStyle = 'rgba(3,4,7,0.92)';
    ctx.fillRect(0, 0, W, H);
    const l = game.loreCard;
    DC.UI.centerText(ctx, 'DEPTH ' + l.depth, W / 2, H * 0.34, '700 22px ' + FONT, 'rgba(255,209,102,0.9)');
    ctx.font = '500 15px ' + FONT;
    ctx.textAlign = 'center';
    const lines = DC.UI.wrap(ctx, l.text, Math.min(720, W - 140));
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.86)';
      ctx.fillText(lines[i], W / 2, H * 0.42 + i * 24);
    }
    ctx.textAlign = 'left';
    const blink = 0.5 + 0.5 * Math.sin(game.time * 3);
    DC.UI.centerText(ctx, 'PRESS ANY KEY TO CONTINUE', W / 2, H * 0.78, '700 12px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  /* ---------------- pause ---------------- */
  DC.UI.drawPause = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h;
    ctx.fillStyle = 'rgba(3,4,7,0.72)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'PAUSED', W / 2, H * 0.42, '700 34px ' + FONT, '#e8eef8');
    DC.UI.centerText(ctx, 'ESC resume \u00b7 M mute ' + (DC.Audio.muted ? '(muted)' : '(audible)') + ' \u00b7 V zoom \u00b7 R abandon run',
      W / 2, H * 0.42 + 28, '500 12px ' + FONT, 'rgba(255,255,255,0.6)');
    const p = game.player;
    DC.UI.centerText(ctx, 'Depth ' + game.world.depth + ' \u00b7 ' + game.stats.kills + ' demons \u00b7 ' + p.gold + ' coin',
      W / 2, H * 0.42 + 56, '600 12px ' + FONT, 'rgba(255,209,102,0.8)');
    DC.UI.centerText(ctx, 'PACK ' + p.inv.length + '/' + p.invSize + '  \u00b7  I opens it \u00b7 the deep waits while you choose',
      W / 2, H * 0.42 + 78, '600 12px ' + FONT, 'rgba(199,155,255,0.7)');
  };

  /* ---------------- death ---------------- */
  DC.UI.epitaph = function (depth) {
    let out = DC.LORE.epitaphs[0].text;
    for (let i = 0; i < DC.LORE.epitaphs.length; i++) {
      if (depth >= DC.LORE.epitaphs[i].min) out = DC.LORE.epitaphs[i].text;
    }
    return out;
  };

  DC.UI.drawDeath = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h;
    ctx.fillStyle = 'rgba(8,2,4,0.9)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'YOU DIED', W / 2, H * 0.26, '700 44px ' + FONT, '#ff5c5c');
    DC.UI.centerText(ctx, game.deathCause + ' found you on depth ' + game.world.depth + '.',
      W / 2, H * 0.26 + 30, '600 14px ' + FONT, 'rgba(255,255,255,0.75)');

    const epi = DC.UI.wrap(ctx, DC.UI.epitaph(game.world.depth), Math.min(680, W - 140));
    ctx.font = '500 14px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < epi.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.8)';
      ctx.fillText(epi[i], W / 2, H * 0.38 + i * 22);
    }
    ctx.textAlign = 'left';

    const s = game.stats;
    const rows = [
      ['DEPTH REACHED', String(game.world.depth)],
      ['DEMONS SLAIN', String(s.kills)],
      ['COIN EARNED', String(s.goldEarned)],
      ['DEEPEST EVER', String(game.best && game.best.depth ? game.best.depth : game.world.depth)],
      ['TIME UNDER', Math.floor(s.time / 60) + 'm ' + (Math.floor(s.time) % 60) + 's'],
    ];
    const bw = 340, bx = W / 2 - bw / 2, by = H * 0.52;
    DC.UI.panel(ctx, bx, by, bw, rows.length * 24 + 18, 'rgba(255,92,92,0.35)');
    ctx.font = '600 12px ' + FONT;
    for (let i = 0; i < rows.length; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(rows[i][0], bx + 16, by + 26 + i * 24);
      ctx.fillStyle = '#e8eef8';
      ctx.textAlign = 'right';
      ctx.fillText(rows[i][1], bx + bw - 16, by + 26 + i * 24);
      ctx.textAlign = 'left';
    }

    const blink = 0.5 + 0.5 * Math.sin(game.time * 3);
    DC.UI.centerText(ctx, 'CLICK OR PRESS ENTER TO DESCEND AGAIN', W / 2, H * 0.88,
      '700 14px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  DC.UI.toast = function (text, color) { if (DC.Game && DC.Game.log) DC.Game.log(text, color); };
})(typeof window !== 'undefined' ? window : globalThis);
