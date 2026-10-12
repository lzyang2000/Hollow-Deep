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
    const size = C.MINIMAP_PX;
    const margin = 16;
    const x0 = cam.w - size - margin;
    const y0 = margin;
    const span = C.MINIMAP_M;
    const sc = size / span;

    ctx.save();
    ctx.fillStyle = 'rgba(4,6,10,0.82)';
    ctx.fillRect(x0, y0, size, size);

    const T = C.TILE, G = C.GRID;
    const half = span / 2;
    const wx0 = p.x - half, wy0 = p.y - half;
    const tx0 = Math.max(0, Math.floor(wx0 / T));
    const tx1 = Math.min(G - 1, Math.ceil((wx0 + span) / T));
    const ty0 = Math.max(0, Math.floor(wy0 / T));
    const ty1 = Math.min(G - 1, Math.ceil((wy0 + span) / T));
    const pal = DC.Render.palette;

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * G + tx;
        if (!world.discovered[i]) continue;
        const sx = x0 + (tx * T - wx0) * sc;
        const sy = y0 + (ty * T - wy0) * sc;
        const w = T * sc + 0.6;
        if (world.grid[i] === 1) {
          ctx.fillStyle = world.dist && world.dist[i] >= 0 ? 'rgba(120,140,175,0.30)' : 'rgba(120,140,175,0.22)';
          ctx.fillRect(sx, sy, w, w);
        } else {
          ctx.fillStyle = 'rgba(20,26,36,0.95)';
          ctx.fillRect(sx, sy, w, w);
        }
      }
    }

    // clip marker drawing to the panel
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();

    const toMini = function (x, y) {
      return { x: x0 + (x - wx0) * sc, y: y0 + (y - wy0) * sc };
    };

    // chests and demons only show if currently visible
    for (let i = 0; i < world.chests.length; i++) {
      const c = world.chests[i];
      if (!DC.Fog.visible(world, p, c.x, c.y, 0.5)) continue;
      const m = toMini(c.x, c.y);
      ctx.fillStyle = c.opened ? 'rgba(255,209,102,0.35)' : '#ffd166';
      ctx.fillRect(m.x - 3, m.y - 3, 6, 6);
    }
    for (let i = 0; i < world.demons.length; i++) {
      const d = world.demons[i];
      if (d.dead) continue;
      if (!DC.Fog.visible(world, p, d.x, d.y, 0.5)) continue;
      const m = toMini(d.x, d.y);
      ctx.fillStyle = d.hasSeen ? '#ff5c5c' : 'rgba(255,120,110,0.6)';
      ctx.beginPath(); ctx.arc(m.x, m.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (world.boss && !world.boss.dead) {
      const b = world.boss;
      const m = toMini(b.x, b.y);
      ctx.fillStyle = b.awake ? '#ff2f2f' : 'rgba(255,120,120,0.45)';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 6); ctx.lineTo(m.x + 6, m.y); ctx.lineTo(m.x, m.y + 6); ctx.lineTo(m.x - 6, m.y);
      ctx.closePath(); ctx.fill();
    }
    if (world.merchant) {
      const m = toMini(world.merchant.x, world.merchant.y);
      ctx.fillStyle = '#8ef0c0';
      ctx.beginPath(); ctx.arc(m.x, m.y, 3.2, 0, Math.PI * 2); ctx.fill();
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
        ctx.beginPath();
        ctx.moveTo(m.x, m.y - 7); ctx.lineTo(m.x + 7, m.y); ctx.lineTo(m.x, m.y + 7); ctx.lineTo(m.x - 7, m.y);
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
      const inset = 14;
      const hx = size / 2 - inset, hy = size / 2 - inset;
      const scale = Math.min(hx / Math.abs(Math.cos(a) || 1e-6), hy / Math.abs(Math.sin(a) || 1e-6));
      const px = cxm + Math.cos(a) * scale, py = cym + Math.sin(a) * scale;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.fillStyle = 'rgba(142,240,192,0.95)';
      ctx.beginPath();
      ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6);
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
    ctx.moveTo(6, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // frame + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, size - 1, size - 1);
    ctx.font = '600 10px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(span + ' m', x0 + 6, y0 + size - 6);
    ctx.textAlign = 'right';
    ctx.fillText('MAP', x0 + size - 6, y0 + 12);
    ctx.textAlign = 'left';
  };
})(typeof window !== 'undefined' ? window : globalThis);
