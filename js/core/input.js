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
    justPressed: Object.create(null),
    taps: Object.create(null), // consumed by UI

    init: function (canvas) {
      const self = this;
      const down = function (e) {
        const code = e.code;
        if (MOVE_KEYS[code]) e.preventDefault();
        if (!self.keys[code]) self.justPressed[code] = true;
        self.keys[code] = true;
        if (code === 'Space') e.preventDefault();
      };
      const up = function (e) { self.keys[e.code] = false; };
      global.addEventListener('keydown', down);
      global.addEventListener('keyup', up);
      global.addEventListener('blur', function () {
        self.keys = Object.create(null);
        self.firing = false; self.dragging = false;
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
      this.moveX = x; this.moveY = y;
    },

    /* Called once per rendered frame after the frame's consumers ran. */
    endFrame: function () { this.justPressed = Object.create(null); },

    pressed: function (code) { return !!this.justPressed[code]; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
