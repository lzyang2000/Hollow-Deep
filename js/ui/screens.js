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
     Two cards side by side is the desktop layout, and with only two they get
     the room the third one used to take. On a phone even two is two
     unreadable slivers, so the narrow layout shows one career at a time with
     arrows -- same information, one thumb. */
  DC.UI.classCards = function (game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    if (L.narrow) {
      const sel = game.hoverClass || DC.CLASS_ORDER[0];
      const cw = Math.min(340, W - 24);
      const y = 84;
      // Four stat rows, an ability and two lines of it: 336 px is the whole
      // card with room to spare. The old 400 left a third of a phone screen
      // of empty panel under the last line.
      const ch = Math.min(336, H - y - 72);
      return [{ id: sel, x: (W - cw) / 2, y: y, w: cw, h: ch, single: true }];
    }
    const n = DC.CLASS_ORDER.length;
    const gap = 22;
    // Two careers means two wider cards, not two narrow ones stranded in the
    // middle of the screen with a gap where the Swordsman used to be.
    const cw = Math.min(n <= 2 ? 372 : 320, (W - gap * (n + 1)) / n);
    // ...and a shorter one, because two careers fill less than three and a
    // card that runs 130 px past its own last line reads as a mistake.
    const ch = Math.min(n <= 2 ? 344 : 430, H * 0.66);
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
      choose: { x: c.x, y: c.y + c.h + 22, w: c.w, h: bh, label: 'DESCEND AS THE ' + DC.CLASSES[game.hoverClass || 'mage'].name.toUpperCase(), primary: true },
    };
  };

  /* The card shows the body you will actually play, not a colour swatch with
     a hat on it: the same renderer the game uses, at the same proportions,
     holding the weapon you will actually swing. It idles rather than freezing,
     because a mage whose rod never stops flickering and a knight whose crest
     keeps moving are the two things you will read most in a fight. */
  function drawPortrait(ctx, cls, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    DC.Render.careerBody(ctx, cls, 21, { t: t, facing: -0.45, aim: 0.12 });
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
      const roleLines = DC.UI.wrap(ctx, cls.role, card.w - 112);
      for (let k = 0; k < roleLines.length; k++) {
        ctx.fillText(roleLines[k], px, y);
        if (k < roleLines.length - 1) y += 13;
      }

      drawPortrait(ctx, cls, card.x + card.w - 58, card.y + 48, game.time || 0);

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
      // The dots go in the gap between the card and CHOOSE, not at the arrow
      // row's height: mid-card is where the stat rows are, and a dot landing
      // on "MP 130" is unreadable whatever the career count.
      const card = DC.UI.classCards(game)[0];
      const dotY = card.y + card.h + 9;
      const dots = DC.CLASS_ORDER.length;
      for (let i = 0; i < dots; i++) {
        const on = DC.CLASS_ORDER[i] === sel.id;
        ctx.beginPath();
        ctx.arc(W / 2 + (i - (dots - 1) / 2) * 16, dotY, on ? 4 : 3, 0, Math.PI * 2);
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
    let lf = L.font(22, 17);
    const lname = l.name || ('DEPTH ' + l.depth);
    ctx.font = '700 ' + lf + 'px ' + FONT;
    while (lf > 12 && ctx.measureText(lname).width > W - 40) { lf -= 1; ctx.font = '700 ' + lf + 'px ' + FONT; }
    DC.UI.centerText(ctx, lname, W / 2, H * 0.3, '700 ' + lf + 'px ' + FONT, 'rgba(255,209,102,0.9)');
    DC.UI.centerText(ctx, 'DEPTH ' + l.depth + (l.band ? '  \u00b7  ' + l.band : ''), W / 2, H * 0.3 + L.font(22, 17),
      '600 ' + L.font(11, 10) + 'px ' + FONT, 'rgba(210,220,235,0.5)');
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

  /* ---------------- the ending ----------------
     Nine seals is the shape of the story, so putting the ninth one out gets a
     cinematic: six cards, each with a scene drawn from the same procedural kit
     as everything else here. No image files, no video, no new dependencies --
     the art is rectangles, arcs and gradients, and it animates off game.time
     so it keeps moving while the floor is frozen behind it. */
  DC.UI.endingArt = function (ctx, W, H, key, t) {
    const h2 = DC.hash2;
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (key === 'fall' || key === 'crown') { g.addColorStop(0, '#0a1220'); g.addColorStop(1, '#2a1108'); }
    else if (key === 'throat') { g.addColorStop(0, '#120506'); g.addColorStop(1, '#04060a'); }
    else { g.addColorStop(0, '#050a12'); g.addColorStop(1, '#0b0a12'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (key === 'fall') {
      /* Aetherfall, on the way down: three bands of towers sliding off the
         top of the frame, every window still lit, because the city did not
         know yet. */
      const drift = (t * 7) % 90;
      for (let band = 0; band < 3; band++) {
        const base = H * (0.42 + band * 0.24) + drift;
        const a = [0.95, 0.62, 0.34][band];
        const n = 8 + band * 4;
        for (let i = 0; i < n; i++) {
          const r1 = h2(i, band, 7717), r2 = h2(i + 31, band, 991);
          const x = (i + r1 * 0.5) * (W / n);
          const w = (W / n) * (0.45 + r2 * 0.4);
          const hh = H * (0.2 + r1 * 0.34);
          ctx.fillStyle = 'rgba(7,9,15,' + a + ')';
          ctx.fillRect(x, base - hh, w, hh);
          for (let k = 0; k < 4; k++) {
            const r3 = h2(i * 7 + k, band, 1234);
            if (r3 < 0.5) continue;
            const fl = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7 + k * 2.1);
            ctx.fillStyle = 'rgba(255,' + (150 + Math.floor(70 * fl)) + ',84,' + ((0.2 + 0.5 * fl) * a).toFixed(3) + ')';
            ctx.fillRect(x + w * (0.18 + 0.6 * r3), base - hh + hh * (0.12 + 0.72 * h2(k, i, 5)), 2.5, 3.5);
          }
        }
      }
      for (let i = 0; i < 40; i++) {
        const r1 = h2(i, 0, 4242);
        const y = (H + 40) - ((t * (26 + r1 * 60) + r1 * H * 3) % (H + 60));
        ctx.fillStyle = 'rgba(255,170,90,' + (0.1 + 0.35 * h2(i, 1, 7)).toFixed(3) + ')';
        ctx.fillRect(W * h2(i, 2, 13), y, 1.5, 1.5 + 3 * h2(i, 3, 17));
      }
    } else if (key === 'seals') {
      /* Nine rings, in a row you can count, eight of them dark. The ninth is
         still burning, because it is in your hand. */
      const n = DC.LORE.sealCount;
      const padX = W * 0.09;
      const r = Math.min(W * 0.042, H * 0.15);
      for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) : 0.5;
        const x = padX + k * (W - padX * 2);
        const y = H * 0.68 - Math.sin(k * Math.PI) * H * 0.22;
        const last = i === n - 1;
        const pulse = last ? 0.6 + 0.4 * Math.sin(t * 2.4) : 0;
        const rr = last ? r * (1.25 + 0.1 * pulse) : r;
        if (last) {
          const gg = ctx.createRadialGradient(x, y, 1, x, y, rr * 3.4);
          gg.addColorStop(0, 'rgba(255,209,102,' + (0.34 + 0.24 * pulse).toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(255,209,102,0)');
          ctx.fillStyle = gg; ctx.fillRect(x - rr * 3.4, y - rr * 3.4, rr * 6.8, rr * 6.8);
        }
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = last ? 'rgba(255,209,102,' + (0.55 + 0.45 * pulse).toFixed(3) + ')' : 'rgba(150,170,200,0.26)';
        ctx.lineWidth = last ? 2.5 : 1.5; ctx.stroke();
        if (!last) {
          ctx.beginPath();
          ctx.moveTo(x - rr * 0.55, y - rr * 0.55); ctx.lineTo(x + rr * 0.55, y + rr * 0.55);
          ctx.strokeStyle = 'rgba(120,140,170,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        } else {
          // the taper inside the ring: a wick, a flame, and a hand under it
          ctx.fillStyle = 'rgba(255,226,150,' + (0.7 + 0.3 * pulse).toFixed(3) + ')';
          ctx.beginPath(); ctx.ellipse(x, y - rr * 0.1, rr * 0.22, rr * 0.42, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,209,102,0.6)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - rr * 0.5, y + rr * 0.75); ctx.lineTo(x + rr * 0.5, y + rr * 0.75); ctx.stroke();
        }
      }
      // the eight dark ones leave a cold mark on the floor under them
      ctx.strokeStyle = 'rgba(120,140,170,0.1)'; ctx.lineWidth = 1;
      for (let i = 0; i < n - 1; i++) {
        const k = i / (n - 1);
        const x = padX + k * (W - padX * 2);
        ctx.beginPath();
        ctx.ellipse(x, H * 0.86, r * 1.1, r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (key === 'crown') {
      /* An empty throne and a crown that is no longer a circle. */
      const cx = W / 2, base = H * 0.8;
      const r = Math.min(W * 0.16, H * 0.3);
      ctx.fillStyle = 'rgba(13,16,23,0.95)';
      ctx.fillRect(cx - r * 1.05, base - r * 2.5, r * 2.1, r * 2.5);          // back
      ctx.fillRect(cx - r * 1.35, base - r * 0.2, r * 2.7, r * 0.42);        // seat
      ctx.fillStyle = 'rgba(22,26,36,0.95)';
      ctx.fillRect(cx - r * 1.5, base + r * 0.2, r * 3, r * 0.22);           // step
      const y0 = base - r * 0.62;
      ctx.strokeStyle = 'rgba(255,209,102,0.8)'; ctx.lineWidth = 2.5;
      // the band, with the points going up off it; the fourth point is gone
      ctx.beginPath();
      ctx.moveTo(cx - r, y0);
      for (let i = 0; i < 5; i++) {
        const xa = cx - r + (i + 0.5) * (2 * r / 5);
        const xb = cx - r + (i + 1) * (2 * r / 5);
        if (i === 3) continue;
        ctx.lineTo(xa, y0 - r * 0.5);
        ctx.lineTo(xb, y0);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 1.02, y0);
      ctx.lineTo(cx - r * 0.94, y0 + r * 0.34);
      ctx.lineTo(cx + r * 0.94, y0 + r * 0.34);
      ctx.lineTo(cx + r * 1.02, y0);
      ctx.stroke();
      // where the point came off
      ctx.strokeStyle = 'rgba(255,209,102,0.26)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - r + 3 * (2 * r / 5), y0);
      ctx.lineTo(cx - r + 3.35 * (2 * r / 5), y0 - r * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r + 4 * (2 * r / 5), y0 - r * 0.02);
      ctx.lineTo(cx - r + 3.8 * (2 * r / 5), y0 - r * 0.3);
      ctx.stroke();
      // jewels, still holding a little light
      for (let i = 0; i < 3; i++) {
        const x = cx + (i - 1) * r * 0.55;
        const fl = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1);
        ctx.fillStyle = 'rgba(142,240,192,' + (0.18 + 0.3 * fl).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y0 + r * 0.17, r * 0.07, 0, Math.PI * 2); ctx.fill();
      }
      for (let i = 0; i < 26; i++) {
        const r1 = h2(i, 5, 808);
        const y = ((t * (6 + r1 * 14) + r1 * H) % H);
        ctx.fillStyle = 'rgba(220,225,235,' + (0.05 + 0.12 * h2(i, 6, 3)).toFixed(3) + ')';
        ctx.fillRect(W * h2(i, 7, 29), y, 1.5, 1.5);
      }
    } else if (key === 'tapers') {
      /* The street that grew down: two walls in perspective, every window a
         taper, roots across the flagstones. */
      const cx = W / 2, horizon = H * 0.34;
      for (let side = -1; side <= 1; side += 2) {
        ctx.fillStyle = 'rgba(24,28,38,0.95)';
        ctx.beginPath();
        ctx.moveTo(cx + side * W * 0.06, horizon);
        ctx.lineTo(cx + side * W * 0.5, H);
        ctx.lineTo(cx + side * W * 0.5, horizon * 0.2);
        ctx.lineTo(cx + side * W * 0.06, horizon * 0.55);
        ctx.closePath(); ctx.fill();
        for (let i = 0; i < 9; i++) {
          const k = (i + 0.5) / 9;
          const x = cx + side * (W * 0.09 + k * W * 0.36);
          const y = horizon + k * k * (H - horizon) * 0.9;
          const s = 3 + k * 12;
          const fl = 0.55 + 0.45 * Math.sin(t * 1.9 + i * 1.3 + (side > 0 ? 0.7 : 0));
          const gg = ctx.createRadialGradient(x, y, 0.5, x, y, s * 2.6);
          gg.addColorStop(0, 'rgba(255,190,110,' + (0.3 + 0.3 * fl).toFixed(3) + ')');
          gg.addColorStop(1, 'rgba(255,190,110,0)');
          ctx.fillStyle = gg; ctx.fillRect(x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
          ctx.fillStyle = 'rgba(255,214,150,' + (0.5 + 0.4 * fl).toFixed(3) + ')';
          ctx.fillRect(x - s * 0.16, y - s * 0.5, Math.max(1.5, s * 0.32), s);
        }
      }
      ctx.strokeStyle = 'rgba(120,140,160,0.14)'; ctx.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const y = H * (0.62 + i * 0.06);
        ctx.beginPath(); ctx.moveTo(cx - W * 0.2 - i * W * 0.03, y);
        ctx.quadraticCurveTo(cx, y + 8 * Math.sin(i * 1.4), cx + W * 0.2 + i * W * 0.03, y); ctx.stroke();
      }
    } else if (key === 'throat') {
      /* The deep as an actual throat: rings all the way down, and one small
         light going the wrong way. */
      const cx = W / 2, cy = H * 0.52;
      for (let i = 0; i < 11; i++) {
        const k = i / 10;
        const rx = W * (0.5 - k * 0.42), ry = H * (0.46 - k * 0.38);
        const wob = 1 + 0.05 * Math.sin(t * 1.3 + i * 0.8);
        ctx.beginPath(); ctx.ellipse(cx, cy + k * H * 0.06, rx * wob, ry * wob, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(' + (150 - i * 8) + ',' + (70 - i * 4) + ',' + (70 - i * 4) + ',' + (0.34 - k * 0.2).toFixed(3) + ')';
        ctx.lineWidth = 1.5; ctx.stroke();
      }
      const fall = (t * 0.35) % 1;
      const fr = 1 - fall;
      ctx.fillStyle = 'rgba(255,209,102,' + (0.25 + 0.5 * fr).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(cx, cy + fall * H * 0.06, Math.max(1.2, W * 0.02 * fr), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(2,3,5,0.9)';
      ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.06, W * 0.05, H * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      /* 'stair': the way down, seen from the top. A square of surface light at
         the top of the shaft and a taper somewhere near the bottom. */
      const cx = W / 2, cy = H * 0.46;
      const steps = 15;
      const turn = (Math.PI * 2) / steps;
      const spin = t * 0.1;
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        const a = i * turn + spin;
        const rOut = Math.min(W * 0.46, H * 0.92) * (1 - k * 0.62);
        const rIn = rOut * 0.42;
        const oy = cy + k * H * 0.14;
        ctx.beginPath();
        ctx.arc(cx, oy, rOut, a, a + turn * 0.9);
        ctx.arc(cx, oy, rIn, a + turn * 0.9, a, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + (26 + i * 5) + ',' + (32 + i * 6) + ',' + (44 + i * 8) + ',' + (0.92 - k * 0.3).toFixed(3) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,170,200,' + (0.14 - k * 0.08).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // the newel in the middle, and the taper at the bottom of the shaft
      ctx.fillStyle = 'rgba(10,12,18,0.9)';
      ctx.beginPath(); ctx.ellipse(cx, cy + H * 0.14, Math.min(W, H) * 0.05, Math.min(W, H) * 0.03, 0, 0, Math.PI * 2); ctx.fill();
      // The shaft it drops down: two walls, and dust falling faster than you.
      ctx.strokeStyle = 'rgba(120,140,170,0.16)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        ctx.beginPath();
        ctx.moveTo(cx + (W * 0.42 - k * W * 0.3) * Math.cos(k * 2.2), cy - H * 0.3 + k * H * 0.6);
        ctx.lineTo(cx + (W * 0.42 - k * W * 0.3) * Math.cos(k * 2.2 + 0.3), cy - H * 0.24 + k * H * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - (W * 0.42 - k * W * 0.3) * Math.cos(k * 2.2), cy - H * 0.3 + k * H * 0.6);
        ctx.lineTo(cx - (W * 0.42 - k * W * 0.3) * Math.cos(k * 2.2 + 0.3), cy - H * 0.24 + k * H * 0.6);
        ctx.stroke();
      }
      for (let i = 0; i < 18; i++) {
        const r1 = h2(i, 11, 606);
        const y = ((t * (18 + r1 * 40) + r1 * H * 2) % (H * 1.2));
        ctx.fillStyle = 'rgba(255,209,102,' + (0.06 + 0.2 * h2(i, 12, 91)).toFixed(3) + ')';
        ctx.fillRect(cx + (h2(i, 13, 7) - 0.5) * W * 0.7, y, 1.5, 1.5 + 3 * h2(i, 14, 19));
      }
      const gl = ctx.createRadialGradient(cx, cy + H * 0.1, 1, cx, cy + H * 0.1, Math.min(W, H) * 0.3);
      const fl = 0.6 + 0.4 * Math.sin(t * 2.6);
      gl.addColorStop(0, 'rgba(255,209,102,' + (0.3 + 0.2 * fl).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(255,209,102,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(190,215,255,0.16)';
      ctx.fillRect(cx - W * 0.11, 0, W * 0.22, H * 0.09);
    }
    ctx.restore();
  };

  /* One layout for the choice screen, shared by the drawing and by the
     hit-testing, so a button can never be drawn somewhere the click does not
     agree with. */
  DC.UI.endingChoiceLayout = function (game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const artH = M.clamp(H * 0.24, 60, 190);
    const titleY = artH + L.font(40, 30);
    ctxFontWrap(game, DC.LORE.endingChoice, Math.min(680, W - 56));
    const lh = L.font(21, 17);
    const lines = game.__endingLines;
    const textY = titleY + L.font(26, 20);
    const items = [
      { id: 'deeper', label: 'Go back down into the echoes', key: 'ENTER', primary: true, note: 'depth ' + (game.depth + 1) + ' and below' },
      { id: 'retire', label: 'Climb out with the report', key: 'R', accent: '#ffd166' },
    ];
    const bw = Math.min(L.narrow ? 330 : 430, W - 28);
    const gap = 9;
    const room = H - (textY + lines.length * lh + 26);
    const bh = M.clamp(room / items.length - gap, 28, L.touch ? 50 : 38);
    const blockH = items.length * (bh + gap) - gap;
    const top = M.clamp(textY + lines.length * lh + 26, 40, Math.max(40, H - blockH - 12));
    const x = (W - bw) / 2;
    const rows = [];
    for (let i = 0; i < items.length; i++) {
      rows.push({ id: items[i].id, label: items[i].label, key: items[i].key, note: items[i].note,
        accent: items[i].accent, primary: items[i].primary, x: x, y: top + i * (bh + gap), w: bw, h: bh });
    }
    return { artH: artH, titleY: titleY, textY: textY, lh: lh, lines: lines, rows: rows };
  };

  function ctxFontWrap(game, text, maxW) {
    const L = DC.Layout;
    game.ctx.font = '500 ' + L.font(14, 12) + 'px ' + FONT;
    game.__endingLines = DC.UI.wrap(game.ctx, text, maxW);
  }

  DC.UI.endingButtons = function (game) {
    return DC.UI.endingChoiceLayout(game).rows;
  };

  DC.UI.drawEnding = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const e = game.ending || { i: 0, start: game.time };
    const card = DC.LORE.ending[M.clamp(e.i, 0, DC.LORE.ending.length - 1)];
    ctx.fillStyle = 'rgba(3,4,7,0.96)';
    ctx.fillRect(0, 0, W, H);
    const artH = M.clamp(H * 0.42, 80, 330);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, artH); ctx.clip();
    DC.UI.endingArt(ctx, W, artH, card.art, game.time);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, artH - 40, 0, artH);
    fade.addColorStop(0, 'rgba(3,4,7,0)'); fade.addColorStop(1, 'rgba(3,4,7,0.96)');
    ctx.fillStyle = fade; ctx.fillRect(0, artH - 40, W, 40);
    ctx.strokeStyle = 'rgba(255,209,102,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, artH + 0.5); ctx.lineTo(W, artH + 0.5); ctx.stroke();

    const a = M.clamp((game.time - (e.start || 0)) / 0.55, 0, 1);
    let tf = L.font(26, 19);
    ctx.font = '700 ' + tf + 'px ' + FONT;
    while (tf > 12 && ctx.measureText(card.title).width > W - 40) { tf -= 1; ctx.font = '700 ' + tf + 'px ' + FONT; }
    ctx.globalAlpha = a;
    DC.UI.centerText(ctx, card.title, W / 2, artH + L.font(42, 32), '700 ' + tf + 'px ' + FONT, 'rgba(255,209,102,0.92)');
    ctx.font = '500 ' + L.font(15, 12) + 'px ' + FONT;
    ctx.textAlign = 'center';
    const lines = DC.UI.wrap(ctx, card.text, Math.min(700, W - 56));
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.88)';
      ctx.fillText(lines[i], W / 2, artH + L.font(72, 54) + i * L.font(24, 18));
    }
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;

    const n = DC.LORE.ending.length;
    const dotY = H - L.font(52, 40);
    for (let i = 0; i < n; i++) {
      const on = i === e.i;
      ctx.beginPath();
      ctx.arc(W / 2 + (i - (n - 1) / 2) * 15, dotY, on ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = on ? 'rgba(255,209,102,0.9)' : 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
    const blink = 0.5 + 0.5 * Math.sin(game.time * 3);
    DC.UI.centerText(ctx, e.i + 1 >= n ? (L.touch ? 'TAP FOR THE LAST DOOR' : 'PRESS ANY KEY FOR THE LAST DOOR')
      : (L.touch ? 'TAP TO CONTINUE' : 'PRESS ANY KEY TO CONTINUE'),
      W / 2, H - L.font(24, 20), '700 ' + L.font(12, 11) + 'px ' + FONT, 'rgba(255,255,255,' + blink + ')');
  };

  DC.UI.drawEndingChoice = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    const lay = DC.UI.endingChoiceLayout(game);
    ctx.fillStyle = 'rgba(3,4,7,0.96)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, lay.artH); ctx.clip();
    DC.UI.endingArt(ctx, W, lay.artH, 'stair', game.time);
    ctx.restore();
    DC.UI.centerText(ctx, 'NINE SEALS OUT', W / 2, lay.titleY, '700 ' + L.font(30, 22) + 'px ' + FONT, '#8ef0c0');
    ctx.font = '500 ' + L.font(14, 12) + 'px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < lay.lines.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.82)';
      ctx.fillText(lay.lines[i], W / 2, lay.textY + i * lay.lh);
    }
    ctx.textAlign = 'left';
    for (let i = 0; i < lay.rows.length; i++) DC.UI.drawButton(ctx, lay.rows[i], game.endingHover === lay.rows[i].id, game);
  };

  DC.UI.drawRetired = function (ctx, game) {
    const W = game.cam.w, H = game.cam.h, L = DC.Layout;
    ctx.fillStyle = 'rgba(4,9,8,0.92)';
    ctx.fillRect(0, 0, W, H);
    DC.UI.centerText(ctx, 'YOU CAME BACK UP', W / 2, H * 0.16, '700 ' + L.font(40, 26) + 'px ' + FONT, '#8ef0c0');
    DC.UI.centerText(ctx, 'Nine seals out. Depth ' + game.world.depth + ' and no further down.',
      W / 2, H * 0.16 + L.font(28, 21), '600 ' + L.font(13, 11) + 'px ' + FONT, 'rgba(255,209,102,0.8)');

    const lines = DC.UI.wrap(ctx, DC.LORE.retireLine, Math.min(680, W - 60));
    ctx.font = '500 ' + L.font(14, 11) + 'px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillStyle = 'rgba(222,230,242,0.82)';
      ctx.fillText(lines[i], W / 2, H * 0.26 + i * L.font(21, 16));
    }
    ctx.textAlign = 'left';

    const s = game.stats;
    const rows = [
      ['DEPTH REACHED', String(game.world.depth)],
      ['SEALS PUT OUT', DC.LORE.sealCount + ' of ' + DC.LORE.sealCount],
      ['DEMONS SLAIN', String(s.kills)],
      ['COIN EARNED', String(s.goldEarned)],
      ['DEEPEST EVER', String(game.best && game.best.depth ? game.best.depth : game.world.depth)],
      ['TIME UNDER', Math.floor(s.time / 60) + 'm ' + (Math.floor(s.time) % 60) + 's'],
    ];
    const bw = Math.min(340, W - 40), bx = W / 2 - bw / 2, by = H * 0.46;
    const rowH = L.font(24, 19);
    DC.UI.panel(ctx, bx, by, bw, rows.length * rowH + 18, 'rgba(142,240,192,0.4)');
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
    DC.UI.centerText(ctx, L.touch ? 'TAP TO GO DOWN AGAIN' : 'CLICK OR PRESS ENTER TO GO DOWN AGAIN', W / 2, H * 0.88,
      '700 ' + L.font(14, 12) + 'px ' + FONT, 'rgba(255,255,255,' + blink + ')');
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
      { id: 'mute', label: DC.Audio.muted ? 'Sound on' : 'Sound off', key: 'H' },
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
    const pf = L.font(12, 11);
    const where = (game.world.name || 'Depth ' + game.world.depth) + '  \u00b7  DEPTH ' + game.world.depth;
    ctx.font = '600 ' + pf + 'px ' + FONT;
    let pw = pf;
    while (pw > 9 && ctx.measureText(where).width > W - 40) { pw -= 1; ctx.font = '600 ' + pw + 'px ' + FONT; }
    DC.UI.centerText(ctx, where, W / 2, top - L.font(34, 24), '600 ' + pw + 'px ' + FONT, 'rgba(255,209,102,0.8)');
    DC.UI.centerText(ctx, game.stats.kills + ' demons  \u00b7  ' + p.gold + ' coin  \u00b7  the deep waits',
      W / 2, top - L.font(16, 12), '500 ' + L.font(11, 10) + 'px ' + FONT, 'rgba(210,220,235,0.5)');

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
      ['LAST FLOOR', String(game.world.name || '\u2014')],
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
