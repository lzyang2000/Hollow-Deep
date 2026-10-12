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
      this.pxPerM = DC.C.ZOOM_LEVELS[this.zoomIndex];
      this.viewW = w / this.pxPerM;
      this.viewH = h / this.pxPerM;
    },

    zoomCycle: function () {
      const L = DC.C.ZOOM_LEVELS;
      this.zoomIndex = (this.zoomIndex + 1) % L.length;
      this.setViewport(this.w, this.h);
    },

    snap: function (t) {
      this.x = t.x; this.y = t.y;
      this.clampToBounds();
    },

    follow: function (t, dt) {
      const k = 1 - Math.pow(0.0001, dt);
      this.x = M.lerp(this.x, t.x, k);
      this.y = M.lerp(this.y, t.y, k);
      this.clampToBounds();
    },

    clampToBounds: function () {
      const W = DC.C.WORLD_M;
      const hw = this.viewW / 2, hh = this.viewH / 2;
      if (W >= this.viewW) this.x = M.clamp(this.x, hw, W - hw);
      else this.x = W / 2;
      if (W >= this.viewH) this.y = M.clamp(this.y, hh, W - hh);
      else this.y = W / 2;
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
