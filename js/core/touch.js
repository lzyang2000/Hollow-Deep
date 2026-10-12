/* One-handed touch control.
   There is no second thumb to hold a mouse with, so the drag does three jobs at
   once: it walks, it aims, and it keeps attacking -- which is what "drag"
   already means on the desktop. Everything else is a button big enough for a
   fingertip, parked in the corner under the thumb that is already there.
   A tap (short, barely moved) is the interact gesture: merchant, portal, or one
   swing if there is nothing to talk to. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const DEAD = 14;      // px before a touch counts as a drag rather than a tap
  const TAP_TIME = 0.4; // seconds

  DC.Touch = {
    id: null, ox: 0, oy: 0, cx: 0, cy: 0,
    t0: 0, moved: 0, drag: false, active: false,

    init: function (canvas, game) {
      const self = this;
      const pos = function (e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      if (global.PointerEvent) {
        canvas.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          e.preventDefault();
          const p = pos(e);
          self.down(p.x, p.y, game, e.pointerId);
        });
        canvas.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'mouse') return;
          const p = pos(e);
          self.move(p.x, p.y, e.pointerId);
        });
        canvas.addEventListener('pointerup', function (e) {
          if (e.pointerType === 'mouse') return;
          const p = pos(e);
          self.up(p.x, p.y, e.pointerId, game);
        });
        canvas.addEventListener('pointercancel', function () { self.release(); });
        global.addEventListener('blur', function () { self.release(); });
      } else {
        // Older iOS: the touch events do the same job.
        const first = function (e) {
          const t = e.changedTouches[0];
          const r = canvas.getBoundingClientRect();
          return { x: t.clientX - r.left, y: t.clientY - r.top };
        };
        canvas.addEventListener('touchstart', function (e) {
          const p = first(e); self.down(p.x, p.y, game, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchmove', function (e) {
          e.preventDefault();
          const p = first(e); self.move(p.x, p.y, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchend', function (e) {
          const p = first(e); self.up(p.x, p.y, 'touch', game);
        });
        canvas.addEventListener('touchcancel', function () { self.release(); });
      }
    },

    down: function (mx, my, game, id) {
      const L = DC.Layout;
      if (this.id !== null) return false;         // one finger at a time
      this.id = id === undefined ? 1 : id;
      this.ox = mx; this.oy = my; this.cx = mx; this.cy = my;
      this.t0 = game.time; this.moved = 0; this.active = true;
      this.drag = false;

      if (game.state !== 'playing') {
        // Menus handle their own taps through the synthesised click.
        this.id = null; this.active = false;
        return false;
      }

      const b = L.hitButton(game, mx, my);
      if (b) { this.act(b, game); this.id = null; this.active = false; return true; }

      this.drag = true;
      return true;
    },

    move: function (mx, my, id) {
      if (this.id === null || (id !== undefined && id !== this.id)) return;
      this.cx = mx; this.cy = my;
      const dx = mx - this.ox, dy = my - this.oy;
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      if (!this.drag) return;
      const input = DC.Input;
      if (this.moved < DEAD) { input.touchX = 0; input.touchY = 0; return; }
      const len = Math.hypot(dx, dy) || 1;
      input.touchX = dx / len;
      input.touchY = dy / len;
      // Aim follows the finger, not the cursor: on a phone the finger is the
      // reticle, and it stays where you left it even when you stop walking.
      input.aim = Math.atan2(dy, dx);
      input.aimHold = true;
      input.firing = true;
    },

    up: function (mx, my, id, game) {
      if (this.id === null || (id !== undefined && id !== this.id)) return;
      const wasDrag = this.drag;
      const dur = game.time - this.t0;
      const far = this.moved >= DEAD;
      this.id = null; this.active = false; this.drag = false;
      this.release();

      if (wasDrag && !far && dur < TAP_TIME && game.state === 'playing') {
        if (game.interactTarget) { game.tryInteract(); return; }
        // A tap in the open is one attack, so you never have to hold to swing.
        // endFrame() counts the frames down and releases firing for us.
        DC.Input.tapFrames = 4;
        DC.Input.firing = true;
      }
    },

    release: function () {
      const input = DC.Input;
      input.touchX = 0; input.touchY = 0; input.aimHold = false;
      if (!input.dragging) input.firing = false;
    },

    act: function (b, game) {
      const p = game.player;
      if (b.id === 'ability') DC.Player.ability(game.world, p, game);
      else if (b.id === 'heal') DC.Player.drink(game.world, p, 'heal', game);
      else if (b.id === 'mana') DC.Player.drink(game.world, p, 'mana', game);
      else if (b.id === 'pack') game.openPack();
      else if (b.id === 'pause') game.setState('pause');
      else if (b.id === 'interact') game.tryInteract();
      DC.Audio.play('uiSelect');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
