/* WASD + mouse. Aim always tracks the cursor relative to the player; holding
   the left button "drags" the aim and keeps attacking. */
(function (global) {
  'use strict';
  const DC = global.DC;

  const MOVE_KEYS = {
    KeyW: [0, -1], ArrowUp: [0, -1],
    KeyS: [0, 1], ArrowDown: [0, 1],
    KeyA: [-1, 0], ArrowLeft: [-1, 0],
    KeyD: [1, 0], ArrowRight: [1, 0],
  };

  DC.Input = {
    keys: Object.create(null),
    moveX: 0, moveY: 0,
    aim: 0, firing: false, dragging: false,
    mx: 0, my: 0, hasMouse: false,
    // Touch writes a movement vector and an aim here; see core/touch.js.
    // aimHold means "the aim was set by something other than the cursor", so
    // the frame does not overwrite it with a stale mouse position.
    touchX: 0, touchY: 0, aimHold: false, tapFrames: 0,
    justPressed: Object.create(null),
    taps: Object.create(null), // consumed by UI

    init: function (canvas) {
      const self = this;
      const down = function (e) {
        const code = e.code;
        if (MOVE_KEYS[code]) e.preventDefault();
        if (!self.keys[code]) self.justPressed[code] = true;
        self.keys[code] = true;
        if (code === 'Space' || code === 'Tab') e.preventDefault();
      };
      const up = function (e) { self.keys[e.code] = false; };
      global.addEventListener('keydown', down);
      global.addEventListener('keyup', up);
      global.addEventListener('blur', function () {
        self.keys = Object.create(null);
        self.firing = false; self.dragging = false;
        self.touchX = 0; self.touchY = 0; self.aimHold = false; self.tapFrames = 0;
      });

      canvas.addEventListener('mousemove', function (e) {
        const r = canvas.getBoundingClientRect();
        self.mx = e.clientX - r.left;
        self.my = e.clientY - r.top;
        self.hasMouse = true;
      });
      canvas.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        self.firing = true; self.dragging = true;
        const r = canvas.getBoundingClientRect();
        self.mx = e.clientX - r.left;
        self.my = e.clientY - r.top;
        self.hasMouse = true;
      });
      global.addEventListener('mouseup', function (e) {
        if (e.button !== 0) return;
        self.firing = false; self.dragging = false;
      });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      canvas.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
    },

    /* Recompute the movement vector and refresh per-frame edge flags. */
    poll: function () {
      let x = 0, y = 0;
      for (const code in this.keys) {
        if (!this.keys[code]) continue;
        const v = MOVE_KEYS[code];
        if (v) { x += v[0]; y += v[1]; }
      }
      // A finger on the glass outranks a key on the keyboard: on a phone
      // there is no keyboard, and on a hybrid machine the last thing you
      // touched is the thing you mean.
      if (this.touchX || this.touchY) { x = this.touchX; y = this.touchY; }
      this.moveX = x; this.moveY = y;
    },

    /* Called once per rendered frame after the frame's consumers ran. */
    endFrame: function () {
      this.justPressed = Object.create(null);
      // A tap is a held attack that lets itself go after a few frames, so a
      // single flick of the thumb is one swing rather than a permanent one.
      if (this.tapFrames > 0) {
        this.tapFrames--;
        if (this.tapFrames === 0 && !this.dragging) this.firing = false;
      }
    },

    pressed: function (code) { return !!this.justPressed[code]; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
