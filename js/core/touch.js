/* Touch control, one hand or two.
   The field finger does two jobs at once: the drag is a joystick that walks, and
   the fingertip is a reticle that aims. It deliberately does NOT swing -- a
   swing is a decision, made by holding ATTACK or by a tap -- otherwise every
   shuffle to the merchant becomes a brawl.

   Two fingers are tracked apart, which is what makes the game playable with two
   thumbs: the ATTACK hold-button belongs to its own finger, so the other thumb
   can keep walking and aiming while it swings, and lifting it stops the swing
   without stopping the walk. A second finger on the field is ignored, so a
   stray thumb cannot steal the aim mid-stride.
   One hand still works: the ATTACK pad in the left corner and the ATTACK circle
   in the right cluster are the same hold-button, and a tap in the open is one
   swing at the point tapped.
   A tap (short, barely moved) is the interact gesture: merchant, portal, or one
   swing at whatever is under the finger. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const DEAD = 14;      // px before a touch counts as a drag rather than a tap
  const TAP_TIME = 0.4; // seconds

  /* A clock that agrees with the one input.js reads, so the compatibility mouse
     event iOS fires just after a tap can be recognised as the same finger. */
  const nowMs = function () {
    return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
  };

  DC.Touch = {
    // the field finger: joystick + reticle
    id: null, ox: 0, oy: 0, cx: 0, cy: 0,
    t0: 0, moved: 0, drag: false, active: false,
    // the button finger: ATTACK, held
    attack: false, attackId: null, pollAtDown: 0,
    lastTouch: 0,

    init: function (canvas, game) {
      const self = this;
      const stamp = function () { self.lastTouch = nowMs(); };
      const pos = function (e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      if (global.PointerEvent) {
        canvas.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          e.preventDefault();
          stamp();
          const p = pos(e);
          self.down(p.x, p.y, game, e.pointerId);
        });
        canvas.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'mouse') return;
          stamp();
          const p = pos(e);
          self.move(p.x, p.y, e.pointerId);
        });
        canvas.addEventListener('pointerup', function (e) {
          if (e.pointerType === 'mouse') return;
          stamp();
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
          stamp();
          const p = first(e); self.down(p.x, p.y, game, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchmove', function (e) {
          e.preventDefault();
          stamp();
          const p = first(e); self.move(p.x, p.y, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchend', function (e) {
          stamp();
          const p = first(e); self.up(p.x, p.y, 'touch', game);
        });
        canvas.addEventListener('touchcancel', function () { self.release(); });
      }
    },

    down: function (mx, my, game, id) {
      const L = DC.Layout;
      this.lastTouch = nowMs();
      if (game.state !== 'playing') {
        // Menus handle their own taps through the synthesised click.
        return false;
      }

      const b = L.hitButton(game, mx, my);
      if (b) {
        // ATTACK is the one hold-button, and it has a finger to itself: press
        // it while the other thumb is mid-stride and both keep working.
        if (b.id === 'attack') {
          if (this.attackId !== null) return false;      // one button thumb at a time
          this.attackId = id === undefined ? 1 : id;
          this.attack = true;
          this.pollAtDown = DC.Input.polls;
          DC.Input.firing = true;
          DC.Input.tapFrames = 0;
          return true;
        }
        this.act(b, game);
        return true;
      }

      // The field finger is the joystick and the reticle. Only one at a time: a
      // second finger on the glass must not steal the aim mid-stride.
      if (this.id !== null) return false;
      this.id = id === undefined ? 1 : id;
      this.ox = mx; this.oy = my; this.cx = mx; this.cy = my;
      this.t0 = game.time; this.moved = 0; this.active = true;
      this.drag = true;
      // The finger is the reticle the moment it lands, so even a tap aims at the
      // thing you tapped rather than at wherever you happened to be facing.
      this.aimAt(mx, my);
      return true;
    },

    /* The angle from the body to a point on the glass, or null when there is
       nothing to point at. On a phone the fingertip is the cursor, so "aim with
       your hand" has to mean this line -- not the drag delta, which is what
       walks. The crosshair you see and the blow you get are then the same. */
    aimAngle: function (mx, my) {
      const game = DC.Game;
      const p = game && game.player;
      if (!p || game.state !== 'playing') return null;
      const cam = DC.Camera;
      const dx = mx - cam.worldToScreenX(p.x);
      const dy = my - cam.worldToScreenY(p.y);
      if (Math.hypot(dx, dy) < 8) return null;   // finger on the body: keep the last aim
      return Math.atan2(dy, dx);
    },

    /* A finger resting on the field owns the aim until it lifts, even if it is
       parked on the body itself, so a stale cursor can never take over. */
    aimAt: function (mx, my) {
      const a = this.aimAngle(mx, my);
      if (a !== null) DC.Input.aim = a;
      DC.Input.aimHold = true;
    },

    move: function (mx, my, id) {
      this.lastTouch = nowMs();
      const pid = id === undefined ? this.id : id;
      if (this.id === null && this.attackId === null) return;
      // A thumb parked on ATTACK that slides a little is still just attacking:
      // it neither walks nor re-aims, and it does not move the reticle either.
      if (pid === this.attackId) return;
      if (pid !== this.id) return;
      this.cx = mx; this.cy = my;
      if (!this.drag) return;
      const input = DC.Input;
      const dx = mx - this.ox, dy = my - this.oy;
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      // The drag is a joystick: it walks from where the finger landed. It does
      // not swing. Attacking is the ATTACK button or a tap, so walking past a
      // demon no longer spends every bolt you own on the way to the door.
      if (this.moved < DEAD) { input.touchX = 0; input.touchY = 0; }
      else {
        const len = Math.hypot(dx, dy) || 1;
        input.touchX = dx / len;
        input.touchY = dy / len;
      }
      // ...and the fingertip is the reticle, absolutely: the aim is the line
      // from the body to the finger, so the crosshair on the glass is exactly
      // where the blow or the bolt goes even while the stick pulls elsewhere.
      this.aimAt(mx, my);
    },

    up: function (mx, my, id, game) {
      this.lastTouch = nowMs();
      const pid = id === undefined ? (this.id !== null ? this.id : this.attackId) : id;
      if (this.attackId !== null && pid === this.attackId) { this.endAttack(); return; }
      // A button finger lifting has nothing to undo; the walk belongs to the
      // field finger and the swing to the button finger, never to both.
      if (this.id === null || pid !== this.id) return;

      const wasDrag = this.drag;
      const dur = game.time - this.t0;
      const far = this.moved >= DEAD;
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      input.touchX = 0; input.touchY = 0; input.aimHold = false;
      // The walk ends with this finger. If the other thumb is still holding
      // ATTACK, its swing carries on.

      if (wasDrag && !far && dur < TAP_TIME && game.state === 'playing') {
        if (game.interactTarget) { game.tryInteract(); return; }
        // A tap in the open is one attack at the point you tapped, so you never
        // have to hold to swing. endFrame() counts the frames down and lets go.
        // The aim is set without aimHold: the finger is already off the glass,
        // and a hybrid machine with a real mouse should get its cursor back.
        const a = this.aimAngle(mx, my);
        if (a !== null) DC.Input.aim = a;
        DC.Input.tapFrames = 4;
        DC.Input.firing = true;
      }
    },

    /* The ATTACK finger lifting. The walk, if the other thumb owns one, is
       left alone. */
    endAttack: function () {
      const wasAttack = this.attack;
      this.attack = false;
      this.attackId = null;
      if (!wasAttack) return;
      // A press that never reached a simulation step could not have swung, so
      // hand it one swing rather than swallowing the tap.
      if (DC.Input.polls === this.pollAtDown) { DC.Input.tapFrames = 4; DC.Input.firing = true; return; }
      if (!DC.Input.dragging) DC.Input.firing = false;
    },

    /* Everything down: a cancel, a blur, or a screen change. */
    release: function () {
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      this.attack = false; this.attackId = null;
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
