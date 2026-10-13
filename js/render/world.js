/* Tiles, decor, props and the light overlay. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  /* Palette plumbing. A theme (see js/data/lore.js) holds a region's base
     stone plus three tonal variants; a palette is what one specific floor ends
     up wearing, so the renderer never has to know anything about regions. */
  function hexRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbaOf(hex, a) {
    const c = hexRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function rgbToHsl(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function hslHex(h, s, l) {
    const f = function (v) { return Math.max(0, Math.min(255, Math.round(v))); };
    const c = hslToRgb(h, s, l).map(f);
    return '#' + c.map((v) => (v < 16 ? '0' : '') + v.toString(16)).join('');
  }
  function hexHsl(hex) { return rgbToHsl(hexRgb(hex)); }

  /* Lightness without hue drift: scale the channels, never mix towards white or
     black, or every variant of a region turns into the same grey soup. */
  function shade(hex, k) {
    const c = hexRgb(hex);
    const f = function (v) { return Math.max(0, Math.min(255, Math.round(v * k))); };
    return '#' + [f(c[0]), f(c[1]), f(c[2])]
      .map((v) => (v < 16 ? '0' : '') + v.toString(16)).join('');
  }

  /* The straight line where a wall meets the floor is the single biggest
     tell that a level is a tilemap. Break it: every edge gets a rock lip of
     its own depth plus a boulder poking out at a hash-chosen offset, and the
     contact shadow follows the lip instead of the tile border. */
  function rockEdge(world, ctx, x, y, ts, tx, ty, P, px) {
    const sh = Math.max(2, px * 0.9);
    const t = Math.max(1, px * 0.14);          // thickness of the lit rock face
    /* orient 'h' = the wall runs above or below this tile; atEnd picks which
       side. Everything is drawn inside the FLOOR tile so the wall pass cannot
       cover it, and it pokes inward by a hash-chosen amount. */
    const side = function (hx, hy, orient, atEnd) {
      const h = DC.hash2(hx, hy, world.seed + 31);
      const lip = ts * (0.06 + h * 0.16);
      const bh = DC.hash2(hx * 13 + 7, hy * 17 + 3, world.seed + 57);
      if (orient === 'h') {
        // the rock face line, and how far the rock reaches into the floor
        const faceY = atEnd ? y + ts - lip : y;
        ctx.fillStyle = P.wall;
        ctx.fillRect(x, faceY, ts, lip);
        ctx.fillStyle = P.wallTop;
        ctx.fillRect(x, atEnd ? faceY : faceY + lip - t, ts, t);
        // one boulder, deeper and narrower than the lip
        const bw = ts * (0.16 + bh * 0.22);
        const bx = x + (ts - bw) * bh;
        const deep = lip * 1.7;
        const by = atEnd ? faceY - (deep - lip) : faceY;
        ctx.fillStyle = P.wall;
        ctx.fillRect(bx, by, bw, deep);
        ctx.fillStyle = P.wallTop;
        ctx.fillRect(bx, atEnd ? by : by + deep - t, bw, t);
        // contact shadow hugging the lip
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.fillRect(x, atEnd ? faceY - sh : faceY + lip, ts, sh);
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fillRect(x, atEnd ? faceY - sh * 2 : faceY + lip + sh, ts, sh);
      } else {
        const faceX = atEnd ? x + ts - lip : x;
        ctx.fillStyle = P.wall;
        ctx.fillRect(faceX, y, lip, ts);
        ctx.fillStyle = P.wallTop;
        ctx.fillRect(atEnd ? faceX : faceX + lip - t, y, t, ts);
        const bh2 = ts * (0.16 + bh * 0.22);
        const by2 = y + (ts - bh2) * bh;
        const deep = lip * 1.7;
        const bx2 = atEnd ? faceX - (deep - lip) : faceX;
        ctx.fillStyle = P.wall;
        ctx.fillRect(bx2, by2, deep, bh2);
        ctx.fillStyle = P.wallTop;
        ctx.fillRect(atEnd ? bx2 : bx2 + deep - t, by2, t, bh2);
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.fillRect(atEnd ? faceX - sh : faceX + lip, y, sh, ts);
        ctx.fillStyle = 'rgba(0,0,0,0.14)';
        ctx.fillRect(atEnd ? faceX - sh * 2 : faceX + lip + sh, y, sh, ts);
      }
    };
    if (DC.isSolid(world, tx, ty - 1)) side(tx * 2 + 1, ty * 3 + 2, 'h', false);
    if (DC.isSolid(world, tx, ty + 1)) side(tx * 5 + 3, ty * 7 + 4, 'h', true);
    if (DC.isSolid(world, tx - 1, ty)) side(tx * 11 + 5, ty * 13 + 6, 'v', false);
    if (DC.isSolid(world, tx + 1, ty)) side(tx * 17 + 7, ty * 19 + 8, 'v', true);
  }

  DC.Render = DC.Render || {};
  DC.Render.rgbaOf = rgbaOf;
  DC.Render.palette = null;
  DC.Render.theme = null;
  DC.Render.fogDark = [3, 4, 9];

  /* A region is a country, not a wallpaper, and a country has weathers. The
     three tonal variants a region carries used to be three brightness levels
     of the same picture, which is why ten floors of Bone Tidal read as one
     long corridor. Now a tone rotates the region's own hue and thickens or
     thins its pigment as well as brightening it: the region stays itself --
     the hue never leaves its corner of the wheel -- but the floor you walk
     down into next is unmistakably somewhere else. */
  DC.Render.VARIANT_TONES = [
    { dh: 0, ms: 1.00 },
    { dh: 24, ms: 1.16 },
    { dh: -20, ms: 0.74 },
  ];

  /* On top of the tone, every floor gets a small shift of its own out of the
     floor's own seed, so two floors wearing the same tone are still not the
     same picture. It is deliberately tiny: the nine regions are separated by
     real distances and a big per-floor wander would blur them back together.
     A save file rebuilds exactly the shade it was wearing because the seed is
     in the save. */
  function floorShift(world) {
    const k = ((world.depth || 1) - 1) % 10;
    /* A straight walk across the region rather than a permutation: the tone
       already changes every floor, so what this has to keep apart are the
       floors three down from each other -- the ones wearing the same tone. */
    const slot = k / 9;
    const rng = new DC.RNG((((world.seed || 0) >>> 0) ^ 0x9e3779b9) >>> 0);
    return {
      dh: -15 + 30 * slot + rng.range(-2, 2),
      ms: 0.85 + 0.30 * slot + rng.range(-0.02, 0.02),
      /* Lightness is mostly the tone's job -- a per-floor wander there tends to
         cancel the tone out. But the tone repeats every three floors, so the
         tone GROUP gets a slow lightness drift of its own: the fourth floor of
         a region is never the twelfth floor's mirror. */
      ml: 0.94 + 0.12 * (Math.floor(k / 3) / 3),
    };
  }
  DC.Render = DC.Render || {};
  DC.Render.floorShift = floorShift;

  /* The deepest regions are meant to be the darkest, but a floor you cannot
     see is not atmosphere, it is a bug. Nothing the player walks on ever goes
     below this. */
  function floorLight(hex) {
    const h = hexHsl(hex);
    return h[2] < 13 ? hslHex(h[0], h[1], 13) : hex;
  }

  /* Nudge a colour along the region's own hue rather than repainting it. */
  function nudge(hex, sh, keepLight) {
    const h = hexHsl(hex);
    return hslHex(h[0] + sh.dh, h[1] * sh.ms, keepLight ? h[2] : h[2] * sh.ml);
  }

  DC.Render.pickPalette = function (world) {
    const th = (world && world.theme) || DC.THEMES[0];
    const v = th.variants[((world && world.variant) || 0) % th.variants.length];
    const vi = ((world && world.variant) || 0) % th.variants.length;
    const tone = DC.Render.VARIANT_TONES[vi % DC.Render.VARIANT_TONES.length];
    const raw = world ? DC.Render.floorShift(world) : { dh: 0, ms: 1, ml: 1 };
    /* A region's hue is the one thing that must survive: the tone and the
       floor's own shift can pull it around, but never far enough to put it in
       a neighbour's country. */
    const dh = Math.max(-24, Math.min(24, tone.dh + raw.dh));
    const sh = { dh: dh, ms: tone.ms * raw.ms, ml: raw.ml };
    const fogHsl = rgbToHsl(th.fog);
    DC.Render.theme = th;
    DC.Render.fogDark = hslToRgb(fogHsl[0] + raw.dh, Math.min(60, fogHsl[1] * 1.3), fogHsl[2]).map(Math.round);
    /* The lamps of a region are the same lamps however deep you are, so the
       lights only take the floor's small shift and never the tone's. */
    const glow = nudge(v.glow, raw, true);
    const flame = nudge(v.flame, raw, true);
    /* The torch tint used to be a hardcoded warm orange, which is a polite way
       of saying it painted over every region until all nine read as one beige.
       It now burns in the colour this floor's torches actually burn. */
    const flameHsl = hexHsl(flame);
    DC.Render.palette = {
      floor: floorLight(nudge(shade(th.base.floor, v.d), sh)),
      floor2: floorLight(nudge(shade(th.base.floor2, v.d), sh)),
      wall: nudge(th.base.wall, sh),
      wallTop: nudge(shade(th.base.wallTop, v.d), sh),
      edge: nudge(shade(th.base.edge, v.d), sh),
      glow: glow,
      flame: flame,
      rim: rgbaOf(glow, 0.16),
      torch: hslHex(flameHsl[0], Math.min(70, flameHsl[1] * 0.72), Math.max(62, flameHsl[2])),
      night: nudge(th.night, raw, true),
    };
    return DC.Render.palette;
  };
  DC.Render.pickPalette(null);

  DC.Render.world = function (ctx, world, cam) {
    const P = DC.Render.palette;
    const T = C.TILE, G = C.GRID;
    ctx.fillStyle = P.night || '#04060a';
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

    // Floors. Tone varies in 2x2 patches so the shading never lines up with
    // the slab seams, and the seams themselves sit on a staggered coarse
    // lattice -- built flagstones, not graph paper.
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * G + tx;
        if (!disc[i]) continue;
        if (world.grid[i] !== 1) continue;
        const x = tx * T * px + ox, y = ty * T * px + oy;
        const h = DC.hash2(tx, ty, world.seed);
        const hp = DC.hash2(tx >> 1, ty >> 1, world.seed + 991);
        ctx.fillStyle = hp > 0.58 ? P.floor2 : P.floor;
        ctx.fillRect(x, y, ts + 1, ts + 1);
        if (((tx + (ty & 1)) & 1) === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x, y, seam, ts + 1);
        }
        if (((ty + (tx & 1)) & 1) === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(x, y, ts + 1, seam);
        }
        if (h > 0.86) {
          ctx.fillStyle = 'rgba(255,255,255,0.045)';
          ctx.fillRect(x + ts * 0.2, y + ts * 0.25, ts * 0.6, ts * 0.5);
        }
        if (h < 0.1) {
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(x + ts * 0.15, y + ts * 0.6, ts * 0.35, ts * 0.22);
        }
        rockEdge(world, ctx, x, y, ts, tx, ty, P, px);
      }
    }

    // Walls are one rock mass, not a row of identical boxes: no per-tile
    // bevel. A wall tile only ever shows its dark body plus mottling, and the
    // only lines across it are occasional mortar on a coarse 2-tile lattice.
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
        // mottled rock body
        if (h > 0.45) {
          ctx.fillStyle = P.wallTop;
          ctx.globalAlpha = 0.30 + h * 0.25;
          const bw = ts * (0.3 + h * 0.4), bh = ts * (0.28 + ((h * 3) % 1) * 0.4);
          ctx.fillRect(x + ts * 0.08 + ((h * 5) % 1) * (ts - bw - ts * 0.16),
            y + ts * 0.08 + ((h * 7) % 1) * (ts - bh - ts * 0.16), bw, bh);
          ctx.globalAlpha = 1;
        }
        // mortar only on a coarse lattice, and only sometimes
        if (((tx & 1) === 0) && h > 0.62) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x, y + ts * (0.3 + h * 0.4), ts, seam);
        }
        if (((ty & 1) === 0) && h < 0.2) {
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(x + ts * (0.25 + h * 0.5), y, seam, ts);
        }
        // rim light where a wall face meets revealed floor
        if (disc[i]) {
          ctx.fillStyle = P.rim;
          if (openS) ctx.fillRect(x, y + ts - Math.max(2, px * 0.16), ts, Math.max(2, px * 0.16));
          if (openE) ctx.fillRect(x + ts - Math.max(2, px * 0.16), y, Math.max(2, px * 0.16), ts);
          if (openN) ctx.fillRect(x, y, ts, Math.max(1, px * 0.1));
          if (openW) ctx.fillRect(x, y, Math.max(2, px * 0.16), ts);
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
      let seen = disc[ty * G + tx];
      // A wall torch lives on a wall tile, which the fog never discovers on
      // its own -- it counts as seen as soon as the floor in front of it is.
      if (!seen && d.wall) {
        for (let k = 0; k < 4; k++) {
          const nx = tx + DC.Maze.DIRS[k][0], ny = ty + DC.Maze.DIRS[k][1];
          if (nx >= 0 && ny >= 0 && nx < G && ny < G && disc[ny * G + nx]) { seen = true; break; }
        }
      }
      if (!seen) continue;
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
      case 'skull':
        ctx.fillStyle = 'rgba(216,214,196,0.5)';
        ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-s * 0.1, s * 0.12, s * 0.2, s * 0.08);
        ctx.fillStyle = 'rgba(20,18,16,0.7)';
        ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.03, s * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.06, -s * 0.03, s * 0.045, 0, Math.PI * 2); ctx.fill();
        break;
      case 'web':
        ctx.strokeStyle = 'rgba(200,210,225,0.16)';
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 1.2 - 0.3;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4); ctx.stroke();
        }
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath(); ctx.arc(0, 0, s * 0.12 * i, -0.3, Math.PI * 0.9); ctx.stroke();
        }
        break;
      case 'brazier':
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.22, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(52,44,40,0.85)';
        ctx.fillRect(-s * 0.05, -s * 0.1, s * 0.1, s * 0.3);
        ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.2, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,150,60,0.5)';
        ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.11, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,140,0.45)';
        ctx.beginPath(); ctx.ellipse(0, -s * 0.24, s * 0.05, s * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'debris':
        ctx.fillStyle = 'rgba(40,44,52,0.5)';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + d.tint;
          const rr = s * (0.12 + ((i * 37) % 11) / 40);
          ctx.fillRect(Math.cos(a) * s * 0.28, Math.sin(a) * s * 0.24, rr, rr * 0.6);
        }
        break;
      case 'ashpile':
        // A collapsed hearth, or a delver's last breath of dust.
        ctx.fillStyle = 'rgba(198,192,180,' + (0.09 + 0.09 * tint) + ')';
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.44, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,116,110,0.16)';
        ctx.beginPath(); ctx.ellipse(-s * 0.12, -s * 0.05, s * 0.19, s * 0.11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(232,228,218,0.10)';
        for (let i = 0; i < 3; i++) {
          const aa = i * 2.1 + d.tint * 4;
          ctx.fillRect(Math.cos(aa) * s * 0.3, Math.sin(aa) * s * 0.2, Math.max(1, s * 0.05), Math.max(1, s * 0.05));
        }
        break;
      case 'puddle': {
        // Standing water is the one floor prop that answers to the room: it
        // catches the region's own light, so a weeping gate glitters teal.
        const PL = DC.Render.palette;
        ctx.fillStyle = 'rgba(8,12,20,0.40)';
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.46, s * 0.26, d.tint * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgbaOf(PL.glow, 0.10 + 0.10 * tint);
        ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.beginPath(); ctx.ellipse(-s * 0.05, -s * 0.02, s * 0.3, s * 0.15, d.tint * 0.8, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'banner': {
        // A hanging thing that fell. The cloth keeps its sigil colour long
        // after the pole has been firewood for somebody else's fire.
        const PL = DC.Render.palette;
        ctx.fillStyle = rgbaOf(PL.glow, 0.10 + 0.10 * tint);
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.36); ctx.lineTo(s * 0.26, -s * 0.3);
        ctx.lineTo(s * 0.2, s * 0.18); ctx.lineTo(0, s * 0.36);
        ctx.lineTo(-s * 0.26, s * 0.14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.32)';
        ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.stroke();
        ctx.strokeStyle = rgbaOf(PL.edge, 0.30);
        ctx.beginPath(); ctx.moveTo(-s * 0.1, -s * 0.2); ctx.lineTo(s * 0.06, s * 0.06); ctx.stroke();
        break;
      }
      case 'rune': {
        // Scratched into the slab, still faintly lit. Somebody meant this to
        // keep working, and down here it mostly does.
        const PL = DC.Render.palette;
        ctx.strokeStyle = rgbaOf(PL.glow, 0.16 + 0.16 * tint);
        ctx.lineWidth = Math.max(1, s * 0.055);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0.25, 5.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-s * 0.22, s * 0.1); ctx.lineTo(s * 0.22, -s * 0.12); ctx.stroke();
        break;
      }
      case 'crystal': {
        // The seal grew out of the floor rather than being put there.
        const PL = DC.Render.palette;
        ctx.fillStyle = rgbaOf(PL.glow, 0.13 + 0.07 * tint);
        ctx.strokeStyle = rgbaOf(PL.glow, 0.30);
        ctx.lineWidth = Math.max(1, s * 0.035);
        for (let i = 0; i < 3; i++) {
          const a = -0.5 + i * 0.55 + d.tint;
          const hgt = s * (0.28 + ((i * 17) % 7) / 22);
          const bx = Math.cos(a) * s * 0.2;
          ctx.beginPath();
          ctx.moveTo(bx - s * 0.05, s * 0.12);
          ctx.lineTo(bx + s * 0.05, s * 0.12);
          ctx.lineTo(bx + Math.sin(a) * s * 0.06, s * 0.12 - hgt);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case 'ribcage':
        // Something big died here. Ribs curve the same way at any depth.
        ctx.strokeStyle = 'rgba(222,216,196,0.30)';
        ctx.lineWidth = Math.max(1, s * 0.05);
        ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(s * 0.42, s * 0.06); ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const rx = -s * 0.36 + i * s * 0.22;
          ctx.beginPath(); ctx.arc(rx, 0, s * 0.16, -1.15, 1.15); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(216,214,196,0.40)';
        ctx.beginPath(); ctx.arc(-s * 0.56, -s * 0.02, s * 0.1, 0, Math.PI * 2); ctx.fill();
        break;
      case 'sconce': {
        // Wall-mounted torch: bracket, flame and a warm wash down the wall.
        const px = cam.pxPerM;
        ctx.restore();
        ctx.save();
        const wx = cam.worldToScreenX(d.x), wy = cam.worldToScreenY(d.y);
        const nx = DC.Maze.DIRS[d.dir][0], ny = DC.Maze.DIRS[d.dir][1];
        const fx = wx + nx * px * 0.42, fy = wy + ny * px * 0.42;
        const FL = DC.Render.palette.flame || '#ff9e42';
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, px * 2.6);
        g.addColorStop(0, rgbaOf(FL, 0.20));
        g.addColorStop(1, rgbaOf(FL, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(fx, fy, px * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(46,38,32,0.9)';
        ctx.fillRect(wx - px * 0.08, wy - px * 0.08, px * 0.16, px * 0.34);
        const fl = 0.8 + 0.2 * Math.sin(d.tint * 30 + performance.now() * 0.004);
        ctx.fillStyle = rgbaOf(FL, 0.75);
        ctx.beginPath(); ctx.ellipse(fx, fy - px * 0.1, px * 0.11, px * 0.2 * fl, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,232,170,0.8)';
        ctx.beginPath(); ctx.ellipse(fx, fy - px * 0.14, px * 0.05, px * 0.1 * fl, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default: break;
    }
    ctx.restore();
  };

  /* Chests, urns, portal, merchant. Drawn only when the player can see them. */
  DC.Render.props = function (ctx, world, cam, fog) {
    const p = world.actor;
    for (let i = 0; i < world.chests.length; i++) {
      const c = world.chests[i];
      if (!fog.visible(world, p, c.x, c.y, 0.5)) continue;
      DC.Render.chest(ctx, c, cam);
    }
    for (let i = 0; i < world.urns.length; i++) {
      const u = world.urns[i];
      if (u.broken) continue;
      if (!fog.visible(world, p, u.x, u.y, 0.4)) continue;
      DC.Render.urn(ctx, u, cam);
    }
    if (world.merchant && fog.visible(world, p, world.merchant.x, world.merchant.y, 1)) {
      DC.Render.merchant(ctx, world.merchant, cam);
    }
    const pt = world.portal;
    if (pt && pt.active && fog.visible(world, p, pt.x, pt.y, 1.5)) DC.Render.portal(ctx, pt, cam);
  };

  DC.Render.urn = function (ctx, u, cam) {
    const x = cam.worldToScreenX(u.x), y = cam.worldToScreenY(u.y);
    const s = cam.pxPerM;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.42, s * 0.5, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    const body = u.variant === 0 ? '#8c6242' : (u.variant === 1 ? '#5f6b74' : '#7a5a52');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, s * 0.34);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.1, -s * 0.16, -s * 0.34);
    ctx.lineTo(s * 0.16, -s * 0.34);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.1, s * 0.34, s * 0.34);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(-s * 0.3, -s * 0.12, s * 0.12, s * 0.3);
    ctx.strokeStyle = 'rgba(20,16,14,0.5)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(-s * 0.28, s * 0.02); ctx.lineTo(s * 0.28, s * 0.02); ctx.stroke();
    ctx.restore();
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

  /* The torch tint, drawn after the darkness so the light reads like a flame
     and not a screen. It burns in whatever colour this floor's torches burn,
     which is one of the things that makes a region feel like somewhere. */
  DC.Render.torch = function (ctx, cam, p) {
    const x = cam.worldToScreenX(p.x), y = cam.worldToScreenY(p.y);
    const r = DC.Fog.reveal * cam.pxPerM;
    const T = (DC.Render.palette && DC.Render.palette.torch) || '#ffc478';
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, rgbaOf(T, 0.16));
    g.addColorStop(0.55, rgbaOf(T, 0.06));
    g.addColorStop(1, rgbaOf(T, 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };
})(typeof window !== 'undefined' ? window : globalThis);
