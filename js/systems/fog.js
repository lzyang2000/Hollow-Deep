/* Information fog: a per-sample light map with line of sight, plus a tile-level
   memory of what you have already revealed (used by the minimap). */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  DC.Fog = {
    canvas: null, ctx: null, img: null, nx: 0, ny: 0,
    time: 0, reveal: C.REVEAL, revealMax: C.REVEAL,
    visCache: null,

    init: function (doc) {
      this.canvas = doc.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    },

    ensure: function (nx, ny) {
      if (this.nx === nx && this.ny === ny) return;
      this.nx = nx; this.ny = ny;
      this.canvas.width = nx; this.canvas.height = ny;
      this.img = this.ctx.createImageData(nx, ny);
    },

    /* Mark tiles the player can currently see. Cheap: only tiles on screen. */
    discover: function (world, p) {
      const G = C.GRID, T = C.TILE;
      const b = DC.Camera.viewBounds();
      const tx0 = M.clamp(Math.floor(b.x0 / T), 0, G - 1);
      const tx1 = M.clamp(Math.ceil(b.x1 / T), 0, G - 1);
      const ty0 = M.clamp(Math.floor(b.y0 / T), 0, G - 1);
      const ty1 = M.clamp(Math.ceil(b.y1 / T), 0, G - 1);
      const R = this.reveal;
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const i = ty * G + tx;
          if (world.discovered[i]) continue;
          const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
          const d = Math.hypot(cx - p.x, cy - p.y);
          if (d > R + T) continue;
          if (d < 2.5 || !DC.lineBlocked(world, p.x, p.y, cx, cy)) {
            world.discovered[i] = 1;
            // Wall faces that border a seen floor tile become known too, so the
            // corridor keeps its masonry instead of dissolving into the void.
            if (world.grid[i] === 1) {
              if (tx > 0) world.discovered[i - 1] = 1;
              if (tx < G - 1) world.discovered[i + 1] = 1;
              if (ty > 0) world.discovered[i - G] = 1;
              if (ty < G - 1) world.discovered[i + G] = 1;
            }
          }
        }
      }
      // The tile you are standing in is always known.
      const px = Math.floor(p.x / T), py = Math.floor(p.y / T);
      if (px >= 0 && py >= 0 && px < G && py < G) world.discovered[py * G + px] = 1;

      const pt = world.portal;
      const sealed = world.isBoss && world.boss && !world.boss.dead;
      if (pt && !pt.discovered && !sealed) {
        const dd = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (dd <= R && !DC.lineBlocked(world, p.x, p.y, pt.x, pt.y)) {
          pt.discovered = true;
          if (pt.active) { DC.Audio.play('portalReveal'); DC.UI && DC.UI.toast('Portal found \u2014 ' + DC.Game.portalBearing(), '#8ef0c0'); }
          else DC.UI && DC.UI.toast('The portal is forming\u2026', '#8ef0c0');
        }
      }
    },

    update: function (world, p, cam, dt) {
      cam = cam || DC.Camera;
      this.time += dt;
      /* The torch breathes: two sines at unrelated rates so it never settles
         into a metronome. That is atmosphere on the light overlay, where it is
         worth about 6% of alpha at the edge of the ring.

         It must NOT be worth anything to the visibility test. A chest parked 14
         metres out used to sit inside the ring and then outside it twice a
         second, so the furniture blinked in and out with the pulse -- which
         reads as a bug in the game, not a flicker in the flame. So the cull
         uses the widest the ring ever gets, and the breathing stays exactly
         where it was always meant to be: in the light. */
      const PULSE_A = 0.028, PULSE_B = 0.018;
      this.reveal = C.REVEAL * (1 + PULSE_A * Math.sin(this.time * 6.1) + PULSE_B * Math.sin(this.time * 13.7 + 1.2));
      this.revealMax = C.REVEAL * (1 + PULSE_A + PULSE_B);

      const step = C.LIGHT_STEP;
      const nx = Math.ceil(cam.viewW / step) + 2;
      const ny = Math.ceil(cam.viewH / step) + 2;
      this.ensure(nx, ny);

      const x0 = cam.x - cam.viewW / 2 - step;
      const y0 = cam.y - cam.viewH / 2 - step;
      const data = this.img.data;
      const n = nx * ny;
      let al = this._al;
      if (!al || al.length !== n) { al = this._al = new Uint8Array(n); this._tmp = new Uint8Array(n); }
      const tmp = this._tmp;
      const G = C.GRID, T = C.TILE, R = this.reveal;
      const disc = world.discovered;
      let idx = 0;
      for (let j = 0; j < ny; j++) {
        const wy = y0 + (j + 0.5) * step;
        const ty = Math.floor(wy / T);
        for (let i = 0; i < nx; i++) {
          const wx = x0 + (i + 0.5) * step;
          const tx = Math.floor(wx / T);
          let light = 0;
          if (tx >= 0 && ty >= 0 && tx < G && ty < G && disc[ty * G + tx]) light = C.MEMORY_LIGHT;
          const dx = wx - p.x, dy = wy - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2);
            const f = 1 - M.smoothstep(C.REVEAL_NEAR, R, d);
            if (f > 0.015 && !DC.lineBlocked(world, p.x, p.y, wx, wy)) {
              light = Math.max(light, 0.07 + 0.93 * Math.pow(f, 0.78));
            }
          }
          al[idx++] = (1 - M.clamp(light, 0, 1)) * 255;
        }
      }
      // Soften the torch edge: a separable [1 2 1] pass each way turns the
      // sample grid back into a gradient instead of a grid of squares.
      for (let j = 0; j < ny; j++) {
        const row = j * nx;
        for (let i = 0; i < nx; i++) {
          const a = al[row + (i > 0 ? i - 1 : 0)];
          const c = al[row + (i < nx - 1 ? i + 1 : nx - 1)];
          tmp[row + i] = (a + 2 * al[row + i] + c) * 0.25;
        }
      }
      for (let j = 0; j < ny; j++) {
        const jm = (j > 0 ? j - 1 : 0) * nx, jc = j * nx, jp = (j < ny - 1 ? j + 1 : ny - 1) * nx;
        for (let i = 0; i < nx; i++) al[jc + i] = (tmp[jm + i] + 2 * tmp[jc + i] + tmp[jp + i]) * 0.25;
      }
      for (let q = 0, k = 0; q < n; q++, k += 4) {
        // The dark is not black -- it is this region's own dark, so a violet
        // floor stays violet at the edge of the torch instead of going grey.
        const dk = DC.Render.fogDark;
        data[k] = dk[0]; data[k + 1] = dk[1]; data[k + 2] = dk[2]; data[k + 3] = al[q];
      }
      this.ctx.putImageData(this.img, 0, 0);
    },

    /* Is an actor currently visible to the player? */
    visible: function (world, p, x, y, pad) {
      const T = C.TILE, G = C.GRID;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || ty < 0 || tx >= G || ty >= G) return false;
      if (!world.discovered[ty * G + tx]) return false;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > this.revealMax + (pad || 0)) return false;
      return !DC.lineBlocked(world, p.x, p.y, x, y);
    },

    draw: function (ctx, cam) {
      const step = C.LIGHT_STEP;
      const x0 = cam.x - cam.viewW / 2 - step;
      const y0 = cam.y - cam.viewH / 2 - step;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.canvas,
        0, 0, this.nx, this.ny,
        (x0 - cam.x) * cam.pxPerM + cam.w / 2 + cam.shakeX,
        (y0 - cam.y) * cam.pxPerM + cam.h / 2 + cam.shakeY,
        this.nx * step * cam.pxPerM, this.ny * step * cam.pxPerM);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
