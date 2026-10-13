/* Minimap: a 45 m square of already-revealed terrain centred on the player,
   upper right. Marks the portal once found, and points at it when it is off
   the minimap. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  DC.Render = DC.Render || {};

  DC.Render.minimap = function (ctx, game, cam) {
    const world = game.world, p = game.player;
    const L = DC.Layout;
    // A 300 px map is a quarter of a desktop and the whole width of a phone,
    // so the panel is sized from the viewport and the marks scale with it.
    const size = (L && L.minimapPx) || C.MINIMAP_PX;
    const margin = (L && L.pad) || 16;
    const u = Math.max(0.6, size / C.MINIMAP_PX);
    const x0 = cam.w - size - margin;
    const y0 = margin;
    const span = C.MINIMAP_M;
    const sc = size / span;

    ctx.save();
    ctx.fillStyle = 'rgba(4,6,10,0.82)';
    ctx.fillRect(x0, y0, size, size);
    // Clip before anything else. The tile window walks whole tiles, and a tile
    // that starts inside the 45 m span can end outside the panel -- clipped
    // only from the markers onward, the terrain used to bleed past the frame
    // and hang off the corner of the screen.
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();
    // The frame is a button now: hand the rectangle to the input layer so a
    // click or a thumb on the map opens it instead of swinging at it.
    DC.Render.minimapRect = { x: x0, y: y0, size: size };

    const T = C.TILE, G = C.GRID;
    const half = span / 2;
    const wx0 = p.x - half, wy0 = p.y - half;
    const tx0 = Math.max(0, Math.floor(wx0 / T));
    const tx1 = Math.min(G - 1, Math.ceil((wx0 + span) / T));
    const ty0 = Math.max(0, Math.floor(wy0 / T));
    const ty1 = Math.min(G - 1, Math.ceil((wy0 + span) / T));
    const pal = DC.Render.palette;

    // Runs of the same terrain merge into one rect. Drawn tile by tile the
    // minimap looks like graph paper; merged, it reads as a floor plan.
    for (let ty = ty0; ty <= ty1; ty++) {
      let tx = tx0;
      while (tx <= tx1) {
        const i = ty * G + tx;
        if (!world.discovered[i]) { tx++; continue; }
        const kind = world.grid[i];
        let run = 1;
        while (tx + run <= tx1) {
          const j = ty * G + tx + run;
          if (!world.discovered[j] || world.grid[j] !== kind) break;
          run++;
        }
        const sx = x0 + (tx * T - wx0) * sc;
        const sy = y0 + (ty * T - wy0) * sc;
        const w = run * T * sc + 0.6;
        // The plan is drawn in the region's own stone, so the corner of the
        // screen says which country you are in before the banner does.
        ctx.fillStyle = kind === 1 ? DC.Render.rgbaOf(pal.edge, 0.30) : 'rgba(20,26,36,0.95)';
        ctx.fillRect(sx, sy, w, T * sc + 0.6);
        if (kind === 1) {
          // faint mottling so a big room is not one flat slab
          for (let k = 0; k < run; k++) {
            const j = ty * G + tx + k;
            const h = DC.hash2(tx + k, ty, world.seed);
            if (h < 0.45) continue;
            ctx.fillStyle = DC.Render.rgbaOf(pal.glow, (0.04 + (h - 0.45) * 0.07).toFixed(3));
            ctx.fillRect(x0 + ((tx + k) * T - wx0) * sc, sy, T * sc + 0.6, T * sc + 0.6);
          }
        }
        tx += run;
      }
    }

    const toMini = function (x, y) {
      return { x: x0 + (x - wx0) * sc, y: y0 + (y - wy0) * sc };
    };

    // chests and demons only show if currently visible
    for (let i = 0; i < world.chests.length; i++) {
      const c = world.chests[i];
      if (!DC.Fog.visible(world, p, c.x, c.y, 0.5)) continue;
      const m = toMini(c.x, c.y);
      ctx.fillStyle = c.opened ? 'rgba(255,209,102,0.35)' : '#ffd166';
      const cs = 6 * u;
      ctx.fillRect(m.x - cs / 2, m.y - cs / 2, cs, cs);
    }
    for (let i = 0; i < world.demons.length; i++) {
      const d = world.demons[i];
      if (d.dead) continue;
      if (!DC.Fog.visible(world, p, d.x, d.y, 0.5)) continue;
      const m = toMini(d.x, d.y);
      ctx.fillStyle = d.hasSeen ? '#ff5c5c' : 'rgba(255,120,110,0.6)';
      ctx.beginPath(); ctx.arc(m.x, m.y, 2.6 * u, 0, Math.PI * 2); ctx.fill();
    }
    if (world.boss && !world.boss.dead) {
      const b = world.boss;
      const m = toMini(b.x, b.y);
      ctx.fillStyle = b.awake ? '#ff2f2f' : 'rgba(255,120,120,0.45)';
      const br = 6 * u;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - br); ctx.lineTo(m.x + br, m.y); ctx.lineTo(m.x, m.y + br); ctx.lineTo(m.x - br, m.y);
      ctx.closePath(); ctx.fill();
    }
    if (world.merchant) {
      const m = toMini(world.merchant.x, world.merchant.y);
      ctx.fillStyle = '#8ef0c0';
      ctx.beginPath(); ctx.arc(m.x, m.y, 3.2 * u, 0, Math.PI * 2); ctx.fill();
    }

    // portal marker
    const pt = world.portal;
    let arrow = null;
    if (pt && pt.discovered) {
      const m = toMini(pt.x, pt.y);
      const inside = m.x > x0 + 6 && m.x < x0 + size - 6 && m.y > y0 + 6 && m.y < y0 + size - 6;
      if (inside) {
        const pulse = 0.6 + 0.4 * Math.sin(game.time * 4);
        ctx.strokeStyle = pt.active ? 'rgba(142,240,192,' + pulse + ')' : 'rgba(142,240,192,0.35)';
        ctx.lineWidth = 2;
        const pr = 7 * u;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - pr); ctx.lineTo(m.x + pr, m.y); ctx.lineTo(m.x, m.y + pr); ctx.lineTo(m.x - pr, m.y);
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = pt.active ? 'rgba(142,240,192,0.5)' : 'rgba(142,240,192,0.2)';
        ctx.fill();
      } else {
        arrow = { x: m.x, y: m.y };
      }
    }
    ctx.restore();

    // off-minimap arrow, drawn just inside the frame
    if (arrow) {
      const cxm = x0 + size / 2, cym = y0 + size / 2;
      const dx = arrow.x - cxm, dy = arrow.y - cym;
      const a = Math.atan2(dy, dx);
      const inset = Math.round(14 * u);
      const hx = size / 2 - inset, hy = size / 2 - inset;
      const scale = Math.min(hx / Math.abs(Math.cos(a) || 1e-6), hy / Math.abs(Math.sin(a) || 1e-6));
      const px = cxm + Math.cos(a) * scale, py = cym + Math.sin(a) * scale;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(142,240,192,0.95)';
      const ar = 9 * u;
      ctx.beginPath();
      ctx.moveTo(ar, 0); ctx.lineTo(-ar * 0.67, -ar * 0.67); ctx.lineTo(-ar * 0.33, 0); ctx.lineTo(-ar * 0.67, ar * 0.67);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // player
    const pm = { x: x0 + size / 2, y: y0 + size / 2 };
    ctx.save();
    ctx.translate(pm.x, pm.y);
    ctx.rotate(p.aim);
    ctx.fillStyle = p.cls.color;
    ctx.beginPath();
    ctx.moveTo(6 * u, 0); ctx.lineTo(-4 * u, -4.5 * u); ctx.lineTo(-2 * u, 0); ctx.lineTo(-4 * u, 4.5 * u);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // frame + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    // Four corner ticks: the frame asks to be opened. A word would have to be
    // read; this is understood at a glance, in any language.
    const ck = Math.max(6, 11 * u), ca = 'rgba(255,255,255,0.5)';
    ctx.strokeStyle = ca; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x0 + 4, y0 + 4 + ck); ctx.lineTo(x0 + 4, y0 + 4); ctx.lineTo(x0 + 4 + ck, y0 + 4);
    ctx.moveTo(x0 + size - 4 - ck, y0 + 4); ctx.lineTo(x0 + size - 4, y0 + 4); ctx.lineTo(x0 + size - 4, y0 + 4 + ck);
    ctx.moveTo(x0 + size - 4, y0 + size - 4 - ck); ctx.lineTo(x0 + size - 4, y0 + size - 4); ctx.lineTo(x0 + size - 4 - ck, y0 + size - 4);
    ctx.moveTo(x0 + 4 + ck, y0 + size - 4); ctx.lineTo(x0 + 4, y0 + size - 4); ctx.lineTo(x0 + 4, y0 + size - 4 - ck);
    ctx.stroke();
    ctx.font = '600 ' + ((L && L.font(10, 9)) || 10) + 'px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(span + ' m', x0 + 6, y0 + size - 6);
    ctx.textAlign = 'right';
    ctx.fillText('MAP', x0 + size - 6, y0 + 12);
    ctx.textAlign = 'left';

    /* Pause sits on the map's own corner. On a phone it is the one control that
       is never under a thumb, and the map is already the thing you look at --
       so the corner of it is where stopping the run belongs. It is painted here
       rather than with the rest of the HUD because the map draws over the HUD,
       and a tab drawn first would be a tab under a map. */
    if (L && L.touch) {
      const tab = L.pauseButton(game);
      if (tab) {
        ctx.beginPath(); ctx.arc(tab.x, tab.y, tab.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(8,11,17,0.88)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(232,238,248,0.92)';
        const bw = Math.max(2, tab.r * 0.22), bh = tab.r * 0.86;
        ctx.fillRect(tab.x - bw * 1.6, tab.y - bh / 2, bw, bh);
        ctx.fillRect(tab.x + bw * 0.6, tab.y - bh / 2, bw, bh);
      }
    }
  };
  /* The whole floor, one tap away. Clicking the minimap opens this: the level
     at full scale, every tile the torch has already shown drawn clear of the
     fog, and nothing the torch has not shown invented -- demons, chests and
     urns still only appear while they are actually in the light, the same rule
     the minimap and the world obey. The run stops while it is up: a map read
     while something is chewing on you is not a map, it is an obituary. */
  DC.Render.fullMap = function (ctx, game, cam) {
    const world = game.world, p = game.player, L = DC.Layout;
    const T = C.TILE, G = C.GRID, pal = DC.Render.palette;
    const f = function (px, lo) { return ((L && L.font(px, lo)) || px) + 'px ui-monospace, Menlo, monospace'; };

    ctx.save();
    ctx.fillStyle = 'rgba(2,3,5,0.9)';
    ctx.fillRect(0, 0, cam.w, cam.h);

    const avail = Math.max(140, Math.min(cam.w - 2 * ((L && L.pad) || 16) - 16, cam.h - 118));
    const bx = Math.round((cam.w - avail) / 2);
    const by = Math.round(64 * (L && L.s ? L.s : 1));
    const sc = avail / C.WORLD_M;
    DC.Render.fullMapRect = { x: bx, y: by, size: avail, scale: sc };

    ctx.textAlign = 'center';
    const title = ((world.name || ('DEPTH ' + world.depth)) + '  \u00b7  DEPTH ' + world.depth).toUpperCase();
    // A long floor name has to fit a phone held in portrait, so the title
    // shrinks instead of running off the edge of the screen.
    let tf = Math.max(11, (L && L.font(21, 15)) || 21);
    ctx.font = '700 ' + tf + 'px ui-monospace, Menlo, monospace';
    while (tf > 10 && ctx.measureText(title).width > cam.w - 2 * ((L && L.pad) || 16)) {
      tf -= 1; ctx.font = '700 ' + tf + 'px ui-monospace, Menlo, monospace';
    }
    ctx.fillStyle = '#e8eef8';
    ctx.fillText(title, cam.w / 2, by - 22);

    // how much of this floor the torch has already taken back
    let seen = 0;
    for (let i = 0; i < world.open.length; i++) if (world.discovered[world.open[i]]) seen++;
    ctx.font = '400 ' + f(12, 10);
    ctx.fillStyle = 'rgba(210,220,235,0.62)';
    ctx.fillText((world.band ? world.band + '  \u00b7  ' : '') +
      Math.round(100 * seen / Math.max(1, world.open.length)) + '% of this floor explored',
      cam.w / 2, by - 6);

    // the unlit square, then the explored floor on top of it
    // The unexplored half of the board is the region's own dark, not a
    // generic black: the map you have not finished is the same country as the
    // map you have.
    ctx.fillStyle = DC.Render.rgbaOf(pal.night, 0.95);
    ctx.fillRect(bx, by, avail, avail);

    const toMap = function (x, y) { return { x: bx + x * sc, y: by + y * sc }; };

    for (let ty = 0; ty < G; ty++) {
      let tx = 0;
      while (tx < G) {
        const i = ty * G + tx;
        if (!world.discovered[i]) { tx++; continue; }
        const kind = world.grid[i];
        let run = 1;
        while (tx + run < G) {
          const j = ty * G + tx + run;
          if (!world.discovered[j] || world.grid[j] !== kind) break;
          run++;
        }
        ctx.fillStyle = kind === 1 ? DC.Render.rgbaOf(pal.edge, 0.62) : 'rgba(33,43,60,1)';
        ctx.fillRect(bx + tx * T * sc, by + ty * T * sc, run * T * sc + 0.5, T * sc + 0.5);
        tx += run;
      }
    }

    ctx.beginPath();
    ctx.rect(bx, by, avail, avail);
    ctx.clip();

    const dot = function (x, y, r, col) {
      const m = toMap(x, y);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.fill();
    };
    const diamond = function (x, y, r, stroke, fill) {
      const m = toMap(x, y);
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - r); ctx.lineTo(m.x + r, m.y); ctx.lineTo(m.x, m.y + r); ctx.lineTo(m.x - r, m.y);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
    };

    for (let i = 0; i < world.urns.length; i++) {
      const u = world.urns[i];
      if (u.broken) continue;
      if (!DC.Fog.visible(world, p, u.x, u.y, 0.4)) continue;
      dot(u.x, u.y, 1.6, 'rgba(190,190,205,0.75)');
    }
    for (let i = 0; i < world.chests.length; i++) {
      const c = world.chests[i];
      if (!DC.Fog.visible(world, p, c.x, c.y, 0.5)) continue;
      const m = toMap(c.x, c.y);
      ctx.fillStyle = c.opened ? 'rgba(255,209,102,0.35)' : '#ffd166';
      ctx.fillRect(m.x - 3, m.y - 3, 6, 6);
    }
    for (let i = 0; i < world.demons.length; i++) {
      const d = world.demons[i];
      if (d.dead) continue;
      if (!DC.Fog.visible(world, p, d.x, d.y, 0.5)) continue;
      dot(d.x, d.y, 2.6, d.hasSeen ? '#ff5c5c' : 'rgba(255,120,110,0.6)');
    }
    if (world.boss && !world.boss.dead) {
      const b = world.boss;
      diamond(b.x, b.y, 7, null, b.awake ? '#ff2f2f' : 'rgba(255,120,120,0.45)');
    }
    if (world.merchant) dot(world.merchant.x, world.merchant.y, 3.4, '#8ef0c0');

    const pt = world.portal;
    if (pt && pt.discovered) {
      const pulse = 0.6 + 0.4 * Math.sin(game.time * 4);
      diamond(pt.x, pt.y, 9, 'rgba(142,240,192,' + pulse + ')', pt.active ? 'rgba(142,240,192,0.4)' : 'rgba(142,240,192,0.18)');
    }

    // you, and the 45 m window the minimap is actually showing
    const pm = toMap(p.x, p.y);
    ctx.strokeStyle = 'rgba(142,240,192,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pm.x - C.MINIMAP_M * sc / 2, pm.y - C.MINIMAP_M * sc / 2, C.MINIMAP_M * sc, C.MINIMAP_M * sc);
    ctx.save();
    ctx.translate(pm.x, pm.y);
    ctx.rotate(p.aim);
    ctx.fillStyle = p.cls.color;
    ctx.beginPath();
    ctx.moveTo(8, 0); ctx.lineTo(-5.5, -6); ctx.lineTo(-2.5, 0); ctx.lineTo(-5.5, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();

    // frame, scale bar, how out
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, by + 0.5, avail - 1, avail - 1);
    const barM = 50, barPx = barM * sc;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(bx + 10, by + avail - 12); ctx.lineTo(bx + 10 + barPx, by + avail - 12);
    ctx.moveTo(bx + 10, by + avail - 16); ctx.lineTo(bx + 10, by + avail - 8);
    ctx.moveTo(bx + 10 + barPx, by + avail - 16); ctx.lineTo(bx + 10 + barPx, by + avail - 8);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = '400 ' + f(11, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(barM + ' m', bx + 16 + barPx, by + avail - 9);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(210,220,235,0.55)';
    ctx.fillText(DC.Layout && DC.Layout.touch ? 'tap anywhere, or the map again, to close' : 'click anywhere, or press N or ESC, to close',
      cam.w / 2, by + avail + 22);
    ctx.textAlign = 'left';
  };
})(typeof window !== 'undefined' ? window : globalThis);
