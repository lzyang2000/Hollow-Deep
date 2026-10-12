/* Follow camera with clamping, zoom levels and screen shake. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Camera = {
    x: 0, y: 0, zoomIndex: 1, pxPerM: DC.C.ZOOM_LEVELS[1],
    shake: 0, shakeX: 0, shakeY: 0,
    viewW: 0, viewH: 0, w: 0, h: 0,

    setViewport: function (w, h) {
      this.w = w; this.h = h;
      // The layout is a property of the viewport, so it is recomputed here
      // rather than only in Game.resize -- anything that moves the frame gets
      // the same panels and the same zoom for free.
      if (DC.Layout) DC.Layout.recompute(w, h);
      this.pxPerM = this.levels()[this.zoomIndex];
      this.viewW = w / this.pxPerM;
      this.viewH = h / this.pxPerM;
    },

    /* Zoom levels are responsive: a phone cannot show 64 m of floor and keep
       the torch on screen, so the frame decides the scale. */
    levels: function () {
      return (DC.Layout && DC.Layout.zoomLevels) || DC.C.ZOOM_LEVELS;
    },

    zoomCycle: function () {
      const L = this.levels();
      this.zoomIndex = (this.zoomIndex + 1) % L.length;
      this.setViewport(this.w, this.h);
    },

    setZoom: function (pxPerM) {
      const L = this.levels();
      let best = 0, bd = Infinity;
      for (let i = 0; i < L.length; i++) {
        const d = Math.abs(L[i] - pxPerM);
        if (d < bd) { bd = d; best = i; }
      }
      this.zoomIndex = best;
      this.setViewport(this.w, this.h);
    },

    snap: function (t) {
      this.x = t.x; this.y = t.y;
      this.clampToBounds(t);
    },

    follow: function (t, dt) {
      const k = 1 - Math.pow(0.00006, dt);
      this.x = M.lerp(this.x, t.x, k);
      this.y = M.lerp(this.y, t.y, k);
      // A long jump (Blink, a knockback, a level change) should not let the
      // camera lag behind the actor: close any big gap outright.
      const hw = this.viewW / 2, hh = this.viewH / 2;
      if (Math.abs(t.x - this.x) > hw * 0.7) this.x = t.x;
      if (Math.abs(t.y - this.y) > hh * 0.7) this.y = t.y;
      this.clampToBounds(t);
    },

    clampToBounds: function (t) {
      const W = DC.C.WORLD_M;
      const hw = this.viewW / 2, hh = this.viewH / 2;
      if (W >= this.viewW) this.x = M.clamp(this.x, hw, W - hw);
      else this.x = W / 2;
      if (W >= this.viewH) this.y = M.clamp(this.y, hh, W - hh);
      else this.y = W / 2;
      // The world-edge clamp can pin the camera while the actor keeps walking.
      // Keep the actor inside the frame no matter what: the camera gives way.
      if (t) {
        const mx = hw * 0.82, my = hh * 0.82;
        if (t.x - this.x > mx) this.x = t.x - mx; else if (this.x - t.x > mx) this.x = t.x + mx;
        if (t.y - this.y > my) this.y = t.y - my; else if (this.y - t.y > my) this.y = t.y + my;
      }
    },

    addShake: function (amount) { this.shake = Math.min(2.2, this.shake + amount); },

    update: function (dt) {
      this.shake = Math.max(0, this.shake - dt * 3.2);
      const s = this.shake * this.shake * 2.4;
      this.shakeX = (Math.random() * 2 - 1) * s;
      this.shakeY = (Math.random() * 2 - 1) * s;
    },

    ox: function () { return this.w / 2 - this.x * this.pxPerM + this.shakeX; },
    oy: function () { return this.h / 2 - this.y * this.pxPerM + this.shakeY; },

    worldToScreenX: function (x) { return x * this.pxPerM + this.ox(); },
    worldToScreenY: function (y) { return y * this.pxPerM + this.oy(); },
    screenToWorldX: function (px) { return (px - this.ox()) / this.pxPerM; },
    screenToWorldY: function (py) { return (py - this.oy()) / this.pxPerM; },

    viewBounds: function () {
      return {
        x0: this.x - this.viewW / 2, y0: this.y - this.viewH / 2,
        x1: this.x + this.viewW / 2, y1: this.y + this.viewH / 2,
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
