/* Tiles, decor, props and the light overlay. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  const PALETTES = [
    { floor: '#3d4757', floor2: '#353f4d', wall: '#0a0d13', wallTop: '#1b222d', edge: '#6f8199', glow: '#6ea8ff', rim: 'rgba(150,190,255,0.16)' },
    { floor: '#4a3e3a', floor2: '#403633', wall: '#0f0b0c', wallTop: '#271f1d', edge: '#8a7060', glow: '#ffb37a', rim: 'rgba(255,179,122,0.16)' },
    { floor: '#354550', floor2: '#2d3c47', wall: '#080e12', wallTop: '#1d2c36', edge: '#5d7c8f', glow: '#7fe0d0', rim: 'rgba(127,224,208,0.15)' },
    { floor: '#443b54', floor2: '#3a3149', wall: '#0e0a15', wallTop: '#251e35', edge: '#75658f', glow: '#c79bff', rim: 'rgba(199,155,255,0.16)' },
    { floor: '#4f443d', floor2: '#443a34', wall: '#110c0a', wallTop: '#2c231e', edge: '#8b7355', glow: '#ffd166', rim: 'rgba(255,209,102,0.17)' },
  ];

  DC.Render = DC.Render || {};
  DC.Render.palette = PALETTES[0];

  DC.Render.pickPalette = function (depth) {
    DC.Render.palette = PALETTES[Math.min(PALETTES.length - 1, Math.floor((depth - 1) / 7))];
  };

  DC.Render.world = function (ctx, world, cam) {
    const P = DC.Render.palette;
    const T = C.TILE, G = C.GRID;
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, cam.w, cam.h);

    const b = cam.viewBounds();
    const tx0 = M.clamp(Math.floor(b.x0 / T) - 1, 0, G - 1);
    const tx1 = M.clamp(Math.ceil(b.x1 / T) + 1, 0, G - 1);
    const ty0 = M.clamp(Math.floor(b.y0 / T) - 1, 0, G - 1);
    const ty1 = M.clamp(Math.ceil(b.y1 / T) + 1, 0, G - 1);
    const px = cam.pxPerM;
    const ox = cam.ox(), oy = cam.oy();
    const disc = world.discovered;
    const ts = T * px;
    const seam = Math.max(1, px * 0.06);

    // Floors first, with cheap contact shadow against walls.
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * G + tx;
        if (!disc[i]) continue;
        if (world.grid[i] !== 1) continue;
        const x = tx * T * px + ox, y = ty * T * px + oy;
        const h = DC.hash2(tx, ty, world.seed);
        ctx.fillStyle = h > 0.62 ? P.floor2 : P.floor;
        ctx.fillRect(x, y, ts + 1, ts + 1);
        // slab seams so corridors read as built floor, not flat paint
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x, y, seam, ts + 1);
        ctx.fillRect(x, y, ts + 1, seam);
        if (h > 0.86) {
          ctx.fillStyle = 'rgba(255,255,255,0.045)';
          ctx.fillRect(x + ts * 0.2, y + ts * 0.25, ts * 0.6, ts * 0.5);
        }
        if (h < 0.1) {
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(x + ts * 0.15, y + ts * 0.6, ts * 0.35, ts * 0.22);
        }
        // contact shadow strips
        const sw = Math.max(2, px * 1.1);
        if (DC.isSolid(world, tx, ty - 1)) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x, y, ts, sw); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y + sw, ts, sw); }
        if (DC.isSolid(world, tx, ty + 1)) { ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x, y + ts - sw, ts, sw); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, y + ts - sw * 2, ts, sw); }
        if (DC.isSolid(world, tx - 1, ty)) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(x, y, sw, ts); ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + sw, y, sw, ts); }
        if (DC.isSolid(world, tx + 1, ty)) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(x + ts - sw, y, sw, ts); ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(x + ts - sw * 2, y, sw, ts); }
      }
    }

    // Walls as beveled blocks.
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * G + tx;
        if (world.grid[i] !== 0) continue;
        const openN = !DC.isSolid(world, tx, ty - 1), openS = !DC.isSolid(world, tx, ty + 1);
        const openW = !DC.isSolid(world, tx - 1, ty), openE = !DC.isSolid(world, tx + 1, ty);
        if (!disc[i] && !openN && !openS && !openW && !openE) continue;
        const x = tx * T * px + ox, y = ty * T * px + oy;
        const h = DC.hash2(tx * 3 + 1, ty * 7 + 5, world.seed);
        ctx.fillStyle = P.wall;
        ctx.fillRect(x, y, ts + 1, ts + 1);
        // top face of the block
        ctx.fillStyle = P.wallTop;
        ctx.fillRect(x + ts * 0.05, y + ts * 0.05, ts * 0.9, ts * 0.56);
        // masonry seams on the top face
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        ctx.fillRect(x + ts * 0.05, y + ts * 0.05, ts * 0.9, seam);
        ctx.fillRect(x + ts * 0.05, y + ts * 0.33, ts * 0.9, seam);
        ctx.fillRect(x + ts * (0.05 + (0.18 + h * 0.5) * 0.9), y + ts * 0.05, seam, ts * 0.56);
        // lit upper edge, shaded lower edge
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(x, y, ts, Math.max(1, px * 0.12));
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y + ts - Math.max(2, px * 0.16), ts, Math.max(2, px * 0.16));
        ctx.fillRect(x + ts - Math.max(2, px * 0.16), y, Math.max(2, px * 0.16), ts);
        if (h > 0.72) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          const bx = x + ts * (0.15 + h * 0.4), by = y + ts * (0.1 + (h * 0.7));
          ctx.fillRect(bx, by, ts * 0.18, ts * 0.1);
        }
        if (h < 0.16) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + ts * 0.2, y + ts * 0.62, ts * 0.5, ts * 0.08);
        }
        // rim light where a wall face meets revealed floor
        if (disc[i]) {
          ctx.fillStyle = P.rim;
          if (openS) ctx.fillRect(x, y + ts - Math.max(2, px * 0.16), ts, Math.max(2, px * 0.16));
          if (openE) ctx.fillRect(x + ts - Math.max(2, px * 0.16), y, Math.max(2, px * 0.16), ts);
          if (openN) ctx.fillRect(x, y, ts, Math.max(1, px * 0.1));
        }
      }
    }

    // Decor.
    const vr = Math.max(cam.viewW, cam.viewH) / 2 + 4;
    const cx = cam.x, cy = cam.y;
    for (let i = 0; i < world.decor.length; i++) {
      const d = world.decor[i];
      if (Math.abs(d.x - cx) > vr || Math.abs(d.y - cy) > vr) continue;
      const tx = Math.floor(d.x / T), ty = Math.floor(d.y / T);
      if (!disc[ty * G + tx]) continue;
      DC.Render.decor(ctx, d, cam);
    }
  };

  DC.Render.decor = function (ctx, d, cam) {
    const x = cam.worldToScreenX(d.x), y = cam.worldToScreenY(d.y);
    const s = cam.pxPerM * d.scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.rot);
    const tint = 0.5 + d.tint * 0.5;
    switch (d.kind) {
      case 'rubble':
        ctx.fillStyle = 'rgba(70,78,92,' + (0.5 * tint) + ')';
        for (let i = 0; i < 4; i++) {
          const a = i * 1.7 + d.tint * 3;
          ctx.fillRect(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.4, s * 0.34, s * 0.22);
        }
        break;
      case 'bones':
        ctx.strokeStyle = 'rgba(210,205,180,0.35)';
        ctx.lineWidth = Math.max(1, s * 0.09);
        ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.5, s * 0.1); ctx.stroke();
        ctx.beginPath(); ctx.arc(-s * 0.5, 0, s * 0.12, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'crack':
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = Math.max(1, s * 0.07);
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, -s * 0.2);
        ctx.lineTo(-s * 0.1, s * 0.1);
        ctx.lineTo(s * 0.3, -s * 0.15);
        ctx.lineTo(s * 0.7, s * 0.2);
        ctx.stroke();
        break;
      case 'lantern':
        ctx.fillStyle = 'rgba(120,110,90,0.5)';
        ctx.fillRect(-s * 0.16, -s * 0.2, s * 0.32, s * 0.4);
        ctx.strokeStyle = 'rgba(160,150,120,0.4)';
        ctx.lineWidth = Math.max(1, s * 0.06);
        ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.lineTo(s * 0.4, -s * 0.5); ctx.stroke();
        break;
      case 'mushroom':
        ctx.fillStyle = 'rgba(120,190,170,0.28)';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.2, Math.PI, 0); ctx.fill();
        ctx.fillStyle = 'rgba(90,140,130,0.25)';
        ctx.fillRect(-s * 0.05, 0, s * 0.1, s * 0.2);
        break;
      case 'chain':
        ctx.strokeStyle = 'rgba(120,130,150,0.3)';
        ctx.lineWidth = Math.max(1, s * 0.07);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) ctx.arc(-s * 0.3 + i * s * 0.2, Math.sin(i) * s * 0.08, s * 0.09, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'stump':
        ctx.fillStyle = 'rgba(60,52,46,0.55)';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(30,26,24,0.6)';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.stroke();
        break;
      default: break;
    }
    ctx.restore();
  };

  /* Chests, portal, merchant. Drawn only when the player can actually see them. */
  DC.Render.props = function (ctx, world, cam, fog) {
    const p = world.actor;
    for (let i = 0; i < world.chests.length; i++) {
      const c = world.chests[i];
      if (!fog.visible(world, p, c.x, c.y, 0.5)) continue;
      DC.Render.chest(ctx, c, cam);
    }
    if (world.merchant && fog.visible(world, p, world.merchant.x, world.merchant.y, 1)) {
      DC.Render.merchant(ctx, world.merchant, cam);
    }
    const pt = world.portal;
    if (pt && pt.active && fog.visible(world, p, pt.x, pt.y, 1.5)) DC.Render.portal(ctx, pt, cam);
  };

  DC.Render.chest = function (ctx, c, cam) {
    const x = cam.worldToScreenX(c.x), y = cam.worldToScreenY(c.y);
    const s = cam.pxPerM;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.85, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    const lid = c.opened ? -0.55 : 0;
    ctx.fillStyle = c.opened ? '#5a4326' : '#6b4e2c';
    ctx.fillRect(-s * 0.8, -s * 0.5, s * 1.6, s * 0.9);
    ctx.fillStyle = '#7d5b33';
    ctx.fillRect(-s * 0.8, -s * 0.5 + lid * s, s * 1.6, s * 0.34);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(-s * 0.12, -s * 0.28, s * 0.24, s * 0.4);
    ctx.strokeStyle = 'rgba(255,209,102,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-s * 0.8, -s * 0.5, s * 1.6, s * 0.9);
    if (!c.opened) {
      const pulse = 0.5 + 0.5 * Math.sin(c.anim * 2.4);
      ctx.fillStyle = 'rgba(255,209,102,' + (0.10 + pulse * 0.12) + ')';
      ctx.beginPath(); ctx.arc(0, -s * 0.1, s * (1.1 + pulse * 0.25), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  DC.Render.merchant = function (ctx, m, cam) {
    const x = cam.worldToScreenX(m.x), y = cam.worldToScreenY(m.y);
    const s = cam.pxPerM;
    const bob = Math.sin(m.bob * 2) * s * 0.06;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.7, s * 0.8, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // lantern glow
    const g = ctx.createRadialGradient(0, -s * 0.2, s * 0.2, 0, -s * 0.2, s * 2.6);
    g.addColorStop(0, 'rgba(255,209,102,0.28)');
    g.addColorStop(1, 'rgba(255,209,102,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 2.6, 0, Math.PI * 2); ctx.fill();
    // robe
    ctx.fillStyle = '#3b3450';
    ctx.beginPath();
    ctx.moveTo(-s * 0.62, s * 0.7 + bob);
    ctx.lineTo(-s * 0.3, -s * 0.9 + bob);
    ctx.lineTo(s * 0.3, -s * 0.9 + bob);
    ctx.lineTo(s * 0.62, s * 0.7 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#241f33';
    ctx.beginPath(); ctx.arc(0, -s * 0.95 + bob, s * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(s * 0.72, -s * 0.35 + bob, s * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  DC.Render.portal = function (ctx, pt, cam) {
    const x = cam.worldToScreenX(pt.x), y = cam.worldToScreenY(pt.y);
    const s = cam.pxPerM;
    const t = pt.anim;
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 3.4);
    g.addColorStop(0, 'rgba(142,240,192,0.55)');
    g.addColorStop(0.5, 'rgba(80,190,220,0.22)');
    g.addColorStop(1, 'rgba(80,190,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s * 3.4, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = 'rgba(142,240,192,' + (0.5 - i * 0.12) + ')';
      ctx.lineWidth = 2 + i;
      ctx.beginPath();
      const rr = s * (0.9 + i * 0.42) * (1 + 0.06 * Math.sin(t * 2 + i));
      ctx.ellipse(0, 0, rr, rr * (0.62 + 0.12 * Math.sin(t * 1.4 + i)), t * (0.6 + i * 0.3), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,255,235,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.5 * (1 + 0.1 * Math.sin(t * 5)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  /* The light overlay goes on top of the world and the actors. */
  DC.Render.light = function (ctx, cam) {
    DC.Fog.draw(ctx, cam);
  };

  /* Warm torch tint, drawn after the darkness so the light reads warm. */
  DC.Render.torch = function (ctx, cam, p) {
    const x = cam.worldToScreenX(p.x), y = cam.worldToScreenY(p.y);
    const r = DC.Fog.reveal * cam.pxPerM;
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(255,196,120,0.16)');
    g.addColorStop(0.55, 'rgba(255,170,100,0.06)');
    g.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };
})(typeof window !== 'undefined' ? window : globalThis);
