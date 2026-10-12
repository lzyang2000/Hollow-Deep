/* Math helpers, angle maths and a DDA line-of-sight test over the tile grid. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const TAU = Math.PI * 2;

  const M = {
    TAU,
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    smoothstep(e0, e1, x) {
      const t = M.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    dist2(x, y) { return x * x + y * y; },
    dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
    sign(v) { return v < 0 ? -1 : 1; },
    approach(cur, target, rate) {
      const d = target - cur;
      if (Math.abs(d) <= rate) return target;
      return cur + M.sign(d) * rate;
    },
    // shortest signed difference b - a wrapped to [-PI, PI]
    angleDiff(a, b) {
      let d = (b - a) % TAU;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      return d;
    },
    lerpAngle(a, b, t) { return a + M.angleDiff(a, b) * t; },
  };
  DC.M = M;

  DC.tileIndex = function (tx, ty) { return ty * DC.C.GRID + tx; };

  DC.isSolid = function (world, tx, ty) {
    const G = DC.C.GRID;
    if (tx < 0 || ty < 0 || tx >= G || ty >= G) return true;
    return world.grid[ty * G + tx] === 0;
  };

  DC.isSolidAt = function (world, x, y) {
    const T = DC.C.TILE;
    return DC.isSolid(world, Math.floor(x / T), Math.floor(y / T));
  };

  /* True when a body of radius r centred at (x, y) lies wholly in open tiles.
     A point test is not enough: tiles are 5 m across and the delver is 0.7 m
     wide, so a teleport can land a body inside a wall while its centre sits in
     an open tile. This uses the same square-vs-tile scan as moveBody, so a
     spot that fitsAt is never shoved by the collision solver afterwards. */
  DC.fitsAt = function (world, x, y, r) {
    const T = DC.C.TILE, rad = r || 0;
    const x0 = Math.floor((x - rad) / T), x1 = Math.floor((x + rad) / T);
    const y0 = Math.floor((y - rad) / T), y1 = Math.floor((y + rad) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (DC.isSolid(world, tx, ty)) return false;
    return true;
  };

  /* Amanatides & Woo voxel walk. Returns true if the segment crosses a solid
     tile before it reaches the end tile. */
  DC.lineBlocked = function (world, x0, y0, x1, y1) {
    const T = DC.C.TILE, G = DC.C.GRID;
    let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
    const ex = Math.floor(x1 / T), ey = Math.floor(y1 / T);
    if (tx === ex && ty === ey) return false;
    if (DC.isSolid(world, ex, ey)) return true;

    const dx = x1 - x0, dy = y1 - y0;
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(T / dx) : Infinity;
    const tDY = dy !== 0 ? Math.abs(T / dy) : Infinity;
    let tMX = dx > 0 ? ((tx + 1) * T - x0) / Math.abs(dx)
      : dx < 0 ? (x0 - tx * T) / Math.abs(dx) : Infinity;
    let tMY = dy > 0 ? ((ty + 1) * T - y0) / Math.abs(dy)
      : dy < 0 ? (y0 - ty * T) / Math.abs(dy) : Infinity;

    for (let guard = 0; guard < 4 * G; guard++) {
      if (tMX < tMY) { tx += stepX; tMX += tDX; }
      else { ty += stepY; tMY += tDY; }
      if (tx === ex && ty === ey) return false;
      if (DC.isSolid(world, tx, ty)) return true;
    }
    return true;
  };

  DC.hasLOS = function (world, ax, ay, bx, by) {
    return !DC.lineBlocked(world, ax, ay, bx, by);
  };

  /* Circle-vs-tilemap collision: move a body and slide along walls. */
  DC.moveBody = function (world, body, dx, dy) {
    const T = DC.C.TILE, r = body.r;
    const hitsX = (nx) => {
      const x0 = Math.floor((nx - r) / T), x1 = Math.floor((nx + r) / T);
      const y0 = Math.floor((body.y - r) / T), y1 = Math.floor((body.y + r) / T);
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
          if (DC.isSolid(world, tx, ty)) return true;
      return false;
    };
    const hitsY = (ny) => {
      const x0 = Math.floor((body.x - r) / T), x1 = Math.floor((body.x + r) / T);
      const y0 = Math.floor((ny - r) / T), y1 = Math.floor((ny + r) / T);
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
          if (DC.isSolid(world, tx, ty)) return true;
      return false;
    };
    let moved = false;
    if (dx !== 0 && !hitsX(body.x + dx)) { body.x += dx; moved = true; }
    if (dy !== 0 && !hitsY(body.y + dy)) { body.y += dy; moved = true; }
    // clamp to world
    const lim = DC.C.WORLD_M - r - 0.05;
    body.x = M.clamp(body.x, r + 0.05, lim);
    body.y = M.clamp(body.y, r + 0.05, lim);
    return moved;
  };
  DC.rgba = function (hex, a) {
    if (hex.charAt(0) !== '#') return hex;
    let h = hex.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

})(typeof window !== 'undefined' ? window : globalThis);
