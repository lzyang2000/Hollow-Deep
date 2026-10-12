/* Title, career select, lore interstitials, pause and death screens. All drawn
   on the game canvas so the whole thing stays one file:// page with no DOM UI.
   Every screen is laid out from the viewport, and every menu is a set of
   hit-testable buttons: a list of key names is not usable on a phone. */
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

  DC.UI.hit = function (r, mx, my) {
    return !!r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  };

  /* A menu button. Same shape for the pause list, the title screen and the
     career picker, so a fingertip learns one gesture instead of three. */
  DC.UI.drawButton = function (ctx, b, hot, game) {
    const L = DC.Layout;
    const accent = b.accent || (b.primary ? '#8ef0c0' : 'rgba(255,255,255,0.5)');
    ctx.fillStyle = hot ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = hot ? accent : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = hot ? 2 : 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
    ctx.fillStyle = hot ? accent : 'rgba(255,255,255,0.16)';
    ctx.fillRect(b.x, b.y, 3, b.h);
    ctx.font = '700 ' + L.font(13, 12) + 'px ' + FONT;
    ctx.fillStyle = hot ? '#fff' : 'rgba(232,238,248,0.85)';
    ctx.fillText(b.label, b.x + 14, b.y + b.h / 2 + L.font(5, 4));
    if (b.key) {
      ctx.font = '600 ' + L.font(11, 10) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'right';
      ctx.fillText(b.key, b.x + b.w - 12, b.y + b.h / 2 + L.font(4, 3));
      ctx.textAlign = 'left';
    }
    if (b.note) {
      ctx.font = '500 ' + L.font(10, 9) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(b.note, b.x + b.w - 12, b.y + b.h - 6);
      ctx.textAlign = 'left';
    }
  };

  /* ---------------- title ---------------- */
  DC.UI.titleButtons = function (game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const bh = L.touch ? 46 : 34;
    const gap = 12;
    const bw = Math.min(L.narrow ? 158 : 214, (W - 2 * L.pad - gap) / 2);
    const x0 = (W - (bw * 2 + gap)) / 2;
    /* Anchored to the bottom, not to a fraction of the height: on a phone
       lying on its side 0.84 * 390 leaves the buttons cut in half. */
    const y = H - L.pad - bh;
    return [
      { id: 'descend', label: 'DESCEND', primary: true, x: x0, y: y, w: bw, h: bh },
      { id: 'load', label: 'LOAD A SAVE', accent: '#ffd166', x: x0 + bw + gap, y: y, w: bw, h: bh },
    ];
  };

  DC.UI.drawTitle = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    ctx.fillStyle = 'rgba(3,4,7,0.86)';
    ctx.fillRect(0, 0, W, H);

    const t = game.time;
    const btns = DC.UI.titleButtons(game);
    const best = game.best && game.best.depth;

    /* Nothing here may be clipped, and on a phone held upright both the title
       and the crawl are too wide as authored. So measure the title down until
       it fits, then wrap the crawl to the panel and take a point off the type
       until the whole block fits the band between the subtitle and the
       buttons. The reveal timing stays keyed to the authored line, so wrapping
       a line into two does not give it two beats. */
    let tf = L.font(46, 24);
    ctx.font = '700 ' + tf + 'px ' + FONT;
    while (tf > 15 && ctx.measureText(DC.LORE.title).width > W - 20) tf = Math.max(15, Math.round(tf * 0.9));
    const titleW = ctx.measureText(DC.LORE.title).width;
    const titleY = Math.max(tf + L.pad, H * 0.16);
    DC.UI.centerText(ctx, DC.LORE.title, W / 2, titleY, '700 ' + tf + 'px ' + FONT, '#e8eef8');

    const sf = L.font(14, 11);
    const subY = titleY + sf + L.font(12, 10);
    DC.UI.centerText(ctx, DC.LORE.subtitle, W / 2, subY, '600 ' + sf + 'px ' + FONT, 'rgba(255,209,102,0.85)');

    const hintF = L.font(12, 10);
    const hintY = btns[0].y - hintF - L.font(8, 6);
    const bestF = L.font(12, 10);
    const bestY = hintY - bestF - L.font(10, 8);
    const bottom = (best ? bestY : hintY) - L.font(10, 8);
    const top = subY + L.font(14, 11);

    let cf = L.font(14, 11);
    let rows = [], lh = 0;
    for (;;) {
      ctx.font = '500 ' + cf + 'px ' + FONT;
      rows = [];
      for (let i = 0; i < DC.LORE.crawl.length; i++) {
        const line = DC.LORE.crawl[i];
        if (!line) { rows.push({ text: '', src: i }); continue; }
        const parts = DC.UI.wrap(ctx, line, W - 2 * L.pad);
        for (let j = 0; j < parts.length; j++) rows.push({ text: parts[j], src: i });
      }
      lh = Math.max(cf + 3, Math.round(cf * 1.55));
      if (rows.length * lh <= bottom - top || cf <= 9) break;
      cf = Math.max(9, cf - 1);
    }
    const crawlTop = top + Math.max(0, (bottom - top - rows.length * lh) / 2);
    ctx.textAlign = 'center';
    for (let i = 0; i < rows.length; i++) {
      const y = crawlTop + i * lh;
      if (y > bottom) break;
      const appear = M.clamp((t - 0.6 - rows[i].src * 0.45) * 1.6, 0, 1);
      if (appear <= 0) continue;
      ctx.globalAlpha = appear;
      ctx.fillStyle = rows[i].text ? 'rgba(210,220,235,0.85)' : ' ';
      ctx.fillText(rows[i].text, W / 2, y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    if (best) {
      DC.UI.centerText(ctx, 'DEEPEST DESCENT: DEPTH ' + game.best.depth + '  \u00b7  ' + game.best.cls,
        W / 2, bestY, '600 ' + bestF + 'px ' + FONT, 'rgba(142,240,192,0.8)');
    }

    for (let i = 0; i < btns.length; i++) DC.UI.drawButton(ctx, btns[i], game.titleHover === btns[i].id, game);

    const blink = 0.4 + 0.4 * Math.sin(t * 3);
    DC.UI.centerText(ctx, L.touch ? 'tap to begin' : 'or press ENTER', W / 2, hintY,
      '600 ' + hintF + 'px ' + FONT, 'rgba(255,255,255,' + blink + ')');

    // What the harness needs to know: did the block actually fit, or did the
    // type hit its floor and start dropping lines?
    game.titleBox = {
      cf: cf, rows: rows.length, lh: lh, used: rows.length * lh, band: bottom - top,
      titleW: Math.round(titleW), titleFits: titleW <= W - 20,
      dropped: Math.max(0, rows.length - Math.floor((bottom - top) / lh)),
    };
  };

  /* ---------------- career select ----------------
     Three cards side by side is the desktop layout. On a phone three cards is
     three unreadable slivers, so the narrow layout shows one career at a time
     with arrows -- same information, one thumb. */
  DC.UI.classCards = function (game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    if (L.narrow) {
      const sel = game.hoverClass || DC.CLASS_ORDER[0];
      const cw = Math.min(340, W - 24);
      const y = 84;
      const ch = Math.min(400, H - y - 72);
      return [{ id: sel, x: (W - cw) / 2, y: y, w: cw, h: ch, single: true }];
    }
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

  DC.UI.classNav = function (game) {
    const L = DC.Layout;
    if (!L.narrow) return null;
    const c = DC.UI.classCards(game)[0];
    const s = 48;
    const bh = L.touch ? 46 : 34;
    return {
      prev: { x: 6, y: c.y + c.h / 2 - s / 2, w: s, h: s },
      next: { x: game.cam.w - 6 - s, y: c.y + c.h / 2 - s / 2, w: s, h: s },
      choose: { x: c.x, y: c.y + c.h + 10, w: c.w, h: bh, label: 'DESCEND AS THE ' + DC.CLASSES[game.hoverClass || 'mage'].name.toUpperCase(), primary: true },
    };
  };

  function drawPortrait(ctx, cls, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = cls.robe;
    ctx.beginPath();
    ctx.moveTo(-16, 22); ctx.quadraticCurveTo(-14, -16, 0, -20);
    ctx.quadraticCurveTo(14, -16, 16, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cls.accent;
    ctx.beginPath(); ctx.arc(0, -18, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cls.color;
    ctx.beginPath(); ctx.arc(0, -18, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  DC.UI.drawClassSelect = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const narrow = L.narrow;
    ctx.fillStyle = 'rgba(3,4,7,0.9)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'CHOOSE YOUR CAREER', W / 2, narrow ? 34 : H * 0.14, '700 ' + L.font(30, 20) + 'px ' + FONT, '#e8eef8');
    if (!narrow) {
      DC.UI.centerText(ctx, 'Each one goes down the same hole differently.', W / 2, H * 0.14 + 24, '500 12px ' + FONT, 'rgba(255,255,255,0.5)');
    }

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
      ctx.font = '700 ' + L.font(20, 16) + 'px ' + FONT;
      ctx.fillStyle = cls.color;
      ctx.fillText(cls.name, px, y);
      y += 20;
      ctx.font = '600 ' + L.font(11, 10) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      const roleLines = DC.UI.wrap(ctx, cls.role, card.w - (narrow ? 36 : 98));
      for (let k = 0; k < roleLines.length; k++) {
        ctx.fillText(roleLines[k], px, y);
        if (k < roleLines.length - 1) y += 13;
      }

      if (!narrow) drawPortrait(ctx, cls, card.x + card.w - 44, card.y + 40);

      y += 26;
      const rows = [
        ['HP', cls.hp], ['MP', cls.mp], ['MOVE', cls.speed.toFixed(1) + ' m/s'],
        ['ATTACK', cls.atk + (cls.attackKind === 'melee' ? ' (arc)' : ' (bolt)')],
        ['DEFENCE', cls.def],
      ];
      ctx.font = '600 ' + L.font(12, 11) + 'px ' + FONT;
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
      ctx.font = '700 ' + L.font(12, 11) + 'px ' + FONT;
      ctx.fillStyle = cls.color;
      ctx.fillText((narrow ? '' : 'SPACE \u00b7 ') + cls.ability.name, px, y);
      y += 17;
      ctx.font = '500 ' + L.font(11, 10) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(210,220,235,0.7)';
      const dl = DC.UI.wrap(ctx, cls.ability.desc, card.w - 36);
      const maxDesc = narrow ? 4 : dl.length;
      for (let k = 0; k < Math.min(maxDesc, dl.length); k++) { ctx.fillText(dl[k], px, y); y += 15; }

      if (!narrow) {
        y += 8;
        ctx.font = '500 11px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        const bl = DC.UI.wrap(ctx, cls.blurb, card.w - 36);
        for (let k = 0; k < bl.length; k++) { ctx.fillText(bl[k], px, y); y += 15; }
      }
    }

    const nav = DC.UI.classNav(game);
    if (nav) {
      const sel = DC.CLASSES[game.hoverClass || 'mage'];
      ctx.font = '700 ' + L.font(16, 13) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('\u25c0', nav.prev.x + 14, nav.prev.y + nav.prev.h / 2 + 6);
      ctx.textAlign = 'right';
      ctx.fillText('\u25b6', nav.next.x + nav.next.w - 14, nav.next.y + nav.next.h / 2 + 6);
      ctx.textAlign = 'left';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(nav.prev.x + 0.5, nav.prev.y + 0.5, nav.prev.w - 1, nav.prev.h - 1);
      ctx.strokeRect(nav.next.x + 0.5, nav.next.y + 0.5, nav.next.w - 1, nav.next.h - 1);
      const dots = DC.CLASS_ORDER.length;
      for (let i = 0; i < dots; i++) {
        const on = DC.CLASS_ORDER[i] === sel.id;
        ctx.beginPath();
        ctx.arc(W / 2 + (i - (dots - 1) / 2) * 16, nav.prev.y - 14, on ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = on ? sel.color : 'rgba(255,255,255,0.25)';
        ctx.fill();
      }
      DC.UI.drawButton(ctx, nav.choose, game.classHover === 'choose', game);
    } else {
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
    }
  };

  /* ---------------- lore interstitial ---------------- */
  DC.UI.drawLore = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    ctx.fillStyle = 'rgba(3,4,7,0.92)';
    ctx.fillRect(0, 0, W, H);
    const l = game.loreCard;
    DC.UI.centerText(ctx, 'DEPTH ' + l.depth, W / 2, H * 0.3, '700 ' + L.font(22, 17) + 'px ' + FONT, 'rgba(255,209,102,0.9)');
    ctx.font = '500 ' + L.font(15, 12) + 'px ' + FONT;
    ctx.textAlign = 'center';
    const lines = DC.UI.wrap(ctx, l.text, Math.min(720, W - 60));
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.86)';
      ctx.fillText(lines[i], W / 2, H * 0.38 + i * L.font(24, 18));
    }
    ctx.textAlign = 'left';
    const blink = 0.5 + 0.5 * Math.sin(game.time * 3);
    DC.UI.centerText(ctx, L.touch ? 'TAP TO CONTINUE' : 'PRESS ANY KEY TO CONTINUE', W / 2, H * 0.8,
      '700 ' + L.font(12, 11) + 'px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  /* ---------------- pause ----------------
     The pause screen is where a run is carried out of the deep and back in, so
     it is a menu rather than a list of key names. */
  DC.UI.pauseMenu = function (game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const items = [
      { id: 'resume', label: 'Back to the dark', key: 'ESC', primary: true },
      { id: 'pack', label: 'Open the pack', key: 'I', note: game.player.inv.length + '/' + game.player.invSize },
      { id: 'save', label: 'Carry this run out (save file)', key: 'S' },
      { id: 'load', label: 'Take up a saved run (load file)', key: 'L' },
      { id: 'mute', label: DC.Audio.muted ? 'Sound on' : 'Sound off', key: 'M' },
      { id: 'abandon', label: 'Abandon this run', key: 'R', accent: '#ff5c5c' },
    ];
    const bw = Math.min(L.narrow ? 330 : 420, W - 28);
    const gap = 7;
    const bh = M.clamp((H - 124) / items.length - gap, 26, L.touch ? 46 : 34);
    const blockH = items.length * (bh + gap) - gap;
    const top = M.clamp((H - blockH) / 2 + 20, 104, Math.max(104, H - blockH - 14));
    const x = (W - bw) / 2;
    const rows = [];
    for (let i = 0; i < items.length; i++) {
      rows.push({ id: items[i].id, label: items[i].label, key: items[i].key, note: items[i].note, accent: items[i].accent, primary: items[i].primary, x: x, y: top + i * (bh + gap), w: bw, h: bh });
    }
    return rows;
  };

  DC.UI.drawPause = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    ctx.fillStyle = 'rgba(3,4,7,0.78)';
    ctx.fillRect(0, 0, W, H);
    const rows = DC.UI.pauseMenu(game);
    const top = rows[0].y;
    DC.UI.centerText(ctx, 'PAUSED', W / 2, top - L.font(58, 40), '700 ' + L.font(34, 24) + 'px ' + FONT, '#e8eef8');
    const p = game.player;
    DC.UI.centerText(ctx, 'Depth ' + game.world.depth + ' \u00b7 ' + game.stats.kills + ' demons \u00b7 ' + p.gold + ' coin',
      W / 2, top - L.font(34, 24), '600 ' + L.font(12, 11) + 'px ' + FONT, 'rgba(255,209,102,0.8)');
    DC.UI.centerText(ctx, 'The deep waits while you choose.', W / 2, top - L.font(16, 12),
      '500 ' + L.font(11, 10) + 'px ' + FONT, 'rgba(210,220,235,0.5)');

    for (let i = 0; i < rows.length; i++) DC.UI.drawButton(ctx, rows[i], game.pauseHover === rows[i].id, game);
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
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    ctx.fillStyle = 'rgba(8,2,4,0.9)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'YOU DIED', W / 2, H * 0.18, '700 ' + L.font(44, 28) + 'px ' + FONT, '#ff5c5c');
    DC.UI.centerText(ctx, game.deathCause + ' found you on depth ' + game.world.depth + '.',
      W / 2, H * 0.18 + L.font(30, 22), '600 ' + L.font(14, 11) + 'px ' + FONT, 'rgba(255,255,255,0.75)');

    const epi = DC.UI.wrap(ctx, DC.UI.epitaph(game.world.depth), Math.min(680, W - 60));
    ctx.font = '500 ' + L.font(14, 11) + 'px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < epi.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.8)';
      ctx.fillText(epi[i], W / 2, H * 0.28 + i * L.font(22, 16));
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
    const bw = Math.min(340, W - 40), bx = W / 2 - bw / 2, by = H * 0.46;
    const rowH = L.font(24, 19);
    DC.UI.panel(ctx, bx, by, bw, rows.length * rowH + 18, 'rgba(255,92,92,0.35)');
    ctx.font = '600 ' + L.font(12, 11) + 'px ' + FONT;
    for (let i = 0; i < rows.length; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(rows[i][0], bx + 16, by + 26 + i * rowH);
      ctx.fillStyle = '#e8eef8';
      ctx.textAlign = 'right';
      ctx.fillText(rows[i][1], bx + bw - 16, by + 26 + i * rowH);
      ctx.textAlign = 'left';
    }

    const blink = 0.5 + 0.5 * Math.sin(game.time * 3);
    DC.UI.centerText(ctx, L.touch ? 'TAP TO DESCEND AGAIN' : 'CLICK OR PRESS ENTER TO DESCEND AGAIN', W / 2, H * 0.88,
      '700 ' + L.font(14, 12) + 'px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  DC.UI.toast = function (text, color) { if (DC.Game && DC.Game.log) DC.Game.log(text, color); };
})(typeof window !== 'undefined' ? window : globalThis);
